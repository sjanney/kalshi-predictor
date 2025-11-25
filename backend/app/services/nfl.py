import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

ESPN_NFL_URL = "http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

class NFLClient:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        self._cache = {}
        self._cache_ttl = 30  # seconds

    def get_scoreboard(self, game_date: Optional[str] = None) -> List[Dict]:
        """
        Fetch NFL games for a specific date or next 14 days using ESPN API.
        If no date is provided, fetches games for the next 14 days to get more games.
        """
        # Simple cache key generation
        cache_key = game_date if game_date else "next_14_days"
        
        # Check cache
        now = datetime.now().timestamp()
        if cache_key in self._cache:
            timestamp, data = self._cache[cache_key]
            if now - timestamp < self._cache_ttl:
                return data

        all_games = []
        seen_game_ids = set()
        
        # If a specific date is provided, only fetch that date
        if game_date:
            dates_to_check = [game_date.replace("-", "")]
        else:
            # Fetch games for the next 14 days to get more NFL games
            # NFL games are typically on Thu, Sun, Mon, so checking multiple days helps
            dates_to_check = []
            for i in range(14):
                date = datetime.now() + timedelta(days=i)
                dates_to_check.append(date.strftime("%Y%m%d"))
        
        try:
            for date_str in dates_to_check:
                logger.debug(f"Fetching ESPN NFL scoreboard for date: {date_str}")
                try:
                    response = requests.get(
                        ESPN_NFL_URL, 
                        params={"dates": date_str},
                        headers=self.headers, 
                        timeout=10
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    for event in data.get('events', []):
                        # Skip if we've already seen this game
                        game_id = event['id']
                        if game_id in seen_game_ids:
                            continue
                        seen_game_ids.add(game_id)
                        
                        competition = event['competitions'][0]
                        home_comp = next(c for c in competition['competitors'] if c['homeAway'] == 'home')
                        away_comp = next(c for c in competition['competitors'] if c['homeAway'] == 'away')
                        
                        # Extract records
                        home_record = next((r['summary'] for r in home_comp.get('records', []) if r['name'] == 'overall'), "0-0")
                        away_record = next((r['summary'] for r in away_comp.get('records', []) if r['name'] == 'overall'), "0-0")
                        
                        # Extract odds if available
                        odds_data = competition.get('odds', [{}])[0] if competition.get('odds') else {}
                        spread = odds_data.get('details', 'N/A')
                        over_under = odds_data.get('overUnder', 'N/A')

                        all_games.append({
                            "game_id": event['id'],
                            "league": "nfl",
                            "home_team_id": home_comp['team']['id'],
                            "away_team_id": away_comp['team']['id'],
                            "home_team_name": home_comp['team']['displayName'],
                            "away_team_name": away_comp['team']['displayName'],
                            "home_team_abbrev": home_comp['team']['abbreviation'],
                            "away_team_abbrev": away_comp['team']['abbreviation'],
                            "home_record": home_record,
                            "away_record": away_record,
                            "home_score": home_comp.get('score', '0'),
                            "away_score": away_comp.get('score', '0'),
                            "game_date": event['date'],
                            "status": event['status']['type']['shortDetail'],
                            "odds": {
                                "spread": spread,
                                "over_under": over_under
                            }
                        })
                except requests.exceptions.RequestException as e:
                    logger.error(f"Error fetching games for date {date_str}: {e}")
                    continue  # Continue to next date
                
            if not all_games:
                logger.warning("No NFL games found in ESPN response for any date.")
                return []
            
            logger.info(f"Found {len(all_games)} total NFL games across {len(dates_to_check)} days")
            
            # Update cache
            self._cache[cache_key] = (now, all_games)
            
            return all_games
        except Exception as e:
            logger.error(f"Error fetching ESPN NFL scoreboard: {e}")
            return []

