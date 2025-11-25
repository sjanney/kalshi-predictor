"""
Accuracy tracking and backtesting framework for predictions.
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import json
import os
from collections import defaultdict
import numpy as np

class AccuracyTracker:
    """
    Tracks prediction accuracy and provides backtesting capabilities.
    """
    
    def __init__(self, storage_path: str = "data/predictions_history.json"):
        self.storage_path = storage_path
        self.predictions_history: List[Dict] = []
        self.load_history()
    
    def load_history(self):
        """Load prediction history from storage"""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r') as f:
                    self.predictions_history = json.load(f)
            except Exception as e:
                print(f"Error loading prediction history: {e}")
                self.predictions_history = []
    
    def save_history(self):
        """Save prediction history to storage"""
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        with open(self.storage_path, 'w') as f:
            json.dump(self.predictions_history, f, indent=2, default=str)
    
    def record_prediction(self, prediction: Dict, game_id: str, league: str):
        """Record a prediction before the game"""
        record = {
            "game_id": game_id,
            "league": league,
            "timestamp": datetime.now().isoformat(),
            "prediction": {
                "home_win_prob": prediction.get("prediction", {}).get("home_win_prob"),
                "stat_model_prob": prediction.get("prediction", {}).get("stat_model_prob"),
                "kalshi_prob": prediction.get("prediction", {}).get("kalshi_prob"),
                "elo_prob": prediction.get("analytics", {}).get("elo_ratings", {}).get("home"),
                "form_prob": prediction.get("analytics", {}).get("recent_form", {}).get("home", {}).get("win_pct"),
            },
            "home_team": prediction.get("home_team"),
            "away_team": prediction.get("away_team"),
            "game_date": prediction.get("game_date"),
            "outcome": None,  # Will be filled after game
            "verified": False
        }
        
        self.predictions_history.append(record)
        self.save_history()
    
    def record_outcome(self, game_id: str, home_won: bool, home_score: int, away_score: int):
        """Record game outcome after it finishes"""
        for record in self.predictions_history:
            if record["game_id"] == game_id and not record.get("verified", False):
                record["outcome"] = {
                    "home_won": home_won,
                    "home_score": home_score,
                    "away_score": away_score
                }
                record["verified"] = True
                record["verified_at"] = datetime.now().isoformat()
                self.save_history()
                break
    
    def calculate_accuracy_metrics(self, days_back: int = 30) -> Dict:
        """Calculate accuracy metrics for recent predictions"""
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        verified = [
            r for r in self.predictions_history
            if r.get("verified") and r.get("outcome") and
            datetime.fromisoformat(r["timestamp"].replace("Z", "")) >= cutoff_date
        ]
        
        if not verified:
            return {
                "total_predictions": 0,
                "accuracy": 0.0,
                "brier_score": 0.0,
                "log_loss": 0.0,
                "calibration": {}
            }
        
        correct = 0
        brier_scores = []
        log_losses = []
        calibration_buckets = defaultdict(lambda: {"predicted": 0, "actual": 0})
        
        for record in verified:
            pred_prob = record["prediction"]["home_win_prob"]
            actual = 1 if record["outcome"]["home_won"] else 0
            
            # Binary accuracy
            predicted_win = pred_prob > 0.5
            if predicted_win == record["outcome"]["home_won"]:
                correct += 1
            
            # Brier score (lower is better)
            brier = (pred_prob - actual) ** 2
            brier_scores.append(brier)
            
            # Log loss
            eps = 1e-15
            log_loss = -(actual * np.log(max(pred_prob, eps)) + 
                        (1 - actual) * np.log(max(1 - pred_prob, eps)))
            log_losses.append(log_loss)
            
            # Calibration buckets
            bucket = int(pred_prob * 10) / 10  # Round to 0.1
            calibration_buckets[bucket]["predicted"] += 1
            calibration_buckets[bucket]["actual"] += actual
        
        # Calculate calibration
        calibration = {}
        for bucket, data in calibration_buckets.items():
            if data["predicted"] > 0:
                calibration[bucket] = {
                    "predicted_prob": bucket,
                    "actual_rate": data["actual"] / data["predicted"],
                    "count": data["predicted"]
                }
        
        return {
            "total_predictions": len(verified),
            "accuracy": correct / len(verified) if verified else 0.0,
            "brier_score": np.mean(brier_scores) if brier_scores else 0.0,
            "log_loss": np.mean(log_losses) if log_losses else 0.0,
            "calibration": calibration,
            "by_model": self._calculate_model_accuracy(verified)
        }
    
    def _calculate_model_accuracy(self, verified: List[Dict]) -> Dict:
        """Calculate accuracy by model component"""
        models = {
            "stat_model": [],
            "kalshi": [],
            "elo": [],
            "form": []
        }
        
        for record in verified:
            pred = record["prediction"]
            actual = 1 if record["outcome"]["home_won"] else 0
            
            if pred.get("stat_model_prob") is not None:
                models["stat_model"].append({
                    "pred": pred["stat_model_prob"],
                    "actual": actual
                })
            
            if pred.get("kalshi_prob") is not None:
                models["kalshi"].append({
                    "pred": pred["kalshi_prob"],
                    "actual": actual
                })
            
            if pred.get("elo_prob") is not None:
                models["elo"].append({
                    "pred": pred["elo_prob"],
                    "actual": actual
                })
        
        results = {}
        for model_name, predictions in models.items():
            if predictions:
                correct = sum(1 for p in predictions if (p["pred"] > 0.5) == (p["actual"] == 1))
                brier = np.mean([(p["pred"] - p["actual"]) ** 2 for p in predictions])
                results[model_name] = {
                    "accuracy": correct / len(predictions),
                    "brier_score": brier,
                    "count": len(predictions)
                }
        
        return results
    
    def get_prediction_performance(self, game_id: str) -> Optional[Dict]:
        """Get performance for a specific prediction"""
        for record in self.predictions_history:
            if record["game_id"] == game_id:
                if not record.get("verified"):
                    return {"status": "pending", "prediction": record}
                
                outcome = record["outcome"]
                pred_prob = record["prediction"]["home_win_prob"]
                actual = 1 if outcome["home_won"] else 0
                
                error = abs(pred_prob - actual)
                correct = (pred_prob > 0.5) == outcome["home_won"]
                
                return {
                    "status": "verified",
                    "prediction": record,
                    "error": error,
                    "correct": correct,
                    "brier_score": (pred_prob - actual) ** 2
                }
        
        return None
    
    def backtest_strategy(self, strategy_func, start_date: datetime, end_date: datetime) -> Dict:
        """
        Backtest a trading strategy.
        strategy_func should take a prediction dict and return a trade decision.
        """
        # Filter predictions in date range
        relevant = [
            r for r in self.predictions_history
            if r.get("verified") and r.get("outcome")
        ]
        
        relevant = [
            r for r in relevant
            if start_date <= datetime.fromisoformat(r["timestamp"].replace("Z", "")) <= end_date
        ]
        
        trades = []
        total_pnl = 0.0
        total_risk = 0.0
        
        for record in relevant:
            trade = strategy_func(record)
            if trade:
                outcome = record["outcome"]
                pred_prob = record["prediction"]["home_win_prob"]
                
                # Simplified P&L calculation
                # In reality, would use actual market prices
                if trade["side"] == "YES":
                    if outcome["home_won"]:
                        pnl = (1.0 - trade["price"]) * trade["size"]
                    else:
                        pnl = -trade["price"] * trade["size"]
                else:  # NO
                    if not outcome["home_won"]:
                        pnl = (1.0 - (1.0 - trade["price"])) * trade["size"]
                    else:
                        pnl = -(1.0 - trade["price"]) * trade["size"]
                
                total_pnl += pnl
                total_risk += trade["size"]
                
                trades.append({
                    "game_id": record["game_id"],
                    "trade": trade,
                    "pnl": pnl,
                    "outcome": outcome
                })
        
        return {
            "total_trades": len(trades),
            "total_pnl": total_pnl,
            "total_risk": total_risk,
            "roi": (total_pnl / total_risk * 100) if total_risk > 0 else 0.0,
            "win_rate": sum(1 for t in trades if t["pnl"] > 0) / len(trades) if trades else 0.0,
            "trades": trades
        }

