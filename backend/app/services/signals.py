"""
Legacy Signal Engine.
DEPRECATED: Use EnhancedSignalEngine (enhanced_signals.py) for new development.
Maintained for backward compatibility.
"""
from typing import List, Dict
from datetime import datetime

class SignalEngine:
    def generate_signals(self, game: Dict, market_data: Dict, context: Dict) -> List[Dict]:
        """
        Analyze game, market, and context to generate trading signals.
        """
        signals = []
        
        # 1. Trend Signal
        trend_signal = self._analyze_trend(market_data)
        if trend_signal:
            signals.append(trend_signal)
            
        # 2. Weather Signal
        weather_signal = self._analyze_weather(context.get('weather'), game)
        if weather_signal:
            signals.append(weather_signal)
            
        # 3. Injury Signal
        injury_signal = self._analyze_injuries(context.get('injuries'), game)
        if injury_signal:
            signals.append(injury_signal)
            
        return signals
    
    def _analyze_trend(self, market_data: Dict) -> Dict:
        """Detect price momentum"""
        # In a real system, we'd need historical ticks. 
        # Here we use volume/liquidity as a proxy for "hot" markets or synthetic trends.
        
        volume = market_data.get('volume_24h', 0)
        last_price = market_data.get('last_price', 50)
        
        if volume > 10000:
            return {
                "type": "MOMENTUM",
                "strength": "HIGH",
                "direction": "BULLISH" if last_price > 50 else "BEARISH",
                "description": "High volume indicates strong conviction."
            }
        elif volume > 2000:
             return {
                "type": "MOMENTUM",
                "strength": "MEDIUM",
                "direction": "NEUTRAL",
                "description": "Moderate trading activity."
            }
        
        return None

    def _analyze_weather(self, weather: Dict, game: Dict) -> Dict:
        """Check for weather impact"""
        if not weather or game.get('league') == 'nba': # NBA is indoors
            return None
            
        temp = weather.get('temperature', 70)
        condition = weather.get('condition', 'Clear')
        wind = int(weather.get('wind_speed', '0 mph').split()[0])
        
        if condition in ['Snow', 'Rain'] or wind > 15 or temp < 32:
            return {
                "type": "WEATHER",
                "strength": "HIGH",
                "direction": "BEARISH_SCORING", # Bad weather usually means lower scores
                "description": f"Adverse conditions: {condition}, {wind}mph wind."
            }
            
        return None

    def _analyze_injuries(self, injuries: Dict, game: Dict) -> Dict:
        """Check for key player injuries"""
        if not injuries:
            return None
            
        home_inj = injuries.get('home', [])
        away_inj = injuries.get('away', [])
        
        key_home_out = any(i['status'] == 'Out' and i['position'] in ['QB', 'WR1', 'PG', 'Star'] for i in home_inj)
        key_away_out = any(i['status'] == 'Out' and i['position'] in ['QB', 'WR1', 'PG', 'Star'] for i in away_inj)
        
        if key_home_out and not key_away_out:
             return {
                "type": "ROSTER",
                "strength": "HIGH",
                "direction": "BEARISH_HOME",
                "description": "Key home player(s) out."
            }
        elif key_away_out and not key_home_out:
             return {
                "type": "ROSTER",
                "strength": "HIGH",
                "direction": "BULLISH_HOME",
                "description": "Key away player(s) out."
            }
            
        return None

