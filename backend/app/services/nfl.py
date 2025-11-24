import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional

ESPN_NFL_URL = "http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

class NFLClient:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    def get_scoreboard(self, game_date: Optional[str] = None) -> List[Dict]:
        """
        Fetch NFL games for a specific date using ESPN API.
        """
        if not game_date:
            game_date = datetime.now().strftime("%Y%m%d")
        else:
            # ESPN expects YYYYMMDD
            game_date = game_date.replace("-", "")
        
        try:
            print(f"Fetching ESPN NFL scoreboard for date: {game_date}")
            response = requests.get(
                ESPN_NFL_URL, 
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
                
            if not games:
                print("No NFL games found in ESPN response.")
                return self.get_mock_games()
                
            return games
        except Exception as e:
            print(f"Error fetching ESPN NFL scoreboard: {e}")
            return self.get_mock_games()

    def get_mock_games(self) -> List[Dict]:
        """Return mock NFL games for testing/fallback"""
        return [
            {
                "game_id": "401547123",
                "league": "nfl",
                "home_team_id": "12", # KC
                "away_team_id": "24", # LAC
                "game_date": (datetime.now() + timedelta(days=1)).isoformat(),
                "status": "8:15 PM ET",
                "home_team_name": "Kansas City Chiefs",
                "away_team_name": "Los Angeles Chargers",
                "home_team_abbrev": "KC",
                "away_team_abbrev": "LAC",
                "home_record": "11-4",
                "away_record": "5-10",
                "home_score": "0",
                "away_score": "0",
                "odds": {"spread": "KC -7.5", "over_under": "45.5"}
            },
            {
                "game_id": "401547124",
                "league": "nfl",
                "home_team_id": "6", # DAL
                "away_team_id": "21", # PHI
                "game_date": (datetime.now() + timedelta(days=3)).isoformat(),
                "status": "4:25 PM ET",
                "home_team_name": "Dallas Cowboys",
                "away_team_name": "Philadelphia Eagles",
                "home_team_abbrev": "DAL",
                "away_team_abbrev": "PHI",
                "home_record": "10-5",
                "away_record": "11-4",
                "home_score": "0",
                "away_score": "0",
                "odds": {"spread": "DAL -2.5", "over_under": "51.0"}
            },
            {
                "game_id": "401547125",
                "league": "nfl",
                "home_team_id": "2", # BUF
                "away_team_id": "15", # MIA
                "game_date": (datetime.now() + timedelta(days=3)).isoformat(),
                "status": "8:20 PM ET",
                "home_team_name": "Buffalo Bills",
                "away_team_name": "Miami Dolphins",
                "home_team_abbrev": "BUF",
                "away_team_abbrev": "MIA",
                "home_record": "9-6",
                "away_record": "11-4",
                "home_score": "0",
                "away_score": "0",
                "odds": {"spread": "BUF -1.5", "over_under": "49.5"}
            }
        ]

