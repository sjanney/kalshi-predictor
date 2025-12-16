"""
Model Calibration Service
Analyzes prediction performance and optimizes ensemble weights.
"""
import json
import os
import logging
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import numpy as np
from scipy.optimize import minimize

logger = logging.getLogger(__name__)


class ModelCalibration:
    """
    Service for calibrating model weights based on historical performance.
    """
    
    def __init__(self, accuracy_tracker, data_dir: str = "data"):
        """
        Initialize the calibration service.
        
        Args:
            accuracy_tracker: AccuracyTracker instance
            data_dir: Directory for storing calibration data
        """
        self.accuracy_tracker = accuracy_tracker
        self.data_dir = data_dir
        self.weights_file = os.path.join(data_dir, "model_weights.json")
        
        # Default weights (from EnhancedPredictionEngine)
        self.default_weights = {
            'STAT_ELO_WEIGHT': 0.40,
            'STAT_FORM_WEIGHT': 0.20,
            'STAT_RECORD_WEIGHT': 0.15,
            'STAT_H2H_WEIGHT': 0.10,
            'STAT_INJURY_WEIGHT': 0.15
        }
        
        # Load current weights
        self.current_weights = self._load_weights()
        
        # Ensure data directory exists
        os.makedirs(data_dir, exist_ok=True)
    
    def _load_weights(self) -> Dict[str, float]:
        """Load current weights from disk."""
        if os.path.exists(self.weights_file):
            try:
                with open(self.weights_file, 'r') as f:
                    data = json.load(f)
                    return data.get('current_weights', self.default_weights)
            except Exception as e:
                logger.error(f"Error loading weights: {e}")
        return self.default_weights.copy()
    
    def _save_weights(self, weights: Dict[str, float], calibration_info: Dict):
        """Save weights and calibration history to disk."""
        try:
            # Load existing data
            if os.path.exists(self.weights_file):
                with open(self.weights_file, 'r') as f:
                    data = json.load(f)
            else:
                data = {
                    'current_weights': self.default_weights,
                    'calibration_history': [],
                    'component_accuracy': {}
                }
            
            # Update weights
            data['current_weights'] = weights
            data['last_calibrated'] = datetime.now().isoformat()
            
            # Add to history
            data['calibration_history'].append(calibration_info)
            
            # Update component accuracy
            if 'component_accuracy' in calibration_info:
                data['component_accuracy'] = calibration_info['component_accuracy']
            
            # Save
            with open(self.weights_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info("Saved calibrated weights to disk")
            
        except Exception as e:
            logger.error(f"Error saving weights: {e}")
    
    def get_current_weights(self) -> Dict[str, float]:
        """Get current ensemble weights."""
        return self.current_weights.copy()
    
    def calculate_component_accuracy(self, min_predictions: int = 10) -> Dict[str, float]:
        """
        Calculate accuracy for each model component.
        
        Args:
            min_predictions: Minimum predictions needed for component
            
        Returns:
            Dictionary of component accuracies
        """
        # Reload history to get latest data
        self.accuracy_tracker.load_history()
        
        verified = [
            r for r in self.accuracy_tracker.predictions_history
            if r.get('verified') and r.get('outcome')
        ]
        
        if len(verified) < min_predictions:
            logger.warning(f"Not enough verified predictions ({len(verified)} < {min_predictions})")
            return {}
        
        # Calculate accuracy for each component
        component_accuracy = {}
        
        for component in ['elo_prob', 'form_prob', 'stat_model_prob', 'kalshi_prob']:
            predictions = []
            actuals = []
            
            for record in verified:
                pred = record.get('prediction', {})
                prob = pred.get(component)
                
                if prob is not None:
                    predictions.append(prob)
                    actuals.append(1 if record['outcome']['home_won'] else 0)
            
            if len(predictions) >= min_predictions:
                # Calculate binary accuracy
                correct = sum(
                    1 for p, a in zip(predictions, actuals)
                    if (p > 0.5) == (a == 1)
                )
                accuracy = correct / len(predictions)
                
                # Also calculate Brier score (lower is better)
                brier = np.mean([(p - a) ** 2 for p, a in zip(predictions, actuals)])
                
                component_accuracy[component] = {
                    'accuracy': accuracy,
                    'brier_score': brier,
                    'count': len(predictions)
                }
        
        return component_accuracy
    
    def optimize_ensemble_weights(self, min_predictions: int = 50) -> Optional[Dict[str, float]]:
        """
        Optimize ensemble weights using historical performance.
        
        Args:
            min_predictions: Minimum verified predictions needed
            
        Returns:
            Optimized weights or None if not enough data
        """
        # Reload history
        self.accuracy_tracker.load_history()
        
        verified = [
            r for r in self.accuracy_tracker.predictions_history
            if r.get('verified') and r.get('outcome')
        ]
        
        if len(verified) < min_predictions:
            logger.warning(f"Not enough verified predictions for optimization ({len(verified)} < {min_predictions})")
            return None
        
        # Extract component probabilities and actual outcomes
        data = []
        for record in verified:
            pred = record.get('prediction', {})
            
            # Get component probabilities
            elo_prob = pred.get('elo_prob', 0.5)
            form_prob = pred.get('form_prob', 0.5)
            # Use stat_model_prob as proxy for record (since we don't store record_prob separately)
            record_prob = pred.get('stat_model_prob', 0.5)
            
            # Get actual outcome
            actual = 1 if record['outcome']['home_won'] else 0
            
            data.append({
                'elo': elo_prob,
                'form': form_prob,
                'record': record_prob,
                'actual': actual
            })
        
        # Define objective function (minimize Brier score)
        def objective(weights):
            # Weights: [elo, form, record, h2h, injury]
            # We only have elo, form, record in our data, so we'll optimize those
            w_elo, w_form, w_record = weights
            
            # Ensure weights sum to 1 (approximately, for the components we have)
            # The remaining weight goes to h2h and injury (which we keep at defaults)
            total = w_elo + w_form + w_record
            if total <= 0:
                return 1e6  # Invalid
            
            # Normalize
            w_elo_norm = w_elo / total
            w_form_norm = w_form / total
            w_record_norm = w_record / total
            
            # Calculate ensemble predictions
            brier_scores = []
            for d in data:
                ensemble_prob = (
                    d['elo'] * w_elo_norm +
                    d['form'] * w_form_norm +
                    d['record'] * w_record_norm
                )
                
                # Brier score
                brier = (ensemble_prob - d['actual']) ** 2
                brier_scores.append(brier)
            
            return np.mean(brier_scores)
        
        # Constraints: weights must be positive and sum to ~1
        constraints = [
            {'type': 'ineq', 'fun': lambda w: w[0]},  # w_elo >= 0
            {'type': 'ineq', 'fun': lambda w: w[1]},  # w_form >= 0
            {'type': 'ineq', 'fun': lambda w: w[2]},  # w_record >= 0
            {'type': 'ineq', 'fun': lambda w: 1.0 - sum(w)},  # sum <= 1
            {'type': 'ineq', 'fun': lambda w: sum(w) - 0.5},  # sum >= 0.5
        ]
        
        # Initial guess (current weights)
        x0 = [
            self.current_weights['STAT_ELO_WEIGHT'],
            self.current_weights['STAT_FORM_WEIGHT'],
            self.current_weights['STAT_RECORD_WEIGHT']
        ]
        
        # Optimize
        result = minimize(
            objective,
            x0,
            method='SLSQP',
            constraints=constraints,
            bounds=[(0.1, 0.7), (0.05, 0.5), (0.05, 0.4)]  # Reasonable bounds
        )
        
        if not result.success:
            logger.warning(f"Optimization failed: {result.message}")
            return None
        
        # Extract optimized weights
        w_elo, w_form, w_record = result.x
        
        # Normalize to sum to 0.85 (leaving 0.15 for h2h and injury)
        total = w_elo + w_form + w_record
        scale = 0.85 / total
        
        optimized_weights = {
            'STAT_ELO_WEIGHT': round(w_elo * scale, 3),
            'STAT_FORM_WEIGHT': round(w_form * scale, 3),
            'STAT_RECORD_WEIGHT': round(w_record * scale, 3),
            'STAT_H2H_WEIGHT': self.current_weights['STAT_H2H_WEIGHT'],  # Keep default
            'STAT_INJURY_WEIGHT': self.current_weights['STAT_INJURY_WEIGHT']  # Keep default
        }
        
        logger.info(f"Optimized weights: {optimized_weights}")
        return optimized_weights
    
    def calibrate_weights(self, min_predictions: int = 50, max_adjustment: float = 0.05) -> Dict:
        """
        Run full calibration: analyze performance and update weights.
        
        Args:
            min_predictions: Minimum verified predictions needed
            max_adjustment: Maximum weight change per calibration
            
        Returns:
            Calibration report
        """
        logger.info("Starting model calibration...")
        
        # Calculate component accuracy
        component_accuracy = self.calculate_component_accuracy(min_predictions=10)
        
        # Calculate current overall accuracy
        current_metrics = self.accuracy_tracker.calculate_accuracy_metrics(days_back=90)
        accuracy_before = current_metrics.get('accuracy', 0.0)
        
        # Optimize weights
        optimized_weights = self.optimize_ensemble_weights(min_predictions)
        
        if optimized_weights is None:
            return {
                'success': False,
                'message': f'Not enough data for calibration (need {min_predictions} verified predictions)',
                'current_accuracy': accuracy_before,
                'component_accuracy': component_accuracy
            }
        
        # Apply conservative adjustments (limit change)
        adjusted_weights = {}
        weight_changes = {}
        
        for key in self.default_weights.keys():
            old_val = self.current_weights[key]
            new_val = optimized_weights[key]
            
            # Limit adjustment
            change = np.clip(new_val - old_val, -max_adjustment, max_adjustment)
            adjusted_weights[key] = round(old_val + change, 3)
            weight_changes[key] = round(change, 3)
        
        # Normalize to ensure sum = 1.0
        total = sum(adjusted_weights.values())
        for key in adjusted_weights:
            adjusted_weights[key] = round(adjusted_weights[key] / total, 3)
        
        # Create calibration info
        calibration_info = {
            'timestamp': datetime.now().isoformat(),
            'predictions_analyzed': len([
                r for r in self.accuracy_tracker.predictions_history
                if r.get('verified')
            ]),
            'accuracy_before': accuracy_before,
            'weight_changes': weight_changes,
            'component_accuracy': component_accuracy
        }
        
        # Save weights
        self._save_weights(adjusted_weights, calibration_info)
        self.current_weights = adjusted_weights
        
        logger.info("Calibration complete")
        
        return {
            'success': True,
            'message': 'Calibration successful',
            'weights_before': self.current_weights,
            'weights_after': adjusted_weights,
            'weight_changes': weight_changes,
            'accuracy_before': accuracy_before,
            'predictions_analyzed': calibration_info['predictions_analyzed'],
            'component_accuracy': component_accuracy
        }
    
    def get_calibration_status(self) -> Dict:
        """Get current calibration status."""
        if os.path.exists(self.weights_file):
            try:
                with open(self.weights_file, 'r') as f:
                    data = json.load(f)
                    
                    last_calibrated = data.get('last_calibrated')
                    history_count = len(data.get('calibration_history', []))
                    
                    return {
                        'calibrated': True,
                        'last_calibrated': last_calibrated,
                        'current_weights': data.get('current_weights'),
                        'calibration_count': history_count,
                        'component_accuracy': data.get('component_accuracy', {})
                    }
            except Exception as e:
                logger.error(f"Error reading calibration status: {e}")
        
        return {
            'calibrated': False,
            'last_calibrated': None,
            'current_weights': self.default_weights,
            'calibration_count': 0,
            'component_accuracy': {}
        }
    
    def generate_calibration_report(self) -> Dict:
        """Generate detailed calibration report."""
        status = self.get_calibration_status()
        
        # Get recent accuracy metrics
        metrics = self.accuracy_tracker.calculate_accuracy_metrics(days_back=90)
        
        # Load calibration history
        history = []
        if os.path.exists(self.weights_file):
            try:
                with open(self.weights_file, 'r') as f:
                    data = json.load(f)
                    history = data.get('calibration_history', [])
            except Exception:
                pass
        
        return {
            'status': status,
            'current_accuracy': metrics.get('accuracy', 0.0),
            'total_predictions': metrics.get('total_predictions', 0),
            'brier_score': metrics.get('brier_score', 0.0),
            'calibration_history': history[-10:],  # Last 10 calibrations
            'recommendations': self._generate_recommendations(status, metrics)
        }
    
    def _generate_recommendations(self, status: Dict, metrics: Dict) -> List[str]:
        """Generate recommendations based on current status."""
        recommendations = []
        
        total_predictions = metrics.get('total_predictions', 0)
        
        if total_predictions < 50:
            recommendations.append(
                f"Need {50 - total_predictions} more verified predictions before calibration can run"
            )
        elif not status['calibrated']:
            recommendations.append("Run initial calibration to optimize model weights")
        else:
            # Check if calibration is stale
            last_calibrated = status.get('last_calibrated')
            if last_calibrated:
                try:
                    last_cal_time = datetime.fromisoformat(last_calibrated)
                    hours_since = (datetime.now() - last_cal_time).total_seconds() / 3600
                    
                    if hours_since > 168:  # 1 week
                        recommendations.append("Consider re-running calibration (last run over 1 week ago)")
                except Exception:
                    pass
        
        # Check component accuracy
        component_acc = status.get('component_accuracy', {})
        if component_acc:
            for comp, data in component_acc.items():
                if isinstance(data, dict) and data.get('accuracy', 0) < 0.5:
                    recommendations.append(
                        f"Component '{comp}' has low accuracy ({data['accuracy']:.1%}) - may need investigation"
                    )
        
        if not recommendations:
            recommendations.append("Model is well-calibrated. Continue monitoring performance.")
        
        return recommendations
