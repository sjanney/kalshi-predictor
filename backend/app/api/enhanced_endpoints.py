"""
Enhanced API endpoints using the improved prediction engine.
NOTE: These endpoints are currently available but NOT used by the frontend (v2.0/v3.0).
The frontend currently uses the standard endpoints in `endpoints.py` which have been updated to use the enhanced engine internally.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Optional
from app.services.kalshi import KalshiClient
from app.services.nba import NBAClient
from app.services.nfl import NFLClient
from app.services.enhanced_prediction import EnhancedPredictionEngine
from app.services.enhanced_signals import EnhancedSignalEngine
from app.services.accuracy_tracker import AccuracyTracker
from app.api.endpoints import match_game_to_markets
import re
import os
from datetime import datetime, timedelta

router = APIRouter()

kalshi_client = KalshiClient()
nba_client = NBAClient()
nfl_client = NFLClient()
prediction_engine = EnhancedPredictionEngine()
signal_engine = EnhancedSignalEngine()
accuracy_tracker = AccuracyTracker()

from concurrent.futures import ThreadPoolExecutor
import asyncio

# Create a thread pool for parallel processing
# 50 workers allows processing many games simultaneously
executor = ThreadPoolExecutor(max_workers=50)

def _process_single_game(game: Dict, league: str, markets: List[Dict], all_games: List[Dict]) -> Optional[Dict]:
    """Process a single game prediction (synchronous for thread pool)."""
    try:
        home_stats = {}
        away_stats = {}
        
        matched_markets = match_game_to_markets(game, markets)
        
        # Use enhanced prediction engine with all games for form/H2H
        # This is CPU bound, so good for thread pool
        prediction_data = prediction_engine.generate_prediction(
            {**game, "league": league},
            home_stats,
            away_stats,
            matched_markets,
            all_games=all_games  # Pass all games for form and H2H analysis
        )
        
        # Record prediction for accuracy tracking
        accuracy_tracker.record_prediction(
            prediction_data,
            game.get('game_id'),
            league
        )
        
        return prediction_data
        
    except Exception as e:
        print(f"Error processing game {game.get('game_id')}: {e}")
        return None

async def _fetch_past_games(league: str, days: int = 7) -> List[Dict]:
    """Fetch games from the past 'days' to provide context (rest, form)."""
    loop = asyncio.get_running_loop()
    today = datetime.now()
    tasks = []
    
    for i in range(1, days + 1):
        date = (today - timedelta(days=i)).strftime("%Y%m%d")
        if league == "nba":
            tasks.append(loop.run_in_executor(executor, nba_client.get_scoreboard, date))
        elif league == "nfl":
            tasks.append(loop.run_in_executor(executor, nfl_client.get_scoreboard, date))
            
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    all_past_games = []
    for res in results:
        if isinstance(res, list):
            all_past_games.extend(res)
            
    return all_past_games

async def _get_league_predictions_enhanced(league: str) -> List[Dict]:
    """Get predictions using enhanced engine with true multithreading."""
    loop = asyncio.get_running_loop()
    
    # 1. Fetch Target Games (Today/Upcoming)
    print(f"Fetching {league.upper()} games...")
    try:
        if league == "nba":
            games = await loop.run_in_executor(executor, nba_client.get_scoreboard)
        elif league == "nfl":
            games = await loop.run_in_executor(executor, nfl_client.get_scoreboard)
        else:
            games = []
    except Exception as e:
        print(f"Error in get_scoreboard: {e}")
        games = []

    if not games:
        return []
        
    # 1.5 Fetch Past Games for Context
    print(f"Fetching past {league.upper()} games for context...")
    past_games = await _fetch_past_games(league, days=10) # 10 days to be safe for rest calc
    all_games = games + past_games
    
    # 2. Fetch Kalshi Markets
    print(f"Fetching Kalshi {league.upper()} markets...")
    try:
        # Run I/O bound fetch in thread pool
        markets = await loop.run_in_executor(executor, kalshi_client.get_league_markets, league)
        
        if not markets:
            markets = await loop.run_in_executor(executor, kalshi_client.generate_synthetic_markets_for_games, games)
    except Exception as e:
        print(f"Error fetching markets: {e}")
        markets = []
    
    # 3. Generate Predictions with True Parallelism
    print(f"Generating predictions for {len(games)} games using {executor._max_workers} threads...")
    
    # Create futures for all games to run in the thread pool
    futures = [
        loop.run_in_executor(
            executor, 
            _process_single_game, 
            game, 
            league, 
            markets, 
            all_games # Pass combined history
        )
        for game in games
    ]
    
    # Wait for all threads to complete
    results = await asyncio.gather(*futures)
    
    # Filter out None results (failed predictions)
    results = [r for r in results if r is not None]
    
    print(f"Successfully generated {len(results)} predictions")
    return results

@router.get("/enhanced/games", response_model=List[Dict])
async def get_enhanced_games(
    sort_by: str = Query("time", enum=["time", "divergence", "confidence"]),
    league: str = Query("nba", enum=["nba", "nfl"]),
    filter_status: Optional[str] = None
):
    """
    Get games with enhanced predictions (Elo, form, ML, etc.)
    """
    results = await _get_league_predictions_enhanced(league)
    
    # Filtering
    if filter_status:
        results = [r for r in results if filter_status.lower() in r.get('status', '').lower()]

    # Sorting
    if sort_by == "divergence":
        results.sort(key=lambda x: x['prediction']['divergence'], reverse=True)
    elif sort_by == "confidence":
        conf_map = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
        results.sort(key=lambda x: conf_map.get(x['prediction']['confidence_score'], 0), reverse=True)
    
    return results

@router.get("/enhanced/games/{game_id}")
async def get_enhanced_game_details(game_id: str):
    """Get enhanced prediction details for a specific game."""
    # Try NBA first
    nba_games = await _get_league_predictions_enhanced("nba")
    for game in nba_games:
        if str(game['game_id']) == str(game_id):
            return game
    
    # Try NFL
    nfl_games = await _get_league_predictions_enhanced("nfl")
    for game in nfl_games:
        if str(game['game_id']) == str(game_id):
            return game
    
    raise HTTPException(status_code=404, detail="Game not found")

@router.get("/accuracy/metrics")
async def get_accuracy_metrics(days_back: int = Query(30, ge=1, le=365)):
    """
    Get prediction accuracy metrics.
    """
    metrics = accuracy_tracker.calculate_accuracy_metrics(days_back=days_back)
    return metrics

@router.get("/accuracy/game/{game_id}")
async def get_game_accuracy(game_id: str):
    """Get accuracy data for a specific game prediction."""
    performance = accuracy_tracker.get_prediction_performance(game_id)
    if not performance:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return performance

@router.post("/accuracy/outcome")
async def record_game_outcome(
    game_id: str,
    home_won: bool,
    home_score: int,
    away_score: int
):
    """Record game outcome for accuracy tracking."""
    accuracy_tracker.record_outcome(game_id, home_won, home_score, away_score)
    return {"status": "recorded", "game_id": game_id}

@router.post("/backtest")
async def run_backtest(
    start_date: str,
    end_date: str,
    min_divergence: float = 0.10,
    min_confidence: str = "MEDIUM"
):
    """
    Backtest a simple strategy:
    - Bet on games with divergence > min_divergence
    - Only bet on markets with confidence >= min_confidence
    """
    from datetime import datetime
    
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    
    conf_map = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
    min_conf_val = conf_map.get(min_confidence, 1)
    
    def strategy(record):
        pred = record.get("prediction", {})
        divergence = abs(pred.get("stat_model_prob", 0.5) - pred.get("kalshi_prob", 0.5))
        confidence = pred.get("confidence_score", "LOW")
        conf_val = conf_map.get(confidence, 1)
        
        if divergence >= min_divergence and conf_val >= min_conf_val:
            # Bet $100 on the model's side
            model_prob = pred.get("stat_model_prob", 0.5)
            market_prob = pred.get("kalshi_prob", 0.5)
            
            if model_prob > market_prob:
                return {
                    "side": "YES",
                    "price": market_prob,
                    "size": 100
                }
            else:
                return {
                    "side": "NO",
                    "price": 1.0 - market_prob,
                    "size": 100
                }
        
        return None
    
    result = accuracy_tracker.backtest_strategy(strategy, start, end)
    return result


# Initialize calibration and monitor services (will be done in startup.py)
model_calibration = None
game_monitor = None

def init_services(calibration_service, monitor_service):
    """Initialize calibration and monitor services."""
    global model_calibration, game_monitor
    model_calibration = calibration_service
    game_monitor = monitor_service


@router.post("/results/auto-record")
async def auto_record_results():
    """
    Manually trigger automatic recording of completed game results.
    """
    if game_monitor is None:
        raise HTTPException(status_code=503, detail="Game monitor not initialized")
    
    results = game_monitor.manual_check()
    return {
        "status": "complete",
        "results": results
    }


@router.get("/calibration/status")
async def get_calibration_status():
    """Get current model calibration status."""
    if model_calibration is None:
        raise HTTPException(status_code=503, detail="Calibration service not initialized")
    
    status = model_calibration.get_calibration_status()
    return status


@router.post("/calibration/run")
async def run_calibration(
    min_predictions: int = Query(50, ge=10, le=500),
    max_adjustment: float = Query(0.05, ge=0.01, le=0.15)
):
    """
    Run model calibration to optimize ensemble weights.
    
    Args:
        min_predictions: Minimum verified predictions needed (default 50)
        max_adjustment: Maximum weight change per calibration (default 0.05)
    """
    if model_calibration is None:
        raise HTTPException(status_code=503, detail="Calibration service not initialized")
    
    result = model_calibration.calibrate_weights(
        min_predictions=min_predictions,
        max_adjustment=max_adjustment
    )
    
    # If calibration succeeded, reload weights in prediction engine
    if result.get('success'):
        prediction_engine._load_optimized_weights()
    
    return result


@router.get("/calibration/report")
async def get_calibration_report():
    """Get detailed calibration report."""
    if model_calibration is None:
        raise HTTPException(status_code=503, detail="Calibration service not initialized")
    
    report = model_calibration.generate_calibration_report()
    return report


@router.get("/monitor/status")
async def get_monitor_status():
    """Get game result monitor status."""
    if game_monitor is None:
        raise HTTPException(status_code=503, detail="Game monitor not initialized")
    
    status = game_monitor.get_status()
    return status

