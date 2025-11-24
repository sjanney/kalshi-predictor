from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Optional
from app.services.kalshi import KalshiClient
from app.services.nba import NBAClient
from app.services.prediction import PredictionEngine
import difflib
import re

router = APIRouter()

kalshi_client = KalshiClient()
nba_client = NBAClient()
prediction_engine = PredictionEngine()

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
    Match an NBA game to a Kalshi market (or pair of markets).
    Returns a dict with 'home_market' and 'away_market' keys if found.
    """
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

@router.get("/games", response_model=List[Dict])
async def get_games(
    sort_by: str = Query("time", enum=["time", "divergence", "confidence"]),
    filter_status: Optional[str] = None
):
    """
    Get upcoming games with predictions.
    """
    # 1. Fetch NBA Games
    print("Fetching games...")
    try:
        games = nba_client.get_scoreboard()
        print(f"Games fetched: {len(games) if games else 0}")
    except Exception as e:
        print(f"Error in get_scoreboard: {e}")
        games = []

    if not games:
        return []
        
    # 2. Fetch Kalshi Markets
    print("Fetching Kalshi markets...")
    try:
        markets = kalshi_client.get_nba_markets()
        print(f"Markets fetched: {len(markets) if markets else 0}")
        
        # Check if we have any valid matches
        has_valid_matches = False
        if games and markets:
            for game in games[:3]: # Check first few games
                if match_game_to_markets(game, markets):
                    has_valid_matches = True
                    break
        
        if not has_valid_matches and games:
             print("DEBUG: No matching game markets found. Generating MOCK markets for demo.")
             markets = kalshi_client.generate_mock_markets_for_games(games)
             print(f"Mock markets generated: {len(markets)}")

    except Exception as e:
        print(f"Error fetching markets: {e}")
        markets = []
    
    # 3. Match Games to Markets and Generate Predictions
    results = []
    for game in games:
        try:
            # Filter status if requested
            if filter_status and filter_status.lower() not in game.get('status', '').lower():
                continue

            # Placeholder stats (fetching is expensive/complex without paid API, using records)
            home_stats = {} 
            away_stats = {}
            
            matched_markets = match_game_to_markets(game, markets)
            
            prediction_data = prediction_engine.generate_prediction(
                game, home_stats, away_stats, matched_markets
            )
            
            results.append(prediction_data)
            
        except Exception as e:
            print(f"Error processing game {game.get('game_id')}: {e}")
            continue
            
    # Sorting
    if sort_by == "divergence":
        results.sort(key=lambda x: x['prediction']['divergence'], reverse=True)
    elif sort_by == "confidence":
        # Custom sort for High > Medium > Low
        conf_map = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
        results.sort(key=lambda x: conf_map.get(x['prediction']['confidence_score'], 0), reverse=True)
    else: # time (default) - assuming games are already roughly sorted by time
        pass
            
    print(f"Returning {len(results)} results")
    return results

@router.get("/games/{game_id}")
async def get_game_details(game_id: str):
    return {"game_id": game_id, "details": "Deep dive analysis coming soon in v2.1"}
