"""
Insights Generator - Creates actionable insights from predictions and data.
"""
from typing import Dict, List, Optional
from datetime import datetime
import numpy as np

class InsightsGenerator:
    """
    Generates actionable insights from:
    - Prediction data
    - Market signals
    - Historical patterns
    - Statistical anomalies
    """
    
    def __init__(self):
        pass
    
    def generate_insights(self, prediction_data: Dict, market_context: Dict, 
                         historical_data: Optional[List[Dict]] = None) -> List[Dict]:
        """
        Generate comprehensive insights for a game prediction.
        """
        insights = []
        
        pred = prediction_data.get('prediction', {})
        analytics = prediction_data.get('analytics', {})
        market_data = prediction_data.get('market_data', {})
        
        # 1. Value Opportunities
        value_insights = self._find_value_opportunities(prediction_data)
        insights.extend(value_insights)
        
        # 2. Statistical Anomalies
        anomaly_insights = self._detect_anomalies(prediction_data)
        insights.extend(anomaly_insights)
        
        # 3. Market Inefficiencies
        inefficiency_insights = self._detect_market_inefficiencies(prediction_data, market_data)
        insights.extend(inefficiency_insights)
        
        # 4. Context-Based Insights
        context_insights = self._analyze_context(prediction_data, market_context)
        insights.extend(context_insights)
        
        # 5. Historical Patterns
        if historical_data:
            pattern_insights = self._find_historical_patterns(prediction_data, historical_data)
            insights.extend(pattern_insights)
        
        # 6. Risk Assessment
        risk_insights = self._assess_risks(prediction_data, market_context)
        insights.extend(risk_insights)
        
        # Sort by priority/importance
        insights.sort(key=lambda x: x.get('priority', 0), reverse=True)
        
        return insights
    
    def _find_value_opportunities(self, prediction_data: Dict) -> List[Dict]:
        """Find betting value opportunities"""
        insights = []
        pred = prediction_data.get('prediction', {})
        analytics = prediction_data.get('analytics', {})
        
        model_prob = pred.get('stat_model_prob', 0.5)
        kalshi_prob = pred.get('kalshi_prob', 0.5)
        divergence = pred.get('divergence', 0)
        
        # Large divergence = value opportunity
        if divergence > 0.15:
            edge = abs(model_prob - kalshi_prob)
            direction = "BUY" if model_prob > kalshi_prob else "SELL"
            
            insights.append({
                "type": "VALUE_OPPORTUNITY",
                "priority": 9,
                "title": f"Significant Value Detected ({int(edge*100)}% edge)",
                "description": f"Model suggests {direction} opportunity. Model probability: {model_prob:.1%}, Market: {kalshi_prob:.1%}",
                "action": f"Consider {direction} position at current market price",
                "confidence": "HIGH" if divergence > 0.20 else "MEDIUM"
            })
        
        # Elo vs Market divergence - check if we have elo_prob in prediction or calculate from ratings
        elo_prob = pred.get('elo_prob')
        if not elo_prob:
            # Try to calculate from elo_ratings if available
            elo_ratings = analytics.get('elo_ratings', {})
            if elo_ratings:
                home_elo = elo_ratings.get('home', 1500)
                away_elo = elo_ratings.get('away', 1500)
                # Calculate Elo win probability (home advantage = 65 points)
                home_elo_adjusted = home_elo + 65
                elo_prob = 1 / (1 + 10 ** ((away_elo - home_elo_adjusted) / 400))
        
        if elo_prob and abs(elo_prob - kalshi_prob) > 0.10:
            insights.append({
                "type": "ELO_VALUE",
                "priority": 7,
                "title": "Elo Rating Suggests Value",
                "description": f"Elo-based probability ({elo_prob:.1%}) differs from market ({kalshi_prob:.1%})",
                "action": "Review Elo ratings for potential edge",
                "confidence": "MEDIUM"
            })
        
        return insights
    
    def _detect_anomalies(self, prediction_data: Dict) -> List[Dict]:
        """Detect statistical anomalies"""
        insights = []
        analytics = prediction_data.get('analytics', {})
        
        # Extreme Elo difference
        elo_ratings = analytics.get('elo_ratings', {})
        elo_diff = elo_ratings.get('difference', 0)
        
        if abs(elo_diff) > 200:
            insights.append({
                "type": "ANOMALY",
                "priority": 8,
                "title": "Extreme Elo Mismatch",
                "description": f"Elo difference of {elo_diff:.0f} points indicates significant skill gap",
                "action": "Consider if market properly reflects this gap",
                "confidence": "HIGH"
            })
        
        # Form vs Record mismatch
        home_form = analytics.get('recent_form', {}).get('home', {})
        away_form = analytics.get('recent_form', {}).get('away', {})
        
        if home_form.get('strength') == 'WEAK' and home_form.get('win_pct', 0.5) < 0.3:
            insights.append({
                "type": "ANOMALY",
                "priority": 7,
                "title": "Home Team in Poor Recent Form",
                "description": f"Home team winning only {home_form.get('win_pct', 0):.0%} of recent games",
                "action": "Recent form suggests home advantage may be diminished",
                "confidence": "MEDIUM"
            })
        
        return insights
    
    def _detect_market_inefficiencies(self, prediction_data: Dict, market_data: Dict) -> List[Dict]:
        """Detect market inefficiencies"""
        insights = []
        
        spread = market_data.get('spread', 15)
        volume = market_data.get('volume', 0)
        
        # Wide spread with low volume = inefficiency
        if spread > 10 and volume < 100:
            insights.append({
                "type": "MARKET_INEFFICIENCY",
                "priority": 6,
                "title": "Low Liquidity, Wide Spread",
                "description": f"Spread of {spread:.1f} cents with only {volume} volume suggests pricing inefficiency",
                "action": "Market may not reflect true probability - potential edge",
                "confidence": "MEDIUM"
            })
        
        # High volume with tight spread = efficient
        if spread <= 3 and volume > 500:
            insights.append({
                "type": "MARKET_EFFICIENCY",
                "priority": 4,
                "title": "Highly Efficient Market",
                "description": f"Tight spread ({spread:.1f} cents) with high volume ({volume}) indicates sharp money",
                "action": "Market pricing likely accurate - less edge available",
                "confidence": "HIGH"
            })
        
        return insights
    
    def _analyze_context(self, prediction_data: Dict, market_context: Dict) -> List[Dict]:
        """Analyze contextual factors"""
        insights = []
        
        injuries = market_context.get('injuries', {})
        home_inj = injuries.get('home', [])
        away_inj = injuries.get('away', [])
        
        # Key player injuries
        home_key_out = [i for i in home_inj if i.get('status') == 'Out' and i.get('position') in ['QB', 'PG', 'Star']]
        away_key_out = [i for i in away_inj if i.get('status') == 'Out' and i.get('position') in ['QB', 'PG', 'Star']]
        
        if home_key_out:
            players = ', '.join([i.get('player_name', 'Unknown') for i in home_key_out[:2]])
            insights.append({
                "type": "CONTEXT",
                "priority": 8,
                "title": f"Key Home Players Out: {players}",
                "description": f"{len(home_key_out)} key home player(s) out - significant impact expected",
                "action": "Adjust prediction downward for home team",
                "confidence": "HIGH"
            })
        
        if away_key_out:
            players = ', '.join([i.get('player_name', 'Unknown') for i in away_key_out[:2]])
            insights.append({
                "type": "CONTEXT",
                "priority": 8,
                "title": f"Key Away Players Out: {players}",
                "description": f"{len(away_key_out)} key away player(s) out - favors home team",
                "action": "Adjust prediction upward for home team",
                "confidence": "HIGH"
            })
        
        return insights
    
    def _find_historical_patterns(self, prediction_data: Dict, historical_data: List[Dict]) -> List[Dict]:
        """Find patterns in historical data"""
        insights = []
        
        # This would analyze historical matchups, similar situations, etc.
        # Placeholder for now
        
        return insights
    
    def _assess_risks(self, prediction_data: Dict, market_context: Dict) -> List[Dict]:
        """Assess risks and uncertainties"""
        insights = []
        
        pred = prediction_data.get('prediction', {})
        confidence = pred.get('confidence_score', 'LOW')
        divergence = pred.get('divergence', 0)
        
        # Low confidence = high risk
        if confidence == 'LOW':
            insights.append({
                "type": "RISK",
                "priority": 6,
                "title": "Low Market Confidence",
                "description": "Low market volume/liquidity increases uncertainty",
                "action": "Reduce position size, wait for more data",
                "confidence": "MEDIUM"
            })
        
        # High divergence = model uncertainty
        if divergence > 0.20:
            insights.append({
                "type": "RISK",
                "priority": 5,
                "title": "High Model-Market Divergence",
                "description": "Large divergence suggests either model error or market inefficiency",
                "action": "Verify model assumptions, check for data quality issues",
                "confidence": "MEDIUM"
            })
        
        return insights

