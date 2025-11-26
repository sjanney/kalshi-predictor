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

router = APIRouter()

kalshi_client = KalshiClient()
nba_client = NBAClient()
nfl_client = NFLClient()
prediction_engine = EnhancedPredictionEngine()
signal_engine = EnhancedSignalEngine()
accuracy_tracker = AccuracyTracker()

async def _get_league_predictions_enhanced(league: str) -> List[Dict]:
    """Get predictions using enhanced engine."""
    # 1. Fetch Games
    print(f"Fetching {league.upper()} games...")
    try:
        if league == "nba":
            games = nba_client.get_scoreboard()
        elif league == "nfl":
            games = nfl_client.get_scoreboard()
        else:
            games = []
    except Exception as e:
        print(f"Error in get_scoreboard: {e}")
        games = []

    if not games:
        return []
    
    # 2. Fetch Kalshi Markets
    print(f"Fetching Kalshi {league.upper()} markets...")
    try:
        markets = kalshi_client.get_league_markets(league)
        
        if not markets:
            markets = kalshi_client.generate_synthetic_markets_for_games(games)
    except Exception as e:
        print(f"Error fetching markets: {e}")
        markets = []
    
    # 3. Match Games to Markets and Generate Predictions
    results = []
    for game in games:
        try:
            home_stats = {}
            away_stats = {}
            
            matched_markets = match_game_to_markets(game, markets)
            
            # Use enhanced prediction engine with all games for form/H2H
            prediction_data = prediction_engine.generate_prediction(
                {**game, "league": league},
                home_stats,
                away_stats,
                matched_markets,
                all_games=games  # Pass all games for form and H2H analysis
            )
            
            # Record prediction for accuracy tracking
            accuracy_tracker.record_prediction(
                prediction_data,
                game.get('game_id'),
                league
            )
            
            results.append(prediction_data)
            
        except Exception as e:
            print(f"Error processing game {game.get('game_id')}: {e}")
            continue
    
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

