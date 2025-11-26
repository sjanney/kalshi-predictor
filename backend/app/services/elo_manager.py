"""
Elo Rating Manager
Fetches historical games from ESPN and calculates/maintains Elo ratings for all teams.
"""
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
import requests

logger = logging.getLogger(__name__)

class EloManager:
    """
    Manages Elo ratings for NBA and NFL teams.
    - Fetches historical games from ESPN
    - Calculates and updates Elo ratings
    - Persists ratings to disk
    """
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.elo_file = os.path.join(data_dir, "elo_ratings.json")
        
        # Elo parameters
        self.K_FACTOR = 32  # How much ratings change per game
        self.HOME_ADVANTAGE = {"nba": 65, "nfl": 55}  # Home advantage in Elo points
        self.DEFAULT_RATING = 1500
        
        # ESPN API endpoints
        self.ESPN_URLS = {
            "nba": "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
            "nfl": "http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
        }
        
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        # Load existing ratings and games
        self.ratings = self._load_ratings()
        self.historical_games = self._load_historical_games()
        
        # Ensure data directory exists
        os.makedirs(data_dir, exist_ok=True)
    
    def _load_ratings(self) -> Dict:
        """Load Elo ratings from disk"""
        if os.path.exists(self.elo_file):
            try:
                with open(self.elo_file, 'r') as f:
                    data = json.load(f)
                    logger.info(f"Loaded Elo ratings for {len(data.get('ratings', {}))} teams")
                    return data
            except Exception as e:
                logger.error(f"Error loading Elo ratings: {e}")
        
        return {
            "ratings": {},  # Format: "league_team_id": rating
            "last_updated": None,
            "games_processed": 0
        }

    def _load_historical_games(self) -> List[Dict]:
        """Load historical games from disk"""
        games_file = os.path.join(self.data_dir, "historical_games.json")
        if os.path.exists(games_file):
            try:
                with open(games_file, 'r') as f:
                    games = json.load(f)
                    logger.info(f"Loaded {len(games)} historical games")
                    return games
            except Exception as e:
                logger.error(f"Error loading historical games: {e}")
        return []

    def _save_historical_games(self):
        """Save historical games to disk"""
        games_file = os.path.join(self.data_dir, "historical_games.json")
        try:
            with open(games_file, 'w') as f:
                json.dump(self.historical_games, f, indent=2)
            logger.info(f"Saved {len(self.historical_games)} historical games")
        except Exception as e:
            logger.error(f"Error saving historical games: {e}")
    
    def _save_ratings(self):
        """Save Elo ratings to disk"""
        try:
            self.ratings["last_updated"] = datetime.now().isoformat()
            with open(self.elo_file, 'w') as f:
                json.dump(self.ratings, f, indent=2)
            logger.info(f"Saved Elo ratings for {len(self.ratings['ratings'])} teams")
        except Exception as e:
            logger.error(f"Error saving Elo ratings: {e}")
    
    def get_rating(self, team_id: str, league: str) -> float:
        """Get current Elo rating for a team"""
        key = f"{league}_{team_id}"
        return self.ratings["ratings"].get(key, self.DEFAULT_RATING)
    
    def get_historical_games(self, league: Optional[str] = None) -> List[Dict]:
        """Get historical games, optionally filtered by league"""
        if league:
            return [g for g in self.historical_games if g.get('league') == league]
        return self.historical_games

    def _calculate_expected_score(self, rating_a: float, rating_b: float) -> float:
        """Calculate expected score for team A (0 to 1)"""
        return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400))
    
    def _update_ratings(self, home_id: str, away_id: str, league: str, 
                       home_won: bool, home_score: int, away_score: int):
        """Update Elo ratings after a game"""
        # Get current ratings
        home_rating = self.get_rating(home_id, league)
        away_rating = self.get_rating(away_id, league)
        
        # Adjust for home advantage
        home_advantage = self.HOME_ADVANTAGE.get(league, 60)
        home_rating_adj = home_rating + home_advantage
        
        # Calculate expected scores
        home_expected = self._calculate_expected_score(home_rating_adj, away_rating)
        away_expected = 1.0 - home_expected
        
        # Actual scores (1 for win, 0 for loss)
        home_actual = 1.0 if home_won else 0.0
        away_actual = 1.0 - home_actual
        
        # Calculate margin of victory multiplier (larger wins = bigger rating changes)
        # Cap at reasonable values to avoid huge swings
        point_diff = abs(home_score - away_score)
        mov_multiplier = min(1.0 + (point_diff / 25.0), 2.0)
        
        # Update ratings
        new_home_rating = home_rating + self.K_FACTOR * mov_multiplier * (home_actual - home_expected)
        new_away_rating = away_rating + self.K_FACTOR * mov_multiplier * (away_actual - away_expected)
        
        # Store updated ratings
        self.ratings["ratings"][f"{league}_{home_id}"] = round(new_home_rating, 1)
        self.ratings["ratings"][f"{league}_{away_id}"] = round(new_away_rating, 1)
        
        return new_home_rating, new_away_rating
    
    def fetch_historical_games(self, league: str, days_back: int = 120) -> List[Dict]:
        """
        Fetch historical games from ESPN for the specified league.
        Goes back N days to get completed games for the current season.
        """
        url = self.ESPN_URLS.get(league)
        if not url:
            logger.error(f"Unknown league: {league}")
            return []
        
        all_games = []
        seen_game_ids = set()
        
        # Check dates going backwards from today
        # For NBA: full season is ~182 days (Oct-Apr)
        # For NFL: regular season is ~18 weeks (~126 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        logger.info(f"Fetching {league.upper()} historical games from {start_date.date()} to {end_date.date()}")
        
        # Check every 3 days to reduce API calls (games don't happen every day)
        date_increment = 3 if league == "nba" else 7  # NFL games weekly
        current_date = start_date
        
        while current_date <= end_date:
            date_str = current_date.strftime("%Y%m%d")
            
            try:
                response = requests.get(
                    url,
                    params={"dates": date_str},
                    headers=self.headers,
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()
                
                for event in data.get('events', []):
                    game_id = event['id']
                    
                    # Skip duplicates
                    if game_id in seen_game_ids:
                        continue
                    
                    # Only process completed games
                    status = event['status']['type']['name']
                    if status != 'STATUS_FINAL':
                        continue
                    
                    seen_game_ids.add(game_id)
                    
                    competition = event['competitions'][0]
                    home_comp = next(c for c in competition['competitors'] if c['homeAway'] == 'home')
                    away_comp = next(c for c in competition['competitors'] if c['homeAway'] == 'away')
                    
                    home_score = int(home_comp.get('score', 0))
                    away_score = int(away_comp.get('score', 0))
                    
                    all_games.append({
                        "game_id": game_id,
                        "league": league,
                        "home_team_id": home_comp['team']['id'],
                        "away_team_id": away_comp['team']['id'],
                        "home_team_name": home_comp['team']['displayName'],
                        "away_team_name": away_comp['team']['displayName'],
                        "home_score": home_score,
                        "away_score": away_score,
                        "home_won": home_score > away_score,
                        "game_date": event['date'],
                        "status": "Final"
                    })
                
            except Exception as e:
                logger.debug(f"Error fetching games for {date_str}: {e}")
            
            current_date += timedelta(days=date_increment)
        
        logger.info(f"Fetched {len(all_games)} completed {league.upper()} games")
        return all_games
    
    def initialize_ratings(self, league: str, force_refresh: bool = False):
        """
        Initialize Elo ratings by processing historical games.
        Only runs if ratings don't exist or force_refresh is True.
        """
        # Check if we already have ratings for this league
        league_teams = [k for k in self.ratings["ratings"].keys() if k.startswith(f"{league}_")]
        
        if league_teams and not force_refresh:
            logger.info(f"Elo ratings already initialized for {league.upper()} ({len(league_teams)} teams)")
            return
        
        logger.info(f"Initializing Elo ratings for {league.upper()}...")
        
        # Fetch historical games
        historical_games = self.fetch_historical_games(league)
        
        if not historical_games:
            logger.warning(f"No historical games found for {league.upper()}")
            return
        
        # Update historical games list (remove old ones for this league first)
        self.historical_games = [g for g in self.historical_games if g.get('league') != league]
        self.historical_games.extend(historical_games)
        self._save_historical_games()
        
        # Sort games by date (oldest first)
        historical_games.sort(key=lambda x: x['game_date'])
        
        # Process each game to update ratings
        games_processed = 0
        for game in historical_games:
            self._update_ratings(
                home_id=game['home_team_id'],
                away_id=game['away_team_id'],
                league=league,
                home_won=game['home_won'],
                home_score=game['home_score'],
                away_score=game['away_score']
            )
            games_processed += 1
        
        self.ratings["games_processed"] += games_processed
        self._save_ratings()
        
        league_teams = [k for k in self.ratings["ratings"].keys() if k.startswith(f"{league}_")]
        logger.info(f"Initialized Elo ratings for {len(league_teams)} {league.upper()} teams from {games_processed} games")
    
    def update_with_game_result(self, game: Dict, league: str):
        """Update Elo ratings with a single game result"""
        if game.get('status', '').lower() not in ['final', 'status_final']:
            return
        
        try:
            home_score = int(game.get('home_score', 0))
            away_score = int(game.get('away_score', 0))
            home_won = home_score > away_score
            
            self._update_ratings(
                home_id=str(game['home_team_id']),
                away_id=str(game['away_team_id']),
                league=league,
                home_won=home_won,
                home_score=home_score,
                away_score=away_score
            )
            
            self.ratings["games_processed"] += 1
            self._save_ratings()
            
            logger.info(f"Updated Elo ratings for {game.get('home_team_name')} vs {game.get('away_team_name')}")
        except Exception as e:
            logger.error(f"Error updating Elo for game {game.get('game_id')}: {e}")
    
    def get_all_ratings(self, league: Optional[str] = None) -> Dict[str, float]:
        """Get all ratings, optionally filtered by league"""
        if league:
            return {
                k: v for k, v in self.ratings["ratings"].items() 
                if k.startswith(f"{league}_")
            }
        return self.ratings["ratings"]
    
    def reset_ratings(self, league: Optional[str] = None):
        """Reset ratings for a league or all leagues"""
        if league:
            keys_to_remove = [k for k in self.ratings["ratings"].keys() if k.startswith(f"{league}_")]
            for key in keys_to_remove:
                del self.ratings["ratings"][key]
            logger.info(f"Reset {len(keys_to_remove)} {league.upper()} ratings")
        else:
            self.ratings["ratings"] = {}
            self.ratings["games_processed"] = 0
            logger.info("Reset all Elo ratings")
        
        self._save_ratings()
