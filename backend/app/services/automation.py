from typing import List, Dict
import asyncio
from app.services.prediction import PredictionEngine
from app.services.nba import NBAClient
from app.services.nfl import NFLClient
from app.services.kalshi import KalshiClient

class AutomationService:
    def __init__(self):
        self.prediction_engine = PredictionEngine()
        self.nba_client = NBAClient()
        self.nfl_client = NFLClient()
        self.kalshi_client = KalshiClient()
        
    async def check_alerts(self) -> List[Dict]:
        """
        Run a full scan of markets and return actionable alerts.
        In a real deployment, this would run on a cron schedule (e.g. every 5 mins).
        """
        alerts = []
        print("Automation: Starting market scan...")
        
        # 1. NBA Scan
        nba_alerts = await self._scan_league('nba')
        alerts.extend(nba_alerts)
        
        # 2. NFL Scan
        nfl_alerts = await self._scan_league('nfl')
        alerts.extend(nfl_alerts)
        
        print(f"Automation: Scan complete. Found {len(alerts)} alerts.")
        return alerts
        
    async def _scan_league(self, league: str) -> List[Dict]:
        league_alerts = []
        
        # Fetch Data
        if league == 'nba':
            games = self.nba_client.get_scoreboard()
        else:
            games = self.nfl_client.get_scoreboard()
            
        markets = self.kalshi_client.get_league_markets(league)
        
        # Generate Predictions & Check Signals
        # Note: We reuse logic from endpoints.py/PredictionEngine here.
        # Ideally this logic is centralized.
        
        from app.api.endpoints import match_game_to_markets # reusing helper
        
        for game in games:
            matched = match_game_to_markets(game, markets)
            # Simplification: passing empty stats
            prediction_data = self.prediction_engine.generate_prediction(
                {**game, "league": league}, {}, {}, matched
            )
            
            # Check conditions
            pred = prediction_data['prediction']
            
            # 1. High Divergence Alert
            if pred['divergence'] > 0.20:
                league_alerts.append({
                    "type": "DIVERGENCE",
                    "priority": "HIGH",
                    "message": f"High divergence ({int(pred['divergence']*100)}%) detected for {game['away_team_abbrev']} @ {game['home_team_abbrev']}",
                    "data": prediction_data
                })
                
            # 2. Signal Alert
            if pred['signal_strength'] == "STRONG":
                league_alerts.append({
                    "type": "SIGNAL",
                    "priority": "MEDIUM",
                    "message": f"Strong signal for {game['away_team_abbrev']} @ {game['home_team_abbrev']}: {pred['recommendation']}",
                    "data": prediction_data
                })
                
            # 3. Weather/Injury Alert (from Context)
            analytics = prediction_data.get('analytics', {})
            if analytics.get('signals'):
                for sig in analytics['signals']:
                    if sig['strength'] == 'HIGH':
                        league_alerts.append({
                            "type": "CONTEXT",
                            "priority": "HIGH",
                            "message": f"Critical context alert: {sig['description']}",
                            "data": prediction_data
                        })

        return league_alerts

