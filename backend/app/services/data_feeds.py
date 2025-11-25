"""
Legacy Data Feeds.
DEPRECATED: Use EnhancedDataFeeds (enhanced_data_feeds.py) for new development.
Maintained for backward compatibility.
"""
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import random

class DataFeeds:
    def __init__(self):
        # Mock locations for teams (simplified)
        self.team_locations = {
            "KC": {"lat": 39.0997, "lon": -94.5786, "city": "Kansas City"},
            "BUF": {"lat": 42.8864, "lon": -78.8784, "city": "Buffalo"},
            "MIA": {"lat": 25.7617, "lon": -80.1918, "city": "Miami"},
            "PHI": {"lat": 39.9526, "lon": -75.1652, "city": "Philadelphia"},
            "DAL": {"lat": 32.7767, "lon": -96.7970, "city": "Dallas"},
            # Add more as needed or use a comprehensive map
        }
        
    def get_weather_forecast(self, team_abbr: str, game_date: datetime) -> Dict:
        """
        Fetch weather forecast for a game location.
        Deprecated/Removed.
        """
        return {}

    def get_team_injuries(self, team_abbr: str, league: str = "nfl") -> List[Dict]:
        """
        Fetch injury report for a team.
        """
        return []

    def get_market_context(self, home_team: str, away_team: str, game_date_str: str, league: str = "nfl") -> Dict:
        """
        Aggregates data for a specific matchup.
        """
        try:
            game_date = datetime.fromisoformat(game_date_str.replace("Z", ""))
        except ValueError:
            game_date = datetime.now()

        home_injuries = self.get_team_injuries(home_team, league)
        away_injuries = self.get_team_injuries(away_team, league)
        
        return {
            "injuries": {
                "home": home_injuries,
                "away": away_injuries
            },
            "news": self._get_related_news(home_team, away_team)
        }

    def _get_related_news(self, home: str, away: str) -> List[Dict]:
        """Get related news"""
        return []

