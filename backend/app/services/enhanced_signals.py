"""
PRIMARY SERVICE
Enhanced Signal Engine with advanced market analysis and pattern detection.
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import numpy as np
from collections import deque

class EnhancedSignalEngine:
    """
    Advanced signal generation with:
    - Historical price tracking
    - Volume profile analysis
    - Market microstructure signals
    - Momentum indicators
    - Arbitrage detection
    - Line movement tracking
    """
    
    def __init__(self):
        # Price history storage (in production, use database/Redis)
        self.price_history: Dict[str, deque] = {}
        self.volume_history: Dict[str, deque] = {}
        
        # Signal thresholds
        self.MOMENTUM_THRESHOLD = 0.05  # 5% price move
        self.VOLUME_SPIKE_THRESHOLD = 2.0  # 2x average volume
        self.ARBITRAGE_THRESHOLD = 0.03  # 3% price difference
        
    def track_price(self, market_id: str, price: float, timestamp: Optional[datetime] = None):
        """Track historical prices for a market"""
        if market_id not in self.price_history:
            self.price_history[market_id] = deque(maxlen=100)  # Keep last 100 prices
        
        self.price_history[market_id].append({
            'price': price,
            'timestamp': timestamp or datetime.now()
        })
    
    def track_volume(self, market_id: str, volume: int, timestamp: Optional[datetime] = None):
        """Track historical volume for a market"""
        if market_id not in self.volume_history:
            self.volume_history[market_id] = deque(maxlen=100)
        
        self.volume_history[market_id].append({
            'volume': volume,
            'timestamp': timestamp or datetime.now()
        })
    
    def generate_signals(self, game: Dict, market_data: Dict, context: Dict, 
                        kalshi_markets: Optional[Dict] = None) -> List[Dict]:
        """
        Generate comprehensive trading signals.
        """
        signals = []
        
        # Get market ID for tracking
        market_id = self._get_market_id(game, kalshi_markets)
        current_price = market_data.get('last_price', 50) / 100.0  # Convert to 0-1
        current_volume = market_data.get('volume_24h', 0)
        
        # Track prices and volumes
        if market_id:
            self.track_price(market_id, current_price)
            self.track_volume(market_id, current_volume)
        
        # 1. Momentum signals
        momentum_signal = self._analyze_momentum(market_id, current_price)
        if momentum_signal:
            signals.append(momentum_signal)
        
        # 2. Volume signals
        volume_signal = self._analyze_volume(market_id, current_volume)
        if volume_signal:
            signals.append(volume_signal)
        
        # 3. Market microstructure signals
        microstructure_signal = self._analyze_microstructure(market_data, kalshi_markets)
        if microstructure_signal:
            signals.append(microstructure_signal)
        
        # 4. Arbitrage signals
        arbitrage_signal = self._detect_arbitrage(kalshi_markets)
        if arbitrage_signal:
            signals.append(arbitrage_signal)
        
        # 5. Weather signals (enhanced)
        weather_signal = self._analyze_weather(context.get('weather'), game)
        if weather_signal:
            signals.append(weather_signal)
        
        # 6. Injury signals (enhanced)
        injury_signal = self._analyze_injuries(context.get('injuries'), game)
        if injury_signal:
            signals.append(injury_signal)
        
        # 7. Line movement signals
        line_signal = self._analyze_line_movement(game, context)
        if line_signal:
            signals.append(line_signal)
        
        # 8. Contrarian signals
        contrarian_signal = self._detect_contrarian_opportunity(market_data, context)
        if contrarian_signal:
            signals.append(contrarian_signal)
        
        return signals
    
    def _get_market_id(self, game: Dict, kalshi_markets: Optional[Dict]) -> Optional[str]:
        """Extract market ID for tracking"""
        if not kalshi_markets:
            return None
        
        if kalshi_markets.get('type') == 'dual':
            return kalshi_markets['home_market'].get('market_id')
        elif kalshi_markets.get('type') == 'single_home':
            return kalshi_markets['home_market'].get('market_id')
        elif kalshi_markets.get('type') == 'single_away':
            return kalshi_markets['away_market'].get('market_id')
        
        return None
    
    def _analyze_momentum(self, market_id: Optional[str], current_price: float) -> Optional[Dict]:
        """Detect price momentum from historical data"""
        if not market_id or market_id not in self.price_history:
            return None
        
        history = list(self.price_history[market_id])
        if len(history) < 5:
            return None
        
        # Calculate short-term vs long-term trend
        recent_prices = [p['price'] for p in history[-5:]]
        earlier_prices = [p['price'] for p in history[-10:-5]] if len(history) >= 10 else recent_prices
        
        recent_avg = np.mean(recent_prices)
        earlier_avg = np.mean(earlier_prices) if earlier_prices else recent_avg
        
        price_change = recent_avg - earlier_avg
        
        if abs(price_change) < self.MOMENTUM_THRESHOLD:
            return None
        
        # Calculate momentum strength
        if price_change > 0:
            direction = "BULLISH"
            strength = "STRONG" if price_change > 0.10 else "MODERATE"
        else:
            direction = "BEARISH"
            strength = "STRONG" if price_change < -0.10 else "MODERATE"
        
        return {
            "type": "MOMENTUM",
            "strength": strength,
            "direction": direction,
            "price_change": round(price_change * 100, 2),
            "description": f"{direction} momentum detected: {price_change*100:+.2f}% price movement"
        }
    
    def _analyze_volume(self, market_id: Optional[str], current_volume: int) -> Optional[Dict]:
        """Detect volume anomalies and spikes"""
        if not market_id or market_id not in self.volume_history:
            return None
        
        history = list(self.volume_history[market_id])
        if len(history) < 3:
            return None
        
        volumes = [v['volume'] for v in history]
        avg_volume = np.mean(volumes[:-1])  # Exclude current volume
        
        if avg_volume == 0:
            return None
        
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0
        
        if volume_ratio < self.VOLUME_SPIKE_THRESHOLD:
            return None
        
        strength = "HIGH" if volume_ratio > 5.0 else "MEDIUM"
        
        return {
            "type": "VOLUME_SPIKE",
            "strength": strength,
            "direction": "BULLISH" if current_volume > avg_volume else "NEUTRAL",
            "volume_ratio": round(volume_ratio, 2),
            "description": f"Volume spike detected: {volume_ratio:.1f}x average ({current_volume} vs {avg_volume:.0f} avg)"
        }
    
    def _analyze_microstructure(self, market_data: Dict, kalshi_markets: Optional[Dict]) -> Optional[Dict]:
        """Analyze market microstructure (bid-ask spread, order flow)"""
        if not kalshi_markets:
            return None
        
        spread = market_data.get('spread', 15)
        yes_bid = market_data.get('yes_bid', 0)
        yes_ask = market_data.get('yes_ask', 100)
        volume = market_data.get('volume_24h', 0)
        
        # Tight spread with high volume = efficient market
        # Wide spread = illiquid or uncertain
        
        if spread <= 3 and volume > 500:
            return {
                "type": "MARKET_EFFICIENCY",
                "strength": "HIGH",
                "direction": "NEUTRAL",
                "description": f"Tight spread ({spread:.1f} cents) with good liquidity indicates efficient pricing"
            }
        elif spread > 10 and volume < 100:
            return {
                "type": "MARKET_INEFFICIENCY",
                "strength": "MEDIUM",
                "direction": "OPPORTUNITY",
                "description": f"Wide spread ({spread:.1f} cents) with low volume may indicate pricing inefficiency"
            }
        
        # Bid-ask imbalance
        mid_price = (yes_bid + yes_ask) / 2
        if yes_bid > 0 and yes_ask < 100:
            imbalance = (yes_ask - mid_price) / (mid_price - yes_bid) if (mid_price - yes_bid) > 0 else 1.0
            
            if imbalance > 1.5:
                return {
                    "type": "ORDER_FLOW",
                    "strength": "MEDIUM",
                    "direction": "BEARISH",
                    "description": "Ask-side pressure detected (more sellers than buyers)"
                }
            elif imbalance < 0.67:
                return {
                    "type": "ORDER_FLOW",
                    "strength": "MEDIUM",
                    "direction": "BULLISH",
                    "description": "Bid-side pressure detected (more buyers than sellers)"
                }
        
        return None
    
    def _detect_arbitrage(self, kalshi_markets: Optional[Dict]) -> Optional[Dict]:
        """Detect arbitrage opportunities between home/away markets"""
        if not kalshi_markets or kalshi_markets.get('type') != 'dual':
            return None
        
        home_m = kalshi_markets['home_market']
        away_m = kalshi_markets['away_market']
        
        home_prob = home_m.get('prob', 0.5)
        away_prob = away_m.get('prob', 0.5)
        
        # Check if probabilities sum to ~1.0 (arbitrage if not)
        total_prob = home_prob + away_prob
        
        if abs(total_prob - 1.0) > self.ARBITRAGE_THRESHOLD:
            opportunity = abs(total_prob - 1.0)
            
            if total_prob < 1.0:
                # Both markets undervalued - buy both
                return {
                    "type": "ARBITRAGE",
                    "strength": "HIGH",
                    "direction": "OPPORTUNITY",
                    "edge": round(opportunity * 100, 2),
                    "description": f"Arbitrage opportunity: probabilities sum to {total_prob:.2%} (buy both sides for {opportunity*100:.2f}% edge)"
                }
            else:
                # Both markets overvalued - sell both
                return {
                    "type": "ARBITRAGE",
                    "strength": "MEDIUM",
                    "direction": "OPPORTUNITY",
                    "edge": round(opportunity * 100, 2),
                    "description": f"Market inefficiency: probabilities sum to {total_prob:.2%} (potential short opportunity)"
                }
        
        return None
    
    def _analyze_weather(self, weather: Dict, game: Dict) -> Optional[Dict]:
        """Enhanced weather analysis"""
        if not weather or game.get('league') == 'nba':
            return None
        
        temp = weather.get('temperature', 70)
        condition = weather.get('condition', 'Clear')
        wind_str = weather.get('wind_speed', '0 mph')
        
        try:
            wind = int(wind_str.split()[0])
        except:
            wind = 0
        
        precip_chance = weather.get('precipitation_chance', 0)
        
        # NFL weather impacts
        severity_score = 0
        
        if condition in ['Snow', 'Heavy Snow']:
            severity_score += 3
        elif condition in ['Rain', 'Heavy Rain']:
            severity_score += 2
        elif condition == 'Fog':
            severity_score += 1
        
        if wind > 20:
            severity_score += 2
        elif wind > 15:
            severity_score += 1
        
        if temp < 20:
            severity_score += 1
        
        if precip_chance > 70:
            severity_score += 1
        
        if severity_score >= 4:
            return {
                "type": "WEATHER",
                "strength": "HIGH",
                "direction": "BEARISH_SCORING",
                "description": f"Severe weather conditions: {condition}, {wind}mph wind, {temp}°F. Expect lower scoring."
            }
        elif severity_score >= 2:
            return {
                "type": "WEATHER",
                "strength": "MEDIUM",
                "direction": "BEARISH_SCORING",
                "description": f"Adverse weather: {condition}, {wind}mph wind. May impact scoring."
            }
        
        return None
    
    def _analyze_injuries(self, injuries: Dict, game: Dict) -> Optional[Dict]:
        """Enhanced injury analysis with impact scoring"""
        if not injuries:
            return None
        
        # Check if we have pre-calculated impact data
        injury_impact = injuries.get('injury_impact', {})
        if injury_impact:
            home_impact_data = injury_impact.get('home', {})
            away_impact_data = injury_impact.get('away', {})
            home_impact = home_impact_data.get('total_impact', 0.0)
            away_impact = away_impact_data.get('total_impact', 0.0)
            home_severity = home_impact_data.get('severity', 'NONE')
            away_severity = away_impact_data.get('severity', 'NONE')
            home_key_players = home_impact_data.get('key_players_out', [])
            away_key_players = away_impact_data.get('key_players_out', [])
        else:
            # Fallback to manual calculation
            home_inj = injuries.get('home', [])
            away_inj = injuries.get('away', [])
            
            # Key positions by league
            if game.get('league') == 'nfl':
                key_positions = ['QB', 'RB', 'WR', 'TE', 'OL']
                impact_weights = {'QB': 4.0, 'RB': 1.8, 'WR': 1.8, 'TE': 1.2, 'OL': 2.5}
            else:  # NBA
                key_positions = ['PG', 'SG', 'SF', 'PF', 'C']
                impact_weights = {'PG': 2.5, 'SG': 1.8, 'SF': 2.0, 'PF': 1.8, 'C': 2.2}
            
            def calculate_impact(team_injuries):
                total_impact = 0.0
                key_out = []
                
                for inj in team_injuries:
                    status = inj.get('status', '').upper()
                    position = inj.get('position', '')
                    
                    status_weight = 1.0 if status == 'OUT' else 0.7 if status == 'DOUBTFUL' else 0.4
                    
                    if position in key_positions:
                        weight = impact_weights.get(position, 1.0)
                        total_impact += weight * status_weight
                        if status == 'OUT':
                            key_out.append(f"{position} ({inj.get('player_name', 'Unknown')})")
                
                return total_impact, key_out
            
            home_impact, home_out_list = calculate_impact(home_inj)
            away_impact, away_out_list = calculate_impact(away_inj)
            home_key_players = [{'name': p.split('(')[1].rstrip(')'), 'position': p.split('(')[0].strip()} for p in home_out_list]
            away_key_players = [{'name': p.split('(')[1].rstrip(')'), 'position': p.split('(')[0].strip()} for p in away_out_list]
            home_severity = 'CRITICAL' if home_impact >= 5.0 else 'HIGH' if home_impact >= 3.0 else 'MODERATE' if home_impact >= 1.5 else 'LOW'
            away_severity = 'CRITICAL' if away_impact >= 5.0 else 'HIGH' if away_impact >= 3.0 else 'MODERATE' if away_impact >= 1.5 else 'LOW'
        
        # Generate signal based on impact differential
        impact_diff = home_impact - away_impact
        
        if home_impact >= 5.0 and away_impact < 2.0:
            return {
                "type": "ROSTER",
                "strength": "CRITICAL",
                "direction": "BEARISH_HOME",
                "description": f"Critical home injuries ({home_severity}). {len(home_key_players)} key player(s) out. Impact: {home_impact:.1f}",
                "impact_score": home_impact
            }
        elif away_impact >= 5.0 and home_impact < 2.0:
            return {
                "type": "ROSTER",
                "strength": "CRITICAL",
                "direction": "BULLISH_HOME",
                "description": f"Critical away injuries ({away_severity}). {len(away_key_players)} key player(s) out. Impact: {away_impact:.1f}",
                "impact_score": away_impact
            }
        elif impact_diff > 3.0:
            return {
                "type": "ROSTER",
                "strength": "HIGH",
                "direction": "BEARISH_HOME",
                "description": f"Significant home injury disadvantage. Impact diff: {impact_diff:.1f}",
                "impact_score": impact_diff
            }
        elif impact_diff < -3.0:
            return {
                "type": "ROSTER",
                "strength": "HIGH",
                "direction": "BULLISH_HOME",
                "description": f"Significant away injury disadvantage. Impact diff: {abs(impact_diff):.1f}",
                "impact_score": abs(impact_diff)
            }
        elif impact_diff > 2.0:
            return {
                "type": "ROSTER",
                "strength": "MEDIUM",
                "direction": "BEARISH_HOME",
                "description": f"Home team injury concerns. Impact: {home_impact:.1f} vs {away_impact:.1f}",
                "impact_score": impact_diff
            }
        elif impact_diff < -2.0:
            return {
                "type": "ROSTER",
                "strength": "MEDIUM",
                "direction": "BULLISH_HOME",
                "description": f"Away team injury concerns. Impact: {away_impact:.1f} vs {home_impact:.1f}",
                "impact_score": abs(impact_diff)
            }
        
        return None
    
    def _analyze_line_movement(self, game: Dict, context: Dict) -> Optional[Dict]:
        """Detect line movement (spread changes)"""
        # In production, track historical spreads from odds API
        # For now, check if spread exists and is significant
        odds = game.get('odds', {})
        spread_str = odds.get('spread', 'N/A')
        
        if spread_str == 'N/A':
            return None
        
        # Parse spread (simplified - in production, track changes over time)
        try:
            # Extract number from spread string like "KC -7.5"
            import re
            match = re.search(r'-?\d+\.?\d*', spread_str)
            if match:
                spread_val = float(match.group())
                
                # Large spread indicates strong favorite
                if abs(spread_val) > 7:
                    return {
                        "type": "LINE_MOVEMENT",
                        "strength": "MEDIUM",
                        "direction": "FAVORITE" if spread_val < 0 else "UNDERDOG",
                        "description": f"Large spread ({spread_val:+.1f}) indicates strong market consensus"
                    }
        except:
            pass
        
        return None
    
    def _detect_contrarian_opportunity(self, market_data: Dict, context: Dict) -> Optional[Dict]:
        """Detect contrarian opportunities (when market overreacts)"""
        # High volume + extreme price + low confidence = potential overreaction
        volume = market_data.get('volume_24h', 0)
        price = market_data.get('last_price', 50) / 100.0
        
        # Extreme prices (very high or very low) with high volume might indicate overreaction
        if volume > 1000:
            if price > 0.75:
                return {
                    "type": "CONTRARIAN",
                    "strength": "MEDIUM",
                    "direction": "BEARISH",
                    "description": "Extreme bullish pricing with high volume - potential overreaction"
                }
            elif price < 0.25:
                return {
                    "type": "CONTRARIAN",
                    "strength": "MEDIUM",
                    "direction": "BULLISH",
                    "description": "Extreme bearish pricing with high volume - potential overreaction"
                }
        
        return None

