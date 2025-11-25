from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Optional
import logging
from app.services.kalshi import KalshiClient
from app.services.nba import NBAClient
from app.services.nfl import NFLClient
from app.services.prediction import PredictionEngine
from app.services.enhanced_prediction import EnhancedPredictionEngine
from app.services.data_feeds import DataFeeds
from app.services.enhanced_data_feeds import EnhancedDataFeeds
from app.services.insights_generator import InsightsGenerator
from app.services.automation import AutomationService
import re
import time
import asyncio

# Configure structured logging
logger = logging.getLogger(__name__)

router = APIRouter()

kalshi_client = KalshiClient()
nba_client = NBAClient()
nfl_client = NFLClient()
prediction_engine = PredictionEngine()
enhanced_prediction_engine = EnhancedPredictionEngine()
data_feeds = DataFeeds()
enhanced_data_feeds = EnhancedDataFeeds()
insights_generator = InsightsGenerator()
automation_service = AutomationService()

def _build_team_keys(name: str, abbr: str) -> List[str]:
    """Return a list of lowercase tokens that can identify a team."""
    keys = set()
    if name:
        clean = re.sub(r'[^a-z0-9 ]', ' ', name.lower())
        tokens = [t for t in clean.split() if len(t) > 2]
        keys.update(tokens)
        if tokens:
            keys.add(tokens[-1])  # mascot (e.g. 'celtics')
            keys.add("".join(tokens))  # combined city/mascot
    if abbr:
        keys.add(abbr.lower())
    return [k for k in keys if k]


def _market_text(market: Dict) -> str:
    """Concatenate relevant market fields for matching."""
    title = market.get('title', '')
    ticker = market.get('ticker', '')
    return f"{title} {ticker}".lower()


def match_game_to_markets(game: Dict, markets: List[Dict]) -> Optional[Dict]:
    """
    Match a game to a Kalshi market (or pair of markets).
    Returns a dict with 'home_market' and 'away_market' keys if found.
    """
    if not markets:
        return None
        
    home_name = game.get('home_team_name', '')
    away_name = game.get('away_team_name', '')
    home_abbr = game.get('home_team_abbrev', '')
    away_abbr = game.get('away_team_abbrev', '')

    home_keys = _build_team_keys(home_name, home_abbr)
    away_keys = _build_team_keys(away_name, away_abbr)

    home_market_match = None
    away_market_match = None
    
    # Fallback for single "Vs" market
    best_single_market = None
    best_single_score = 0

    for market in markets:
        norm = kalshi_client.normalize_market(market)
        subject = norm['subject'].lower()
        
        # Check matches
        is_home = any(k in subject for k in home_keys)
        is_away = any(k in subject for k in away_keys)
        
        if is_home and not is_away:
            home_market_match = norm
        elif is_away and not is_home:
            away_market_match = norm
            
        # Score for general event matching
        text = _market_text(market)
        score = 0
        if any(k in text for k in home_keys): score += 1
        if any(k in text for k in away_keys): score += 1
        
        if score > best_single_score:
            best_single_score = score
            best_single_market = norm

    # 1. Prefer explicit separate markets
    if home_market_match and away_market_match and home_market_match['market_id'] != away_market_match['market_id']:
        return {
            "type": "dual",
            "home_market": home_market_match,
            "away_market": away_market_match
        }
    
    # 2. Fallback to best single market found
    if best_single_score >= 1.5 and best_single_market:
        m = best_single_market
        subject = m['subject'].lower()
        
        is_home_subject = any(k in subject for k in home_keys)
        is_away_subject = any(k in subject for k in away_keys)
        
        # If the market is explicitly about one team, treat as single_home/away
        if is_home_subject and not is_away_subject:
            return { "type": "single_home", "home_market": m }
        elif is_away_subject and not is_home_subject:
            return { "type": "single_away", "away_market": m }
        
        # If it mentions both (e.g. "BOS vs LAL"), assume it's a Vs market where Yes = Home usually?
        # Or check subtitle? `normalize_market` already prioritized subtitle.
        # We'll assume it maps to Home for now or just return it as home_market
        return { "type": "single_home", "home_market": m }

    return None

