"""
PRIMARY SERVICE
Enhanced Prediction Engine with highly accurate statistical models.
Uses multi-factor ensemble approach with:
- Weighted Elo ratings with home advantage and decay
- Recent form analysis with momentum tracking
- Season record evaluation with strength of schedule consideration
- Market-informed calibration
- Head-to-head historical performance

The stat_model_prob is the core prediction shown to users in the 'Model' section.
"""
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
import math
from datetime import datetime, timedelta
import os
from app.services.enhanced_signals import EnhancedSignalEngine
from app.services.enhanced_data_feeds import EnhancedDataFeeds
from app.services.elo_manager import EloManager
from app.services.historical_data import historical_service
import logging

logger = logging.getLogger(__name__)

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
        # Base weights for final ensemble (will be adjusted dynamically)
        # ML weight removed and redistributed to proven statistical components
        self.WEIGHT_STATS = 0.30  # Core statistical model weight in final prediction
        self.WEIGHT_KALSHI = 0.40  # Market probability weight
        self.WEIGHT_ELO = 0.15     # Pure Elo model weight
        self.WEIGHT_FORM = 0.10    # Recent form weight
        
        # Weights for the stat_model_prob itself (what users see as 'Model')
        # This is the core statistical prediction before market blending
        # These will be loaded from calibration file if available
        self.STAT_ELO_WEIGHT = 0.40      # Elo is the strongest predictor
        self.STAT_FORM_WEIGHT = 0.20     # Recent form is highly predictive
        self.STAT_RECORD_WEIGHT = 0.15   # Season record provides context
        self.STAT_H2H_WEIGHT = 0.10      # Head-to-head adds edge
        self.STAT_INJURY_WEIGHT = 0.15   # Injury impact
        
        # Load optimized weights if available
        self._load_optimized_weights()
        
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
            'market_calibration': 0.3,  # Market confidence adjustment
            'rest_penalty': 0.03,    # Penalty for back-to-back/short rest
            'travel_penalty': 0.02   # Penalty for long travel/time zones
        }
        
        self.signal_engine = EnhancedSignalEngine()
        self.data_feeds = EnhancedDataFeeds()
        
        # Initialize Elo Manager with real historical data
        self.elo_manager = EloManager()
        
    def get_elo_rating(self, team_id: str, league: str = "nba") -> float:
        """Get current Elo rating for a team"""
        return self.elo_manager.get_rating(str(team_id), league)
    
    def update_elo_rating(self, team_id: str, league: str, new_rating: float):
        """Update Elo rating after a game (handled by EloManager)"""
        # This is now handled by elo_manager.update_with_game_result()
        pass
    
    def calculate_elo_win_prob(self, home_elo: float, away_elo: float, league: str = 'nba') -> float:
        """Calculate win probability using Elo ratings"""
        # Different home advantages for different sports
        # NBA: ~3-4% edge (65 Elo points)
        # NFL: ~2.5-3% edge (55 Elo points)
        home_advantage = 65 if league == 'nba' else 55
        home_elo_adjusted = home_elo + home_advantage
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
    
    def calculate_rest_days(self, team_id: str, current_date: datetime, all_games: List[Dict]) -> int:
        """Calculate days of rest before the current game"""
        # Filter games for this team
        team_games = [
            g for g in all_games 
            if (str(g.get('home_team_id')) == str(team_id) or str(g.get('away_team_id')) == str(team_id))
            and 'Final' in g.get('status', '')
        ]
        
        # Sort by date descending
        team_games.sort(key=lambda x: x.get('game_date', ''), reverse=True)
        
        # Find last game before current_date
        last_game_date = None
        for g in team_games:
            g_date_str = g.get('game_date')
            if not g_date_str:
                continue
            try:
                g_date = datetime.fromisoformat(g_date_str.replace("Z", ""))
                if g_date.date() < current_date.date():
                    last_game_date = g_date
                    break
            except:
                continue
                
        if not last_game_date:
            return 7  # Assume well rested if no history
            
        delta = current_date.date() - last_game_date.date()
        return delta.days

    def calculate_travel_impact(self, home_abbr: str, away_abbr: str, game_date: datetime, league: str) -> Dict:
        """
        Calculate travel impact based on distance and time zones.
        Returns a probability adjustment (negative means away team is disadvantaged).
        """
        if not home_abbr or not away_abbr:
            return {"impact": 0.0, "description": "", "distance_km": 0, "time_zone_shift": 0}
            
        locations = self.data_feeds.team_locations
        
        # Normalize abbreviations
        home_norm = self.data_feeds._normalize_team_name(home_abbr, league)
        away_norm = self.data_feeds._normalize_team_name(away_abbr, league)
        
        home_loc = locations.get(home_norm)
        away_loc = locations.get(away_norm)
        
        if not home_loc or not away_loc:
            return {"impact": 0.0, "description": "", "distance_km": 0, "time_zone_shift": 0}
            
        # Calculate distance (Haversine)
        import math
        R = 6371  # Earth radius in km
        dlat = math.radians(away_loc['lat'] - home_loc['lat'])
        dlon = math.radians(away_loc['lon'] - home_loc['lon'])
        a = math.sin(dlat/2) * math.sin(dlat/2) + \
            math.cos(math.radians(home_loc['lat'])) * math.cos(math.radians(away_loc['lat'])) * \
            math.sin(dlon/2) * math.sin(dlon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance_km = R * c
        
        # Calculate time zone diff (approximate)
        # 15 degrees longitude = 1 hour
        tz_diff = (away_loc['lon'] - home_loc['lon']) / 15.0
        
        impact = 0.0
        reasons = []
        
        # Distance penalty
        if distance_km > 3000: # Cross country
            impact -= 0.02
            reasons.append(f"Long travel ({int(distance_km)}km)")
        elif distance_km > 1500:
            impact -= 0.01
            
        # Time zone penalty (Body clock)
        # If West coast team plays early on East coast
        # Game time is usually evening, but let's check for large shifts
        if abs(tz_diff) >= 2.5:
            impact -= 0.015
            reasons.append(f"Time zone shift ({int(abs(tz_diff))}h)")
            
        # Specific check for "West Coast team playing early East Coast game"
        # Assuming game_date has time. If it's before 2 PM ET (19:00 UTC approx) and away is West
        # This is a bit complex without precise game time, so we'll stick to general TZ shift
        
        return {
            "impact": impact,
            "description": ", ".join(reasons) if reasons else "Normal travel",
            "distance_km": int(distance_km),
            "time_zone_shift": round(tz_diff, 1)
        }
    
    def _load_optimized_weights(self):
        """Load calibrated weights from disk if available."""
        import json
        import logging
        
        logger = logging.getLogger(__name__)
        weights_file = os.path.join("data", "model_weights.json")
        
        if os.path.exists(weights_file):
            try:
                with open(weights_file, 'r') as f:
                    data = json.load(f)
                    weights = data.get('current_weights', {})
                    
                    # Update weights if they exist
                    if weights:
                        self.STAT_ELO_WEIGHT = weights.get('STAT_ELO_WEIGHT', self.STAT_ELO_WEIGHT)
                        self.STAT_FORM_WEIGHT = weights.get('STAT_FORM_WEIGHT', self.STAT_FORM_WEIGHT)
                        self.STAT_RECORD_WEIGHT = weights.get('STAT_RECORD_WEIGHT', self.STAT_RECORD_WEIGHT)
                        self.STAT_H2H_WEIGHT = weights.get('STAT_H2H_WEIGHT', self.STAT_H2H_WEIGHT)
                        self.STAT_INJURY_WEIGHT = weights.get('STAT_INJURY_WEIGHT', self.STAT_INJURY_WEIGHT)
                        
                        logger.info(f"Loaded calibrated weights from {weights_file}")
            except Exception as e:
                logger.warning(f"Could not load calibrated weights: {e}")
    
    def apply_weight_adjustments(self, adjustments: Dict[str, float]):
        """
        Apply weight adjustments from calibration.
        
        Args:
            adjustments: Dictionary of weight adjustments
        """
        for key, value in adjustments.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def save_current_weights(self):
        """Save current weights to disk."""
        import json
        import logging
        
        logger = logging.getLogger(__name__)
        weights_file = os.path.join("data", "model_weights.json")
        
        weights = {
            'STAT_ELO_WEIGHT': self.STAT_ELO_WEIGHT,
            'STAT_FORM_WEIGHT': self.STAT_FORM_WEIGHT,
            'STAT_RECORD_WEIGHT': self.STAT_RECORD_WEIGHT,
            'STAT_H2H_WEIGHT': self.STAT_H2H_WEIGHT,
            'STAT_INJURY_WEIGHT': self.STAT_INJURY_WEIGHT
        }
        
        try:
            os.makedirs("data", exist_ok=True)
            
            # Load existing data if available
            if os.path.exists(weights_file):
                with open(weights_file, 'r') as f:
                    data = json.load(f)
            else:
                data = {'calibration_history': [], 'component_accuracy': {}}
            
            data['current_weights'] = weights
            data['last_updated'] = datetime.now().isoformat()
            
            with open(weights_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"Saved current weights to {weights_file}")
        except Exception as e:
            logger.error(f"Error saving weights: {e}")
    
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
    
    def _calculate_pythagorean_win_pct(self, points_for: float, points_against: float, league: str) -> float:
        """
        Calculate Pythagorean Expectation for win percentage.
        Formula: PF^exp / (PF^exp + PA^exp)
        """
        if points_for == 0 and points_against == 0:
            return 0.5
            
        # Exponents based on sports analytics research
        exponent = 13.91 if league == 'nba' else 2.37
        
        numerator = points_for ** exponent
        denominator = numerator + (points_against ** exponent)
        
        if denominator == 0:
            return 0.5
            
        return numerator / denominator

    def _calculate_log5_prob(self, p_a: float, p_b: float) -> float:
        """
        Calculate win probability using Bill James' Log5 method.
        P(A wins) = (Pa - Pa*Pb) / (Pa + Pb - 2*Pa*Pb)
        """
        # Avoid division by zero or invalid probabilities
        p_a = max(0.01, min(0.99, p_a))
        p_b = max(0.01, min(0.99, p_b))
        
        numerator = p_a - (p_a * p_b)
        denominator = p_a + p_b - (2 * p_a * p_b)
        
        if denominator == 0:
            return 0.5
            
        return numerator / denominator

    def calculate_season_stats(self, team_id: str, league: str, all_games: List[Dict]) -> Dict:
        """Calculate full season statistics including Pythagorean Expectation"""
        team_games = [
            g for g in all_games 
            if (str(g.get('home_team_id')) == str(team_id) or str(g.get('away_team_id')) == str(team_id))
            and 'Final' in g.get('status', '')
        ]
        
        if not team_games:
            return {
                "points_for": 0,
                "points_against": 0,
                "pythagorean_win_pct": 0.5,
                "games_played": 0
            }
            
        points_for = 0
        points_against = 0
        
        for g in team_games:
            is_home = str(g.get('home_team_id')) == str(team_id)
            home_score = int(g.get('home_score', 0))
            away_score = int(g.get('away_score', 0))
            
            if is_home:
                points_for += home_score
                points_against += away_score
            else:
                points_for += away_score
                points_against += home_score
                
        pyth_win_pct = self._calculate_pythagorean_win_pct(points_for, points_against, league)
        
        return {
            "points_for": points_for,
            "points_against": points_against,
            "pythagorean_win_pct": pyth_win_pct,
            "games_played": len(team_games)
        }

    def calculate_volatility(self, home_stats: Dict, away_stats: Dict) -> str:
        """
        Estimate game volatility based on team styles.
        High scoring/fast pace teams -> High volatility.
        """
        # Placeholder logic - could be improved with pace/efficiency stats
        return "MEDIUM"

    def generate_prediction(self, game: Dict, home_stats: Dict, away_stats: Dict, 
                           kalshi_markets: Optional[Dict], all_games: List[Dict] = None, include_intelligence: bool = True) -> Dict:
        """
        Generate enhanced prediction using multiple models.
        """
        if all_games is None:
            all_games = []
            
        home_id = str(game.get('home_team_id', ''))
        away_id = str(game.get('away_team_id', ''))
        league = game.get('league', 'nba')
        home_abbr = game.get('home_team_abbrev')
        away_abbr = game.get('away_team_abbrev')
            
        # Add historical games from EloManager for form calculation
        historical_games = self.elo_manager.get_historical_games(league)
        # Combine lists (historical first, then current/upcoming)
        full_games_list = historical_games + all_games
        
        # 1. Elo-based prediction
        home_elo = self.get_elo_rating(home_id, league)
        away_elo = self.get_elo_rating(away_id, league)
        elo_diff = home_elo - away_elo
        elo_prob = self.calculate_elo_win_prob(home_elo, away_elo, league)
        
        # 2. Enhanced recent form prediction
        home_form = self.calculate_recent_form(home_id, league, full_games_list)
        away_form = self.calculate_recent_form(away_id, league, full_games_list)
        
        # Form-based probability with momentum weighting
        # Base form difference
        form_diff = home_form['win_pct'] - away_form['win_pct']
        
        # Add momentum factor (recent games matter more)
        momentum_diff = (home_form['momentum'] - away_form['momentum']) / 10.0  # Normalize
        
        # Strength bonus: STRONG teams get extra confidence
        strength_bonus = 0.0
        if home_form['strength'] == 'STRONG' and away_form['strength'] != 'STRONG':
            strength_bonus = 0.03
        elif away_form['strength'] == 'STRONG' and home_form['strength'] != 'STRONG':
            strength_bonus = -0.03
        
        # Combined form probability
        form_prob = 0.5 + (form_diff * 0.35) + (momentum_diff * 0.15) + strength_bonus + 0.05  # Home advantage
        form_prob = max(0.12, min(0.88, form_prob))
        
        # 3. Enhanced record-based prediction using Pythagorean Expectation and Log5
        # Calculate season-long stats
        home_season = self.calculate_season_stats(home_id, league, full_games_list)
        away_season = self.calculate_season_stats(away_id, league, full_games_list)
        
        # Initialize records safely
        home_record = game.get('home_record', '0-0')
        away_record = game.get('away_record', '0-0')
        
        # Use Pythagorean Expectation if enough games played, otherwise fallback to record
        if home_season['games_played'] >= 5 and away_season['games_played'] >= 5:
            home_pyth = home_season['pythagorean_win_pct']
            away_pyth = away_season['pythagorean_win_pct']
            
            # Use Log5 to calculate win probability
            # Log5 estimates P(A wins) given P(A) and P(B) against the field
            record_prob = self._calculate_log5_prob(home_pyth, away_pyth)
            
            # Add small home advantage boost to Log5 result (Log5 is neutral site)
            record_prob += 0.04 
        else:
            # Fallback to simple record win %
            home_win_pct = self._calculate_record_win_prob(home_record)
            away_win_pct = self._calculate_record_win_prob(away_record)
            
            record_diff = home_win_pct - away_win_pct
            record_prob = 0.5 + (record_diff * 0.35) + 0.055
            
        # Ensure record_prob is a valid float
        if math.isnan(record_prob):
            record_prob = 0.5
            
        record_prob = max(0.15, min(0.85, record_prob))
        
        # 3c. Calculate H2H adjustment (needed for stat_model_prob)
        h2h = self.calculate_head_to_head(home_id, away_id, full_games_list)
        h2h_adjustment = (h2h.get('home_win_pct', 0.5) - 0.5) * 0.1  # Small adjustment
        
        # 3e. Calculate Injury Impact Probability
        # Fetch real-time injury data
        home_injuries = self.data_feeds.get_team_injuries(home_abbr, league)
        away_injuries = self.data_feeds.get_team_injuries(away_abbr, league)
        
        home_impact = self.data_feeds.calculate_injury_impact(home_injuries, league)
        away_impact = self.data_feeds.calculate_injury_impact(away_injuries, league)
        
        # Calculate probability shift based on injury impact difference
        # Positive net_impact means Away is more injured -> Favors Home
        net_injury_impact = away_impact['total_impact'] - home_impact['total_impact']
        
        # Each point of impact difference shifts probability by ~4%
        injury_prob = 0.5 + (net_injury_impact * 0.04)
        injury_prob = max(0.20, min(0.80, injury_prob))
        
        # 3f. Calculate Rest and Travel Factors
        try:
            game_dt = datetime.fromisoformat(game.get('game_date', '').replace("Z", ""))
        except:
            game_dt = datetime.now()
            
        # Rest
        home_rest = self.calculate_rest_days(home_id, game_dt, full_games_list)
        away_rest = self.calculate_rest_days(away_id, game_dt, full_games_list)
        
        rest_impact = 0.0
        rest_desc = ""
        
        if league == 'nba':
            if home_rest == 1: rest_impact -= 0.03  # Home B2B
            if away_rest == 1: rest_impact += 0.03  # Away B2B (favors home)
            if home_rest >= 3 and away_rest == 1: 
                rest_impact -= 0.01 # Rest advantage bonus
                rest_desc = "Rest Advantage"
        elif league == 'nfl':
            if home_rest < 6: rest_impact -= 0.02 # Short week
            if away_rest < 6: rest_impact += 0.02
            if home_rest > 10: rest_impact += 0.02 # Bye week
            if away_rest > 10: rest_impact -= 0.02
            
        # Travel
        travel_data = self.calculate_travel_impact(home_abbr, away_abbr, game_dt, league)
        travel_impact = -travel_data['impact'] # Invert because impact is negative for away, which helps Home prob
        
        # Combine contextual factors
        context_prob = 0.5 + rest_impact + travel_impact
        
        # Ensure all probabilities are valid floats before ensemble
        if math.isnan(elo_prob): elo_prob = 0.5
        if math.isnan(form_prob): form_prob = 0.5
        if math.isnan(record_prob): record_prob = 0.5
        if math.isnan(h2h_adjustment): h2h_adjustment = 0.0
        if math.isnan(injury_prob): injury_prob = 0.5
        if math.isnan(context_prob): context_prob = 0.5
        
        # 3d. Build comprehensive stat_model_prob (what users see as 'Model')
        # This is a weighted ensemble of multiple statistical factors
        # Using research-backed weights for sports prediction
        stat_model_prob = (
            elo_prob * self.STAT_ELO_WEIGHT +          # Elo is strongest (40%)
            form_prob * self.STAT_FORM_WEIGHT +        # Form is very predictive (20%)
            record_prob * self.STAT_RECORD_WEIGHT +    # Season record/Pythagorean adds context (15%)
            (0.5 + h2h_adjustment) * self.STAT_H2H_WEIGHT + # H2H historical adjustment (10%)
            injury_prob * self.STAT_INJURY_WEIGHT +    # Injury impact (15%)
            (context_prob - 0.5) * 0.10                # Rest/Travel context (10% implicit weight)
        )
        
        # Final safety check
        if math.isnan(stat_model_prob):
            stat_model_prob = 0.5
            
        # Clamp to reasonable bounds (model should rarely be > 85% confident)
        stat_model_prob = max(0.10, min(0.90, stat_model_prob))
        
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
        
        # 5. Calculate final probability
        # We use the statistical model probability as the official prediction.
        home_win_prob = stat_model_prob
        
        # 6. Statistical ensemble prediction (replaces ML)
        # Calculate differences for statistical model
        
        form_diff = home_form['win_pct'] - away_form['win_pct']
        
        # Use Pythagorean diff if available
        if home_season['games_played'] >= 5:
            record_diff = home_season['pythagorean_win_pct'] - away_season['pythagorean_win_pct']
        else:
            # Fallback to simple record win % if not already calculated
            if 'home_win_pct' not in locals():
                home_win_pct = self._calculate_record_win_prob(home_record)
            if 'away_win_pct' not in locals():
                away_win_pct = self._calculate_record_win_prob(away_record)
            record_diff = home_win_pct - away_win_pct
            
        # Ensure inputs are valid floats
        if math.isnan(elo_diff): elo_diff = 0.0
        if math.isnan(form_diff): form_diff = 0.0
        if math.isnan(record_diff): record_diff = 0.0
        if math.isnan(h2h_adjustment): h2h_adjustment = 0.0
        
        stat_ensemble_prob = self.predict_with_statistical(
            elo_diff=elo_diff,
            form_diff=form_diff,
            record_diff=record_diff,
            h2h_adjustment=h2h_adjustment,
            market_confidence=kalshi_confidence
        )
        
        # Safety check for ensemble result
        if math.isnan(stat_ensemble_prob):
            stat_ensemble_prob = 0.5
        
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
        
        # 8. Combine predictions
        base_prob = (
            stat_model_prob * w_stats +
            home_kalshi_prob * w_kalshi +
            elo_prob * w_elo +
            form_prob * w_form +
            stat_ensemble_prob * w_ensemble
        )
        
        # Apply H2H adjustment
        final_prob = base_prob + h2h_adjustment
        final_prob = max(0.05, min(0.95, final_prob))
        
        # 9. Calculate divergence and signals (using stat_model_prob vs market)
        divergence = abs(stat_model_prob - home_kalshi_prob)
        recommendation = "Neutral"
        signal_strength = "WEAK"
        
        if divergence > 0.15:
            signal_strength = "STRONG"
            if home_kalshi_prob > stat_model_prob:
                recommendation = "Follow Market"
            else:
                recommendation = "Fade Market"
        elif divergence > 0.08:
            signal_strength = "MODERATE"
            if home_kalshi_prob > stat_model_prob:
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
            league,
            include_intelligence=include_intelligence
        )
        
        market_data = {
            'volume_24h': volume,
            'last_price': home_kalshi_prob * 100
        }
        
        signals = self.signal_engine.generate_signals(game, market_data, context, 
                                                    kalshi_markets=kalshi_markets, 
                                                    model_prob=stat_model_prob)
        
        # Calculate suggested wager (Simplified Kelly Criterion)
        # Assuming standard bankroll unit of $100
        wager_amount = 0
        wager_display = "No Bet"
        
        # Determine value side
        if stat_model_prob > home_kalshi_prob:
            # Model likes Home more than Market -> Bet Home
            edge = stat_model_prob - home_kalshi_prob
            target_team = game.get('home_team_name', 'Home')
            # Kelly for "Yes" on Home
            kelly_f = edge / (1 - home_kalshi_prob) if home_kalshi_prob < 1 else 0
            direction = "Home"
        else:
            # Model likes Away (or dislikes Home) more than Market -> Bet Away
            edge = home_kalshi_prob - stat_model_prob
            target_team = game.get('away_team_name', 'Away')
            # Kelly for "No" on Home (equivalent to betting Away in 2-way)
            kelly_f = edge / home_kalshi_prob if home_kalshi_prob > 0 else 0
            direction = "Away"

        # Conservative Kelly (quarter kelly)
        kelly_f = max(0, kelly_f * 0.25)
        
        # Only suggest bet if edge is sufficient
        value_proposition = ""
        if edge > 0.05:
            # Scale to dollar amount (Base unit $50)
            base_wager = 50
            wager_amount = int(base_wager * (1 + kelly_f * 5))
            
            # Cap and floor
            if signal_strength == "STRONG":
                wager_amount = max(25, min(100, wager_amount))
                wager_display = f"${wager_amount}-${wager_amount+25}"
                recommendation = f"Bet {target_team}"
            elif signal_strength == "MODERATE":
                wager_amount = max(15, min(50, wager_amount))
                wager_display = f"${wager_amount}-${wager_amount+15}"
                recommendation = f"Lean {target_team}"
            else:
                wager_amount = 10
                wager_display = "$10-$20"
                recommendation = f"Lean {target_team}"
            
            # Generate value explanation
            if direction == "Home":
                model_p = stat_model_prob
                market_p = home_kalshi_prob
            else:
                model_p = 1.0 - stat_model_prob
                market_p = 1.0 - home_kalshi_prob
                
            if model_p < 0.5:
                value_proposition = f"Value Opportunity: While {target_team} is the underdog ({model_p:.0%} win prob), the market price ({market_p:.0%}) is too low. This is a profitable long-term bet despite the lower win rate."
            else:
                value_proposition = f"Edge Play: Model sees {target_team} winning {model_p:.0%} of the time, providing a clear edge over the market price of {market_p:.0%}."
        else:
            recommendation = "Stay Away"
            wager_display = "No Bet"
            value_proposition = "No significant edge found. Market and Model are aligned."

        # Enhanced reasoning with model-specific insights
        reasoning = []
        if divergence > 0.15:
            reasoning.append(f"Model sees {int(divergence*100)}% divergence from market - strong edge signal.")
        
        # Explain stat_model_prob composition
        if abs(elo_prob - 0.5) > 0.15:
            reasoning.append(f"Elo ratings favor {'home' if elo_prob > 0.5 else 'away'} team ({elo_prob:.1%} Elo win prob).")
        
        if home_form['strength'] == "STRONG":
            reasoning.append(f"Home team in strong recent form ({home_form['win_pct']:.0%} win rate, +{home_form['avg_point_diff']:.1f} avg margin).")
        elif away_form['strength'] == "STRONG":
            reasoning.append(f"Away team in strong recent form ({away_form['win_pct']:.0%} win rate, +{away_form['avg_point_diff']:.1f} avg margin).")
        
        # Add Pythagorean reasoning if relevant
        if home_season['games_played'] >= 5:
            pyth_diff = home_season['pythagorean_win_pct'] - away_season['pythagorean_win_pct']
            if abs(pyth_diff) > 0.15:
                leader = "Home" if pyth_diff > 0 else "Away"
                reasoning.append(f"{leader} team has significantly better underlying stats (Pythagorean Expectation).")
        
        # Injury reasoning
        if home_impact['severity'] in ['HIGH', 'CRITICAL']:
            reasoning.append(f"Home team has {home_impact['severity']} injury impact ({len(home_impact['key_players_out'])} key players out).")
        if away_impact['severity'] in ['HIGH', 'CRITICAL']:
            reasoning.append(f"Away team has {away_impact['severity']} injury impact ({len(away_impact['key_players_out'])} key players out).")
            
        # Weather reasoning
        if context.get('weather', {}).get('correlation_impact', {}).get('severity') == 'HIGH':
            reasoning.append(f"Weather Alert: {context['weather']['correlation_impact']['note']}")
            
        # Market reasoning
        if kalshi_confidence == "HIGH":
            reasoning.append(f"High market liquidity ({volume} contracts) suggests efficient pricing.")
        
        result = {
            "game_id": game.get('game_id'),
            "league": league,
            "home_team": game.get('home_team_name'),
            "away_team": game.get('away_team_name'),
            "home_abbr": home_abbr,
            "away_abbr": away_abbr,
            "game_date": game.get('game_date'),
            "status": game.get('status'),
            "home_score": game.get('home_score'),
            "away_score": game.get('away_score'),
            "prediction": {
                "home_win_prob": float(final_prob),
                "away_win_prob": float(1.0 - final_prob),
                "confidence": "HIGH" if abs(final_prob - 0.5) > 0.2 else ("MEDIUM" if abs(final_prob - 0.5) > 0.1 else "LOW"),
                "model_confidence": float(stat_model_prob),
                "stat_model_prob": float(stat_model_prob),
                "market_confidence": float(home_kalshi_prob),
                "home_kalshi_prob": float(home_kalshi_prob),
                "away_kalshi_prob": float(away_kalshi_prob),
                "elo_prob": float(elo_prob),
                "form_prob": float(form_prob),
                "record_prob": float(record_prob),
                "injury_impact": float(injury_prob),
                "stat_ensemble_prob": float(stat_ensemble_prob),
                "context_impact": float(context_prob),
                "pythagorean_prob": float(record_prob) if home_season['games_played'] >= 5 else None,
                "divergence": float(divergence),
                "confidence_score": "HIGH" if abs(final_prob - 0.5) > 0.2 else ("MEDIUM" if abs(final_prob - 0.5) > 0.1 else "LOW"),
                "signal_strength": signal_strength,
                "recommendation": recommendation
            },
            "recommendation": {
                "action": recommendation,
                "wager": wager_display,
                "wager_amount": wager_amount,
                "value_proposition": value_proposition,
                "signal_strength": signal_strength,
                "reasoning": reasoning
            },
            "signals": signals,
            "context": context,
            "timestamp": datetime.now().isoformat(),
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
                    "home_advantage": round(0.05, 3),
                    "record_diff": round(record_diff / 2, 3),
                    "recent_form": round((home_form['win_pct'] - away_form['win_pct']) / 2, 3),
                    "elo_advantage": round(elo_diff / 200, 3),
                    "injury_impact": round(net_injury_impact * 0.04, 3)
                },
                "reasoning": reasoning,
                "signals": signals,
                "context_factors": {
                    "home_rest_days": home_rest,
                    "away_rest_days": away_rest,
                    "travel_distance_km": travel_data.get('distance_km', 0),
                    "time_zone_shift": travel_data.get('time_zone_shift', 0),
                    "home_is_b2b": home_rest == 0,
                    "away_is_b2b": away_rest == 0
                }
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
                "mid_price": (yes_bid + yes_ask) / 2 if yes_bid and yes_ask else home_kalshi_prob * 100,
                "volume": volume,
                "spread": round(spread, 1),
                "spread_pct": round((spread / ((yes_bid + yes_ask) / 2) * 100) if yes_bid + yes_ask > 0 else 0, 2),
                "open_interest": kalshi_markets.get('home_market', {}).get('raw', {}).get('open_interest', 0) if kalshi_markets and 'home_market' in kalshi_markets else 0,
                "liquidity": kalshi_markets.get('home_market', {}).get('raw', {}).get('liquidity', 0) if kalshi_markets and 'home_market' in kalshi_markets else 0,
                "confidence": kalshi_confidence
            }
        }
        
        return result
    
    def _calculate_record_win_prob(self, record: str) -> float:
        """Convert 'W-L' record to win probability"""
        wins, losses = self._parse_record(record)
        total = wins + losses
        if total == 0:
            return 0.5
        return wins / total

