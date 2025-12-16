import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional

BALLDONTLIE_API_URL = "https://api.balldontlie.io/v1"
# Note: balldontlie requires an API key now for v1. 
# If the user doesn't have one, we might need to use v0 or another source.
# For now, I'll assume we might need to ask for one or use a public alternative if available.
# Actually, let's use the free public endpoints if possible, or fallback to a mock for development if key is missing.
# Wait, balldontlie v1 needs a key. v0 is deprecated/gone?
# Let's try to find a truly free one or use `nba_api` python package which wraps stats.nba.com.
# `nba_api` is better as it doesn't require a key usually (just headers).

# I will switch to using `nba_api` package logic, but since I can't install new system packages easily without pip, 
# and I already added `requests` to requirements, I'll stick to requests but maybe target stats.nba.com headers directly 
# or use a different free API.
# Actually, for simplicity and reliability, I'll use a simple wrapper around stats.nba.com endpoints 
# with proper headers to avoid bot detection.

ESPN_NBA_URL = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"

class NBAClient:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        self._cache = {}
        self._cache_ttl = 30  # seconds

    def get_scoreboard(self, game_date: Optional[str] = None) -> List[Dict]:
        """
        Fetch games for a specific date using ESPN API.
        """
        if not game_date:
            game_date = datetime.now().strftime("%Y%m%d")
        else:
            # ESPN expects YYYYMMDD
            game_date = game_date.replace("-", "")
            
        # Check cache
        now = datetime.now().timestamp()
        if game_date in self._cache:
            timestamp, data = self._cache[game_date]
            if now - timestamp < self._cache_ttl:
                return data
        
        try:
            print(f"Fetching ESPN scoreboard for date: {game_date}")
            response = requests.get(
                ESPN_NBA_URL, 
                params={"dates": game_date},
                headers=self.headers, 
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            games = []
            for event in data.get('events', []):
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

                games.append({
                    "game_id": event['id'],
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
                
            if not games:
                print("No games found in ESPN response.")
                return []
            
            # Update cache
            self._cache[game_date] = (now, games)
                
            return games
        except Exception as e:
            print(f"Error fetching ESPN scoreboard: {e}")
            return []

    def get_team_stats(self):
        # Placeholder for fetching team stats (wins, losses, ratings)
        pass