class SimpleCache:
    def __init__(self, ttl_seconds: int = 60):
        self.cache = {}
        self.ttl = ttl_seconds
    
    def get(self, key):
        if key in self.cache:
            data, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return data
            else:
                del self.cache[key]
        return None
    
    def set(self, key, value):
        self.cache[key] = (value, time.time())

# Cache for 5 minutes (increased from 2 minutes for better performance)
predictions_cache = SimpleCache(ttl_seconds=300)

# Request deduplication - prevent multiple identical requests
_pending_requests = {}
_request_locks = {}

async def _process_single_game(game: Dict, markets: List[Dict], league: str, use_enhanced: bool, all_games: List[Dict]) -> Optional[Dict]:
    """Process a single game prediction in isolation for parallel execution."""
    game_id = game.get('game_id', 'unknown')
    try:
        home_stats = {} 
        away_stats = {}
        
        matched_markets = match_game_to_markets(game, markets)
        
        # Process game even if no markets found - prediction engine will use defaults
        # This ensures we still get model predictions even when Kalshi markets aren't available
        if not matched_markets:
            logger.debug(f"No matching Kalshi markets found for {game_id} ({game.get('home_team_abbrev')} vs {game.get('away_team_abbrev')}), proceeding with model-only prediction")
            matched_markets = None  # Pass None to prediction engine, which will handle it gracefully
            
        # Use enhanced engine if enabled
        if use_enhanced:
            prediction_data = enhanced_prediction_engine.generate_prediction(
                {**game, "league": league},
                home_stats,
                away_stats,
                matched_markets,
                all_games=all_games
            )
        else:
            prediction_data = prediction_engine.generate_prediction(
                {**game, "league": league},
                home_stats,
                away_stats,
                matched_markets
            )
        
        # Get market context
        try:
            market_context = enhanced_data_feeds.get_market_context(
                game.get('home_team_abbrev', ''),
                game.get('away_team_abbrev', ''),
                game.get('game_date', ''),
                league
            )
            
            insights = insights_generator.generate_insights(
                prediction_data,
                market_context
            )
            
            if 'analytics' not in prediction_data:
                prediction_data['analytics'] = {}
            prediction_data['analytics']['insights'] = insights
            prediction_data['market_context'] = market_context
            
        except Exception as e:
            logger.error(f"Error generating insights for {game_id}: {e}", exc_info=True)
        
        # Add timestamp for frontend sync
        prediction_data['last_updated'] = int(time.time() * 1000)
        
        return prediction_data
        
    except Exception as e:
        logger.error(f"Error processing game {game_id}: {e}", exc_info=True)
        return None

