"""
Mock prediction service for offline/demo mode.
Returns static predictions when USE_MOCK_DATA is enabled.
"""
import random
from typing import Dict, Any
from datetime import datetime


class MockPredictionService:
    """Provides mock predictions for testing and demo purposes."""
    
    def __init__(self):
        self.predictions = {}
    
    def get_mock_prediction(self, home_team: str, away_team: str, league: str = "nfl") -> Dict[str, Any]:
        """
        Generate a deterministic mock prediction based on team names.
        
        Args:
            home_team: Home team name
            away_team: Away team name
            league: League identifier (nfl, nba)
            
        Returns:
            Mock prediction dictionary matching the real prediction format
        """
        # Use team names to seed random for deterministic results
        seed = hash(f"{home_team}_{away_team}_{league}") % 10000
        random.seed(seed)
        
        # Generate mock probabilities
        home_win_prob = round(random.uniform(0.35, 0.75), 2)
        away_win_prob = round(1.0 - home_win_prob, 2)
        
        # Mock market data
        market_home_prob = round(home_win_prob + random.uniform(-0.1, 0.1), 2)
        market_home_prob = max(0.2, min(0.8, market_home_prob))
        
        # Mock confidence and divergence
        confidence = round(random.uniform(0.6, 0.9), 2)
        divergence = abs(home_win_prob - market_home_prob)
        
        # Mock EV calculation
        ev = round((home_win_prob - market_home_prob) * 100, 2)
        
        # Mock recommendation
        if ev > 5:
            recommendation = f"BET {home_team}"
            reasoning = f"Strong value on {home_team} with {ev}% positive EV"
        elif ev < -5:
            recommendation = f"BET {away_team}"
            reasoning = f"Strong value on {away_team} with {abs(ev)}% positive EV"
        else:
            recommendation = "NO BET"
            reasoning = "No significant edge detected"
        
        return {
            "home_team": home_team,
            "away_team": away_team,
            "league": league,
            "home_win_prob": home_win_prob,
            "away_win_prob": away_win_prob,
            "market_home_prob": market_home_prob,
            "market_away_prob": round(1.0 - market_home_prob, 2),
            "confidence": confidence,
            "divergence": round(divergence, 2),
            "expected_value": ev,
            "recommendation": recommendation,
            "reasoning": reasoning,
            "model_version": "mock_v1.0",
            "timestamp": datetime.now().isoformat(),
            "is_mock": True,
            "factors": {
                "elo_rating": {"home": 1500 + random.randint(-200, 200), "away": 1500 + random.randint(-200, 200)},
                "recent_form": {"home": round(random.uniform(0.3, 0.7), 2), "away": round(random.uniform(0.3, 0.7), 2)},
                "home_advantage": 0.55,
                "injuries": {"home": "Minor", "away": "Minor"}
            }
        }


# Singleton instance
_mock_service = None


def get_mock_service() -> MockPredictionService:
    """Get or create the mock prediction service singleton."""
    global _mock_service
    if _mock_service is None:
        _mock_service = MockPredictionService()
    return _mock_service
