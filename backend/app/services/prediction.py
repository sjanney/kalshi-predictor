from typing import Dict, List, Optional
import pandas as pd
from datetime import datetime

class PredictionEngine:
    def __init__(self):
        # Weights
        self.WEIGHT_STATS = 0.35
        self.WEIGHT_KALSHI = 0.45
        self.WEIGHT_ADVANCED = 0.20
        
        # Home court advantage (approx 3-4 points or 5-10% win prob boost)
        self.HOME_ADVANTAGE_ELO = 100
        
    def calculate_elo_win_prob(self, home_elo: float, away_elo: float) -> float:
        """
        Calculate win probability for home team using Elo ratings.
        P(A) = 1 / (1 + 10^((Rb - Ra) / 400))
        """
        # Adjust for home court
        home_elo_adjusted = home_elo + self.HOME_ADVANTAGE_ELO
        
        prob_home = 1 / (1 + 10 ** ((away_elo - home_elo_adjusted) / 400))
        return prob_home

    def calculate_record_win_prob(self, record: str) -> float:
        """Convert '12-4' record string to win probability"""
        if not record or '-' not in record:
            return 0.5
        try:
            wins, losses = map(int, record.split('-'))
            total = wins + losses
            if total == 0:
                return 0.5
            return wins / total
        except ValueError:
            return 0.5

    def calculate_odds_implied_prob(self, spread_str: str) -> Optional[float]:
        """
        Convert spread like 'BOS -5.5' to implied win probability.
        Rule of thumb: -1 point ~ 3% advantage from 50%.
        """
        if not spread_str or spread_str == 'N/A':
            return None
            
        try:
            # Extract the number part, e.g. "-5.5" from "BOS -5.5"
            # Sometimes it might be just "-5.5" or "Team -5.5"
            parts = spread_str.split()
            spread_val = float(parts[-1])
            
            # If spread is negative for home team (or the team listed), they are favored.
            # But here we need to know if the spread is for Home or Away.
            # We will assume the input string is "FavTeam -X" or just "-X" relative to one team.
            # For simplicity, let's assume the spread passed here is relative to the Home team (negative means home favored).
            # Actually, the ESPN API usually gives the line for the favorite.
            
            # Let's use a simplified heuristic:
            # If spread is negative (e.g. -5.5), prob > 0.5
            # Prob = 0.5 + (abs(spread) * 0.03)
            # Capped at 0.99
            
            # We need to know WHICH team is favored.
            # This is tricky with just a string. We will try to parse later in the pipeline
            # or return None if ambiguous.
            # For now, returning None to be safe unless we pass more context.
            return None 
        except:
            return None

    def calculate_volatility(self, home_stats: Dict, away_stats: Dict) -> str:
        """
        Estimate game volatility based on team styles.
        High scoring/fast pace teams -> High volatility.
        """
        # Placeholder logic
        return "MEDIUM"

    def generate_prediction(self, game: Dict, home_stats: Dict, away_stats: Dict, kalshi_markets: Optional[Dict]) -> Dict:
        """
        Generate a comprehensive prediction for a game using 2.0 logic.
        kalshi_markets is now a dict containing potentially 'home_market' and 'away_market'.
        """
        # 1. Statistical Model
        
        # Base Win Pct from Records
        home_record = game.get('home_record', '0-0')
        away_record = game.get('away_record', '0-0')
        
        home_win_pct = self.calculate_record_win_prob(home_record)
        away_win_pct = self.calculate_record_win_prob(away_record)
        
        # Adjust for home court (rough boost)
        # Normalize around 0.5 center based on the difference
        stat_prob = 0.5 + ((home_win_pct - away_win_pct) / 2) + 0.05
        stat_prob = max(0.1, min(0.9, stat_prob))
        
        # 2. Kalshi Signal
        home_kalshi_prob = 0.5
        # We don't necessarily need away_kalshi_prob for the calculation, but we want to return it.
        away_kalshi_prob = 0.5
        
        kalshi_confidence = "LOW"
        kalshi_price = 0
        kalshi_trend = "FLAT"
        volume = 0
        yes_bid = 0
        yes_ask = 100
        spread = 15
        
        # Extract probabilities from the matched market structure
        if kalshi_markets:
            m_type = kalshi_markets.get('type')
            
            if m_type == 'dual':
                home_m = kalshi_markets['home_market']
                away_m = kalshi_markets['away_market']
                home_kalshi_prob = home_m['prob']
                away_kalshi_prob = away_m['prob']
                
                # Use normalized prob as price equivalent (cents)
                kalshi_price = home_kalshi_prob * 100
                yes_bid = home_m.get('yes_bid', 0)
                yes_ask = home_m.get('yes_ask', 100)
                
                volume = home_m['volume'] + away_m['volume']
                # Avg spread?
                spread = ((home_m.get('yes_ask', 100) - home_m.get('yes_bid', 0)) + 
                          (away_m.get('yes_ask', 100) - away_m.get('yes_bid', 0))) / 2
                
            elif m_type == 'single_home':
                m = kalshi_markets['home_market']
                home_kalshi_prob = m['prob']
                away_kalshi_prob = 1.0 - home_kalshi_prob
                kalshi_price = home_kalshi_prob * 100
                yes_bid = m.get('yes_bid', 0)
                yes_ask = m.get('yes_ask', 100)
                volume = m['volume']
                spread = yes_ask - yes_bid
                
            elif m_type == 'single_away':
                m = kalshi_markets['away_market']
                away_kalshi_prob = m['prob']
                home_kalshi_prob = 1.0 - away_kalshi_prob
                kalshi_price = home_kalshi_prob * 100
                
                # Inverse prices for Home
                # If Away Bid is 40, Ask is 42.
                # Home Bid is 100 - 42 = 58.
                # Home Ask is 100 - 40 = 60.
                yes_bid = 100 - m.get('yes_ask', 100)
                yes_ask = 100 - m.get('yes_bid', 0)
                
                volume = m['volume']
                spread = m.get('yes_ask', 100) - m.get('yes_bid', 0)

            # Assess confidence
            if volume > 500 and spread <= 5:
                kalshi_confidence = "HIGH"
            elif volume > 100 and spread <= 15:
                kalshi_confidence = "MEDIUM"
                
            # Determine trend
            if home_kalshi_prob > 0.6:
                kalshi_trend = "UP"
            elif home_kalshi_prob < 0.4:
                kalshi_trend = "DOWN"
            
        # 3. Hybrid Calculation (using Home Prob)
        w_kalshi = self.WEIGHT_KALSHI
        w_stats = self.WEIGHT_STATS
        
        if kalshi_confidence == "HIGH":
            w_kalshi = 0.65
            w_stats = 0.25
        elif kalshi_confidence == "LOW":
            w_kalshi = 0.20
            w_stats = 0.60
            
        final_prob = (stat_prob * w_stats) + (home_kalshi_prob * w_kalshi) + (0.5 * (1 - w_kalshi - w_stats))
        
        # Recommendation Logic 2.0
        divergence = abs(stat_prob - home_kalshi_prob)
        recommendation = "Neutral"
        signal_strength = "WEAK"
        
        if divergence > 0.15:
            signal_strength = "STRONG"
            if home_kalshi_prob > stat_prob:
                recommendation = "Follow Market"
            else:
                recommendation = "Fade Market"
        elif divergence > 0.08:
            signal_strength = "MODERATE"
            if home_kalshi_prob > stat_prob:
                recommendation = "Lean Market"
            else:
                recommendation = "Lean Model"

        # 4. Advanced Analytics & Reasoning
        
        # Feature contributions (approximate for display)
        record_diff = home_win_pct - away_win_pct
        model_features = {
            "home_advantage": 0.05,
            "record_diff": round(record_diff / 2, 3),
            "recent_form": 0.0  # Placeholder
        }

        # Market pressure (0-100 scale)
        market_pressure = min(100, int((volume / 1000) * 20 + (15 - min(15, spread)) * 3))
        
        # Reasoning generation
        reasoning = []
        if divergence > 0.15:
            reasoning.append(f"Significant divergence ({int(divergence*100)}%) between model and market suggests a potential edge.")
        
        if kalshi_confidence == "HIGH":
            reasoning.append("High market liquidity indicates sharp money is active.")
        elif kalshi_confidence == "LOW":
            reasoning.append("Low market volume warrants caution despite model signal.")

        if home_win_pct > away_win_pct + 0.2:
            reasoning.append(f"Home team has a dominant record advantage.")
        elif away_win_pct > home_win_pct + 0.2:
            reasoning.append(f"Away team is significantly outperforming on the season.")

        if kalshi_trend == "UP":
            reasoning.append("Market sentiment is trending towards the Home team.")
        
        analytics = {
            "volatility_score": self.calculate_volatility({}, {}), # Reuse for now
            "stat_divergence": round(divergence, 2),
            "market_pressure": market_pressure,
            "model_features": model_features,
            "reasoning": reasoning
        }

        return {
            "game_id": game.get('game_id'),
            "league": game.get('league', 'nba'),
            "home_team": game.get('home_team_name'),
            "away_team": game.get('away_team_name'),
            "home_abbr": game.get('home_team_abbrev'),
            "away_abbr": game.get('away_team_abbrev'),
            "game_date": game.get('game_date'),
            "status": game.get('status'),
            "prediction": {
                "home_win_prob": round(final_prob, 2),
                "stat_model_prob": round(stat_prob, 2),
                "kalshi_prob": round(home_kalshi_prob, 2),
                "home_kalshi_prob": round(home_kalshi_prob, 2),
                "away_kalshi_prob": round(away_kalshi_prob, 2),
                "confidence_score": kalshi_confidence,
                "recommendation": recommendation,
                "signal_strength": signal_strength,
                "divergence": round(divergence, 2),
                "volatility": self.calculate_volatility({}, {})
            },
            "analytics": analytics,
            "factors": {
                "home_record": home_record,
                "away_record": away_record,
                "market_volume": volume,
                "market_trend": kalshi_trend
            },
            "market_data": {
                "price": kalshi_price,
                "yes_bid": yes_bid,
                "yes_ask": yes_ask,
                "volume": volume
            }
        }