async def _get_league_predictions(league: str, use_enhanced: bool = True) -> List[Dict]:
    """Helper to get predictions for a specific league."""
    
    # Check cache
    cache_key = f"{league}_{use_enhanced}"
    cached = predictions_cache.get(cache_key)
    if cached:
        logger.info(f"Returning cached predictions for {league}")
        return cached

    # Request deduplication - if same request is in progress, wait for it
    if cache_key in _pending_requests:
        logger.info(f"Request for {cache_key} already in progress, waiting...")
        return await _pending_requests[cache_key]

    # Create a new future for this request
    loop = asyncio.get_event_loop()
    future = loop.create_future()
    _pending_requests[cache_key] = future

    # 1. Fetch Games
    logger.info(f"Fetching {league.upper()} games...")
    try:
        if league == "nba":
            games = await loop.run_in_executor(None, nba_client.get_scoreboard)
        elif league == "nfl":
            games = await loop.run_in_executor(None, nfl_client.get_scoreboard)
        else:
            games = [] 
            
        logger.info(f"Games fetched: {len(games) if games else 0}")
    except Exception as e:
        logger.error(f"Error in get_scoreboard: {e}", exc_info=True)
        games = []

    if not games:
        results = []
    else:
        # 2. Fetch Kalshi Markets
        logger.info(f"Fetching Kalshi {league.upper()} markets...")
        try:
            markets = await loop.run_in_executor(None, kalshi_client.get_league_markets, league)
            logger.info(f"Markets fetched: {len(markets) if markets else 0}")
            
            # Check if we have any valid matches (for logging purposes)
            has_valid_matches = False
            if games and markets:
                # Quick check on first few games to see if we have matches
                for game in games[:3]: 
                    if match_game_to_markets(game, markets):
                        has_valid_matches = True
                        break
            
            if not has_valid_matches and games:
                 logger.warning("No matching game markets found. Will still generate model-only predictions.")

        except Exception as e:
            logger.error(f"Error fetching markets: {e}", exc_info=True)
            markets = []
        
        # 3. Match Games to Markets and Generate Predictions
        results = []
        
        # Process games in parallel with error handling
        tasks = []
        for game in games:
            tasks.append(_process_single_game(game, markets, league, use_enhanced, games))
        
        # Wait for all tasks (return_exceptions=True to prevent one failure from stopping all)
        if tasks:
            processed_results = await asyncio.gather(*tasks, return_exceptions=True)
            results = [r for r in processed_results if r is not None and not isinstance(r, Exception)]
            
            # Log any exceptions that occurred
            exceptions = [r for r in processed_results if isinstance(r, Exception)]
            if exceptions:
                logger.warning(f"Encountered {len(exceptions)} exceptions during game processing")
    
    # Update cache and resolve pending requests
    try:
        # Update cache
        predictions_cache.set(cache_key, results)
        
        # Resolve pending requests and clean up
        if cache_key in _pending_requests:
            future = _pending_requests.pop(cache_key)
            if not future.done():
                future.set_result(results)
        
        return results
    except Exception as e:
        logger.error(f"Error in _get_league_predictions: {e}", exc_info=True)
        # Clean up pending request on error
        if cache_key in _pending_requests:
            future = _pending_requests.pop(cache_key)
            if not future.done():
                future.set_exception(e)
        raise
    
    # Update cache
    predictions_cache.set(cache_key, results)
    
    # Resolve pending requests and clean up
    if cache_key in _pending_requests:
        future = _pending_requests.pop(cache_key)
        if not future.done():
            future.set_result(results)
    
    return results

@router.get("/games", response_model=List[Dict])
async def get_games(
    sort_by: str = Query("time", enum=["time", "divergence", "confidence"]),
    league: str = Query("nba", enum=["nba", "nfl"]),
    filter_status: Optional[str] = None
):
    """
    Get upcoming games with predictions.
    """
    results = await _get_league_predictions(league)
    
    # Filtering
    if filter_status:
        results = [r for r in results if filter_status.lower() in r.get('status', '').lower()]

    # Sorting
    if sort_by == "divergence":
        results.sort(key=lambda x: x['prediction']['divergence'], reverse=True)
    elif sort_by == "confidence":
        # Custom sort for High > Medium > Low
        conf_map = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
        results.sort(key=lambda x: conf_map.get(x['prediction']['confidence_score'], 0), reverse=True)
    else: # time (default)
        pass
            
    logger.info(f"Returning {len(results)} results")
    return results

@router.get("/games/{game_id}")
async def get_game_details(game_id: str, league: Optional[str] = Query(None, enum=["nba", "nfl"])):
    """
    Get deep dive details for a specific game.
    If league is provided, only checks that league (faster).
    Otherwise checks both leagues.
    """
    # If league is specified, only check that league
    if league:
        games = await _get_league_predictions(league)
        for game in games:
            if str(game['game_id']) == str(game_id):
                return game
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Otherwise check both leagues (backward compatibility)
    # Try NBA first
    nba_games = await _get_league_predictions("nba")
    for game in nba_games:
        if str(game['game_id']) == str(game_id):
            return game
            
    # Try NFL
    nfl_games = await _get_league_predictions("nfl")
    for game in nfl_games:
        if str(game['game_id']) == str(game_id):
            return game
            
    raise HTTPException(status_code=404, detail="Game not found")

@router.get("/market-context")
async def get_market_context(
    home_team: str,
    away_team: str,
    game_date: str,
    league: str = "nfl"
):
    """
    Fetch external context (weather, injuries, news) for a matchup.
    Uses enhanced data feeds with real injury data and weather correlation.
    """
    try:
        return enhanced_data_feeds.get_market_context(home_team, away_team, game_date, league)
    except Exception as e:
        logger.error(f"Error fetching market context: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch market context")

@router.post("/alerts/run")
async def run_alerts():
    """
    Trigger manual alert scan.
    """
    return await automation_service.check_alerts()
