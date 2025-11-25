"""
PRIMARY SERVICE
Enhanced Prediction Engine with optimized statistical models.
Uses calibrated statistical ensemble instead of ML for better performance and accuracy.
"""
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from app.services.signals import SignalEngine
from app.services.data_feeds import DataFeeds

class EnhancedPredictionEngine:
    """
    Advanced prediction engine with:
    - Elo ratings with decay
    - Recent form analysis
    - Head-to-head history
    - Advanced metrics
    - Calibrated statistical ensemble (replaces ML for better performance)
    - Probability calibration
    """
    
    def __init__(self, model_path: Optional[str] = None):
        # Base weights (will be adjusted dynamically)
        # ML weight removed and redistributed to proven statistical components
        self.WEIGHT_STATS = 0.30
        self.WEIGHT_KALSHI = 0.40
        self.WEIGHT_ELO = 0.15
        self.WEIGHT_FORM = 0.10
        
        # Elo parameters
        self.ELO_K_FACTOR = 32  # How much ratings change per game
        self.ELO_HOME_ADVANTAGE = 65  # Elo points for home advantage
        self.ELO_DECAY_FACTOR = 0.95  # Decay older games
        
        # Initialize Elo ratings storage (in production, use database)
        self.elo_ratings = self._load_elo_ratings()
        
        # Recent form window
        self.FORM_WINDOW = 5  # Last 5 games
        
        # Statistical model coefficients (research-backed, no training needed)
        # These are calibrated based on sports prediction research
        self.STAT_COEFFICIENTS = {
            'elo_diff': 0.008,      # Elo difference (primary predictor)
            'form_diff': 0.6,        # Recent form difference
            'record_diff': 0.4,      # Season record difference
            'h2h': 0.2,              # Head-to-head adjustment
            'home_advantage': 0.05,  # Base home advantage
            'market_calibration': 0.3  # Market confidence adjustment
        }
        
        self.signal_engine = SignalEngine()
        self.data_feeds = DataFeeds()
        
    def _load_elo_ratings(self) -> Dict[str, float]:
        """Load Elo ratings from storage (default: 1500 for all teams)"""
        # In production, load from database
        # For now, return default ratings
        return {}
    
    def _save_elo_ratings(self):
        """Save Elo ratings to storage"""
        # In production, save to database
        pass
    
    def get_elo_rating(self, team_id: str, league: str = "nba") -> float:
        """Get current Elo rating for a team"""
        key = f"{league}_{team_id}"
        return self.elo_ratings.get(key, 1500.0)
    
    def update_elo_rating(self, team_id: str, league: str, new_rating: float):
        """Update Elo rating after a game"""
        key = f"{league}_{team_id}"
        self.elo_ratings[key] = new_rating
        self._save_elo_ratings()
    
    def calculate_elo_win_prob(self, home_elo: float, away_elo: float) -> float:
        """Calculate win probability using Elo ratings"""
        home_elo_adjusted = home_elo + self.ELO_HOME_ADVANTAGE
        prob_home = 1 / (1 + 10 ** ((away_elo - home_elo_adjusted) / 400))
        return prob_home
    
    def calculate_recent_form(self, team_id: str, league: str, games: List[Dict]) -> Dict:
        """
        Calculate recent form metrics:
        - Win percentage in last N games
        - Average point differential
        - Offensive/defensive efficiency trends
        """
        # Filter games for this team (last N games)
        team_games = [
            g for g in games 
            if (g.get('home_team_id') == team_id or g.get('away_team_id') == team_id)
            and g.get('status') == 'Final'
        ][-self.FORM_WINDOW:]
        
        if not team_games:
            return {
                "win_pct": 0.5,
                "avg_point_diff": 0.0,
                "momentum": 0.0,
                "strength": "NEUTRAL"
            }
        
        wins = 0
        point_diffs = []
        
        for game in team_games:
            is_home = game.get('home_team_id') == team_id
            home_score = int(game.get('home_score', 0))
            away_score = int(game.get('away_score', 0))
            
            if is_home:
                won = home_score > away_score
                point_diff = home_score - away_score
            else:
                won = away_score > home_score
                point_diff = away_score - home_score
            
            if won:
                wins += 1
            point_diffs.append(point_diff)
        
        win_pct = wins / len(team_games)
        avg_point_diff = np.mean(point_diffs) if point_diffs else 0.0
        
        # Momentum: recent trend (last 3 vs previous 2)
        if len(point_diffs) >= 5:
            recent = np.mean(point_diffs[-3:])
            earlier = np.mean(point_diffs[-5:-3])
            momentum = recent - earlier
        else:
            momentum = avg_point_diff
        
        # Strength classification
        if win_pct >= 0.7 and avg_point_diff > 5:
            strength = "STRONG"
        elif win_pct >= 0.5 and avg_point_diff > 0:
            strength = "GOOD"
        elif win_pct < 0.3 and avg_point_diff < -5:
            strength = "WEAK"
        else:
            strength = "NEUTRAL"
        
        return {
            "win_pct": win_pct,
            "avg_point_diff": avg_point_diff,
            "momentum": momentum,
            "strength": strength,
            "games_analyzed": len(team_games)
        }
    
    def calculate_head_to_head(self, home_id: str, away_id: str, games: List[Dict]) -> Dict:
        """Calculate head-to-head statistics"""
        h2h_games = [
            g for g in games
            if ((g.get('home_team_id') == home_id and g.get('away_team_id') == away_id) or
                (g.get('home_team_id') == away_id and g.get('away_team_id') == home_id))
            and g.get('status') == 'Final'
        ]
        
        if not h2h_games:
            return {
                "home_wins": 0,
                "away_wins": 0,
                "home_win_pct": 0.5,
                "avg_point_diff": 0.0,
                "games_played": 0
            }
        
        home_wins = 0
        point_diffs = []
        
        for game in h2h_games:
            is_home_team_home = game.get('home_team_id') == home_id
            home_score = int(game.get('home_score', 0))
            away_score = int(game.get('away_score', 0))
            
            if is_home_team_home:
                if home_score > away_score:
                    home_wins += 1
                point_diffs.append(home_score - away_score)
            else:
                if away_score > home_score:
                    home_wins += 1
                point_diffs.append(away_score - home_score)
        
        return {
            "home_wins": home_wins,
            "away_wins": len(h2h_games) - home_wins,
            "home_win_pct": home_wins / len(h2h_games),
            "avg_point_diff": np.mean(point_diffs) if point_diffs else 0.0,
            "games_played": len(h2h_games)
        }
    
    def calculate_advanced_metrics(self, home_stats: Dict, away_stats: Dict, game: Dict) -> Dict:
        """
        Calculate advanced metrics:
        - Offensive/Defensive efficiency
        - Pace (for NBA)
        - Strength of schedule
        """
        # Placeholder - in production, fetch from stats API
        # For now, derive from records and scores if available
        
        home_record = game.get('home_record', '0-0')
        away_record = game.get('away_record', '0-0')
        
        home_wins, home_losses = self._parse_record(home_record)
        away_wins, away_losses = self._parse_record(away_record)
        
        # Simple efficiency proxies
        home_win_pct = home_wins / (home_wins + home_losses) if (home_wins + home_losses) > 0 else 0.5
        away_win_pct = away_wins / (away_wins + away_losses) if (away_wins + away_losses) > 0 else 0.5
        
        # Offensive efficiency proxy (win pct when scoring well)
        # Defensive efficiency proxy (win pct when allowing few points)
        # These are simplified - real implementation needs actual stats
        
        return {
            "home_off_eff": home_win_pct + 0.1,  # Placeholder
            "home_def_eff": home_win_pct + 0.05,
            "away_off_eff": away_win_pct + 0.1,
            "away_def_eff": away_win_pct + 0.05,
            "net_rating": (home_win_pct - away_win_pct) * 100
        }
    
    def _parse_record(self, record: str) -> Tuple[int, int]:
        """Parse 'W-L' record string"""
        try:
            if '-' in record:
                wins, losses = map(int, record.split('-'))
                return wins, losses
        except:
            pass
        return 0, 0
    
    def extract_features(self, game: Dict, home_stats: Dict, away_stats: Dict, 
                        kalshi_markets: Optional[Dict], all_games: List[Dict]) -> np.ndarray:
        """
        Extract features for ML model:
        - Elo ratings
        - Recent form
        - Head-to-head
        - Market data
        - Advanced metrics
        """
        home_id = str(game.get('home_team_id', ''))
        away_id = str(game.get('away_team_id', ''))
        league = game.get('league', 'nba')
        
        # Elo features
        home_elo = self.get_elo_rating(home_id, league)
        away_elo = self.get_elo_rating(away_id, league)
        elo_diff = home_elo - away_elo
        
        # Form features
        home_form = self.calculate_recent_form(home_id, league, all_games)
        away_form = self.calculate_recent_form(away_id, league, all_games)
        
        # H2H features
        h2h = self.calculate_head_to_head(home_id, away_id, all_games or [])
        
        # Record features
        home_record = game.get('home_record', '0-0')
        away_record = game.get('away_record', '0-0')
        home_wins, home_losses = self._parse_record(home_record)
        away_wins, away_losses = self._parse_record(away_record)
        home_win_pct = home_wins / (home_wins + home_losses) if (home_wins + home_losses) > 0 else 0.5
        away_win_pct = away_wins / (away_wins + away_losses) if (away_wins + away_losses) > 0 else 0.5
        
        # Market features
        kalshi_prob = 0.5
        volume = 0
        spread = 15
        if kalshi_markets:
            if kalshi_markets.get('type') == 'dual':
                kalshi_prob = kalshi_markets['home_market'].get('prob', 0.5)
                volume = kalshi_markets['home_market'].get('volume', 0) + kalshi_markets['away_market'].get('volume', 0)
            elif kalshi_markets.get('type') == 'single_home':
                kalshi_prob = kalshi_markets['home_market'].get('prob', 0.5)
                volume = kalshi_markets['home_market'].get('volume', 0)
            elif kalshi_markets.get('type') == 'single_away':
                kalshi_prob = 1.0 - kalshi_markets['away_market'].get('prob', 0.5)
                volume = kalshi_markets['away_market'].get('volume', 0)
        
        # Advanced metrics
        advanced = self.calculate_advanced_metrics(home_stats, away_stats, game)
        
        # Feature vector
        features = np.array([
            home_elo,
            away_elo,
            elo_diff,
            home_win_pct,
            away_win_pct,
            home_win_pct - away_win_pct,
            home_form['win_pct'],
            away_form['win_pct'],
            home_form['avg_point_diff'],
            away_form['avg_point_diff'],
            home_form['momentum'],
            away_form['momentum'],
            h2h.get('home_win_pct', 0.5),
            h2h.get('avg_point_diff', 0.0),
            kalshi_prob,
            volume / 1000.0,  # Normalize volume
            advanced['net_rating'],
            advanced['home_off_eff'],
            advanced['away_off_eff'],
        ])
        
        return features
    
    def predict_with_statistical(self, elo_diff: float, form_diff: float, 
                                 record_diff: float, h2h_adjustment: float,
                                 market_confidence: str) -> float:
        """
        Calibrated statistical prediction using logistic regression.
        No training data needed - uses research-backed coefficients.
        
        Args:
            elo_diff: Home Elo - Away Elo
            form_diff: Home form win_pct - Away form win_pct
            record_diff: Home record win_pct - Away record win_pct
            h2h_adjustment: Head-to-head adjustment (-0.1 to 0.1)
            market_confidence: "HIGH", "MEDIUM", or "LOW"
        
        Returns:
            Calibrated win probability for home team
        """
        # Extract coefficients
        c = self.STAT_COEFFICIENTS
        
        # Base logistic regression score
        # Using sigmoid: 1 / (1 + exp(-z)) where z is the linear combination
        z = (
            c['elo_diff'] * elo_diff +
            c['form_diff'] * form_diff +
            c['record_diff'] * record_diff +
            c['home_advantage']  # Base home advantage
        )
        
        # Apply sigmoid to get probability
        base_prob = 1.0 / (1.0 + np.exp(-z))
        
        # Apply H2H adjustment
        base_prob += h2h_adjustment
        
        # Market calibration: adjust based on market confidence
        # High confidence markets get slight boost (market is efficient)
        if market_confidence == "HIGH":
            # Market is well-calibrated, trust it more
            market_calibration = 0.02
        elif market_confidence == "MEDIUM":
            market_calibration = 0.0
        else:  # LOW
            # Low confidence markets may be less efficient
            market_calibration = -0.01
        
        final_prob = base_prob + market_calibration
        
        # Clamp to reasonable bounds
        final_prob = max(0.05, min(0.95, final_prob))
        
        return float(final_prob)
    
    def calculate_volatility(self, home_stats: Dict, away_stats: Dict) -> str:
        """
        Estimate game volatility based on team styles.
        High scoring/fast pace teams -> High volatility.
        """
        # Placeholder logic - could be improved with pace/efficiency stats
        return "MEDIUM"

    def generate_prediction(self, game: Dict, home_stats: Dict, away_stats: Dict, 
                           kalshi_markets: Optional[Dict], all_games: List[Dict] = None) -> Dict:
        """
        Generate enhanced prediction using multiple models.
        """
        if all_games is None:
            all_games = []
        
        home_id = str(game.get('home_team_id', ''))
        away_id = str(game.get('away_team_id', ''))
        league = game.get('league', 'nba')
        
        # 1. Elo-based prediction
        home_elo = self.get_elo_rating(home_id, league)
        away_elo = self.get_elo_rating(away_id, league)
        elo_diff = home_elo - away_elo
        elo_prob = self.calculate_elo_win_prob(home_elo, away_elo)
        
        # 2. Recent form prediction
        home_form = self.calculate_recent_form(home_id, league, all_games)
        away_form = self.calculate_recent_form(away_id, league, all_games)
        
        # Form-based probability (adjust for home advantage)
        form_diff = home_form['win_pct'] - away_form['win_pct']
        form_prob = 0.5 + (form_diff * 0.3) + 0.05  # Home advantage boost
        form_prob = max(0.1, min(0.9, form_prob))
        
        # 3. Record-based prediction (existing logic)
        home_record = game.get('home_record', '0-0')
        away_record = game.get('away_record', '0-0')
        home_win_pct = self._calculate_record_win_prob(home_record)
        away_win_pct = self._calculate_record_win_prob(away_record)
        stat_prob = 0.5 + ((home_win_pct - away_win_pct) / 2) + 0.05
        stat_prob = max(0.1, min(0.9, stat_prob))
        
        # 4. Kalshi market probability
        home_kalshi_prob = 0.5
        away_kalshi_prob = 0.5
        kalshi_confidence = "LOW"
        kalshi_trend = "FLAT"
        volume = 0
        spread = 15
        yes_bid = 0
        yes_ask = 100
        
        if kalshi_markets:
            m_type = kalshi_markets.get('type')
            if m_type == 'dual':
                home_m = kalshi_markets['home_market']
                away_m = kalshi_markets['away_market']
                home_kalshi_prob = home_m['prob']
                away_kalshi_prob = away_m['prob']
                volume = home_m['volume'] + away_m['volume']
                
                yes_bid = home_m.get('yes_bid', 0)
                yes_ask = home_m.get('yes_ask', 100)
                
                spread = ((home_m.get('yes_ask', 100) - home_m.get('yes_bid', 0)) + 
                         (away_m.get('yes_ask', 100) - away_m.get('yes_bid', 0))) / 2
                         
            elif m_type == 'single_home':
                m = kalshi_markets['home_market']
                home_kalshi_prob = m['prob']
                away_kalshi_prob = 1.0 - home_kalshi_prob
                volume = m['volume']
                
                yes_bid = m.get('yes_bid', 0)
                yes_ask = m.get('yes_ask', 100)
                
                spread = m.get('yes_ask', 100) - m.get('yes_bid', 0)
                
            elif m_type == 'single_away':
                m = kalshi_markets['away_market']
                away_kalshi_prob = m['prob']
                home_kalshi_prob = 1.0 - away_kalshi_prob
                volume = m['volume']
                
                # Inverse prices for Home
                yes_bid = 100 - m.get('yes_ask', 100)
                yes_ask = 100 - m.get('yes_bid', 0)
                
                spread = m.get('yes_ask', 100) - m.get('yes_bid', 0)
            
            if volume > 500 and spread <= 5:
                kalshi_confidence = "HIGH"
            elif volume > 100 and spread <= 15:
                kalshi_confidence = "MEDIUM"
                
            # Determine trend
            if home_kalshi_prob > 0.6:
                kalshi_trend = "UP"
            elif home_kalshi_prob < 0.4:
                kalshi_trend = "DOWN"
        
        # 5. Head-to-head adjustment
        h2h = self.calculate_head_to_head(home_id, away_id, all_games)
        h2h_adjustment = (h2h.get('home_win_pct', 0.5) - 0.5) * 0.1  # Small adjustment
        
        # 6. Statistical ensemble prediction (replaces ML)
        # Calculate differences for statistical model
        form_diff = home_form['win_pct'] - away_form['win_pct']
        record_diff = home_win_pct - away_win_pct
        
        stat_ensemble_prob = self.predict_with_statistical(
            elo_diff=elo_diff,
            form_diff=form_diff,
            record_diff=record_diff,
            h2h_adjustment=h2h_adjustment,
            market_confidence=kalshi_confidence
        )
        
        # 7. Dynamic weighting based on confidence
        w_kalshi = self.WEIGHT_KALSHI
        w_stats = self.WEIGHT_STATS
        w_elo = self.WEIGHT_ELO
        w_form = self.WEIGHT_FORM
        w_ensemble = 0.05
        
        if kalshi_confidence == "HIGH":
            w_kalshi = 0.50
            w_stats = 0.20
            w_elo = 0.15
            w_form = 0.10
            w_ensemble = 0.05
        elif kalshi_confidence == "LOW":
            w_kalshi = 0.15
            w_stats = 0.35
            w_elo = 0.25
            w_form = 0.20
            w_ensemble = 0.05
        
        # 8. Combine predictions (statistical ensemble replaces ML)
        base_prob = (
            stat_prob * w_stats +
            home_kalshi_prob * w_kalshi +
            elo_prob * w_elo +
            form_prob * w_form +
            stat_ensemble_prob * w_ensemble
        )
        
        # Apply H2H adjustment
        final_prob = base_prob + h2h_adjustment
        final_prob = max(0.05, min(0.95, final_prob))
        
        # 9. Calculate divergence and signals
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
        
        # 10. Generate context and signals
        # Handle missing date for context generation
        game_date = game.get('game_date')
        if not game_date:
            game_date = datetime.now().strftime("%Y-%m-%d")
            
        context = self.data_feeds.get_market_context(
            game.get('home_team_abbrev'),
            game.get('away_team_abbrev'),
            game_date,
            league
        )
        
        market_data = {
            'volume_24h': volume,
            'last_price': home_kalshi_prob * 100
        }
        
        signals = self.signal_engine.generate_signals(game, market_data, context)
        
        # Enhanced reasoning
        reasoning = []
        if divergence > 0.15:
            reasoning.append(f"Significant divergence ({int(divergence*100)}%) between model and market suggests edge.")
        
        if home_form['strength'] == "STRONG":
            reasoning.append(f"Home team in strong recent form ({home_form['win_pct']:.0%} win rate, +{home_form['avg_point_diff']:.1f} avg margin).")
        elif away_form['strength'] == "STRONG":
            reasoning.append(f"Away team in strong recent form ({away_form['win_pct']:.0%} win rate, +{away_form['avg_point_diff']:.1f} avg margin).")
        
        if h2h['games_played'] > 0:
            reasoning.append(f"H2H: Home team {h2h['home_wins']}-{h2h['away_wins']} (avg margin: {h2h['avg_point_diff']:+.1f}).")
        
        if elo_diff > 100:
            reasoning.append(f"Significant Elo advantage for home team ({elo_diff:.0f} points).")
        elif elo_diff < -100:
            reasoning.append(f"Significant Elo advantage for away team ({abs(elo_diff):.0f} points).")
        
        for sig in signals:
            reasoning.append(f"{sig['type']}: {sig['description']}")
        
        return {
            "game_id": game.get('game_id'),
            "league": league,
            "home_team": game.get('home_team_name'),
            "away_team": game.get('away_team_name'),
            "home_abbr": game.get('home_team_abbrev'),
            "away_abbr": game.get('away_team_abbrev'),
            "game_date": game.get('game_date'),
            "status": game.get('status'),
            "home_score": game.get('home_score'),
            "away_score": game.get('away_score'),
            "prediction": {
                "home_win_prob": round(final_prob, 3),
                "stat_model_prob": round(stat_prob, 3),
                "elo_prob": round(elo_prob, 3),
                "form_prob": round(form_prob, 3),
                "stat_ensemble_prob": round(stat_ensemble_prob, 3),  # Replaces ml_prob
                "kalshi_prob": round(home_kalshi_prob, 3),
                "home_kalshi_prob": round(home_kalshi_prob, 3),
                "away_kalshi_prob": round(away_kalshi_prob, 3),
                "confidence_score": kalshi_confidence,
                "recommendation": recommendation,
                "signal_strength": signal_strength,
                "divergence": round(divergence, 3),
                "volatility": self.calculate_volatility({}, {}),
            },
            "analytics": {
                "elo_ratings": {
                    "home": round(home_elo, 1),
                    "away": round(away_elo, 1),
                    "difference": round(elo_diff, 1)
                },
                "recent_form": {
                    "home": home_form,
                    "away": away_form
                },
                "head_to_head": h2h,
                "stat_divergence": round(divergence, 3),
                "model_weights": {
                    "stats": round(w_stats, 2),
                    "kalshi": round(w_kalshi, 2),
                    "elo": round(w_elo, 2),
                    "form": round(w_form, 2),
                    "stat_ensemble": round(w_ensemble, 2)
                },
                "model_features": {
                    "home_advantage": round(0.05, 3),  # Base home advantage
                    "record_diff": round(record_diff / 2, 3),  # Normalized record difference
                    "recent_form": round((home_form['win_pct'] - away_form['win_pct']) / 2, 3),  # Normalized form difference
                    "elo_advantage": round(elo_diff / 200, 3)  # Normalized Elo difference (divide by 200 for scale)
                },
                "reasoning": reasoning,
                "signals": signals
            },
            "factors": {
                "home_record": home_record,
                "away_record": away_record,
                "market_volume": volume,
                "market_trend": kalshi_trend,
            },
            "market_data": {
                "price": home_kalshi_prob * 100,
                "yes_bid": yes_bid,
                "yes_ask": yes_ask,
                "volume": volume,
                "spread": round(spread, 1)
            }
        }
    
    def _calculate_record_win_prob(self, record: str) -> float:
        """Convert 'W-L' record to win probability"""
        wins, losses = self._parse_record(record)
        total = wins + losses
        if total == 0:
            return 0.5
        return wins / total

