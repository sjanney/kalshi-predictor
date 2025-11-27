"""
Model Training Script for Enhanced Prediction Engine
Trains the ML model on historical game data with outcomes.
"""
import pickle
import os
import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, roc_auc_score
import pandas as pd
from app.services.enhanced_prediction import EnhancedPredictionEngine
from app.services.nba import NBAClient
from app.services.nfl import NFLClient

class ModelTrainer:
    """
    Trains the prediction model on historical data.
    """
    
    def __init__(self, model_path: str = "models/prediction_model.pkl"):
        self.model_path = model_path
        self.engine = EnhancedPredictionEngine(model_path=model_path)
        self.nba_client = NBAClient()
        self.nfl_client = NFLClient()
    
    def collect_training_data(self, league: str, start_date: datetime, end_date: datetime) -> Tuple[List[np.ndarray], List[int]]:
        """
        Collect training data from historical games.
        
        Args:
            league: 'nba' or 'nfl'
            start_date: Start of date range
            end_date: End of date range
            
        Returns:
            Tuple of (features, labels) where labels are 1 if home team won, 0 otherwise
        """
        features = []
        labels = []
        
        # Iterate through date range
        current_date = start_date
        all_games = []
        
        print(f"Collecting training data for {league.upper()} from {start_date.date()} to {end_date.date()}")
        
        while current_date <= end_date:
            try:
                date_str = current_date.strftime("%Y%m%d")
                
                # Fetch games for this date
                if league == "nba":
                    games = self.nba_client.get_scoreboard(date_str)
                else:
                    games = self.nfl_client.get_scoreboard(date_str)
                
                # Process each game
                for game in games:
                    # Only use completed games
                    if game.get('status') == 'Final' or 'Final' in str(game.get('status', '')):
                        try:
                            home_score = int(game.get('home_score', 0))
                            away_score = int(game.get('away_score', 0))
                            
                            # Skip if no scores
                            if home_score == 0 and away_score == 0:
                                continue
                            
                            # Label: 1 if home won, 0 if away won
                            label = 1 if home_score > away_score else 0
                            
                            # Extract features (need to simulate market data for historical games)
                            # In production, you'd fetch historical Kalshi market data
                            mock_markets = None  # Could use historical odds as proxy
                            
                            # Get features
                            feature_vector = self.engine.extract_features(
                                game,
                                {},  # home_stats
                                {},  # away_stats
                                mock_markets,
                                all_games  # Use all games seen so far for form/H2H
                            )
                            
                            features.append(feature_vector)
                            labels.append(label)
                            all_games.append(game)
                            
                        except Exception as e:
                            print(f"Error processing game {game.get('game_id')}: {e}")
                            continue
                
            except Exception as e:
                print(f"Error fetching games for {current_date.date()}: {e}")
            
            current_date += timedelta(days=1)
        
        print(f"Collected {len(features)} training samples")
        return np.array(features), np.array(labels)
    
    def train_model(self, features: np.ndarray, labels: np.ndarray, 
                   test_size: float = 0.2, retrain: bool = False) -> Dict:
        """
        Train the model and return performance metrics.
        
        Args:
            features: Feature matrix
            labels: Target labels
            test_size: Proportion of data for testing
            retrain: If True, retrain even if model exists
            
        Returns:
            Dictionary with training metrics
        """
        if len(features) == 0:
            raise ValueError("No training data provided")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            features, labels, test_size=test_size, random_state=42, stratify=labels
        )
        
        print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples")
        
        # Train model
        base_model = GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=6,
            min_samples_split=20,
            min_samples_leaf=10,
            subsample=0.8,
            random_state=42,
            verbose=1
        )
        
        # Calibrate for better probability estimates
        model = CalibratedClassifierCV(base_model, method='isotonic', cv=5)
        
        print("Training model...")
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        
        accuracy = accuracy_score(y_test, y_pred)
        brier = brier_score_loss(y_test, y_pred_proba)
        logloss = log_loss(y_test, y_pred_proba)
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        
        # Cross-validation
        print("Running cross-validation...")
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
        
        metrics = {
            "test_accuracy": accuracy,
            "test_brier_score": brier,
            "test_log_loss": logloss,
            "test_roc_auc": roc_auc,
            "cv_accuracy_mean": cv_scores.mean(),
            "cv_accuracy_std": cv_scores.std(),
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "feature_count": features.shape[1]
        }
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump(model, f)
        
        print(f"Model saved to {self.model_path}")
        print(f"Test Accuracy: {accuracy:.3f}")
        print(f"Test Brier Score: {brier:.3f} (lower is better)")
        print(f"Test Log Loss: {logloss:.3f} (lower is better)")
        print(f"Test ROC-AUC: {roc_auc:.3f} (higher is better)")
        print(f"CV Accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
        
        return metrics
    
    def train_from_database(self, league: str, days_back: int = 365) -> Dict:
        """
        Train model from database of historical games.
        This is the recommended approach if you have a database.
        
        Args:
            league: 'nba' or 'nfl'
            days_back: How many days of historical data to use
            
        Returns:
            Training metrics
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        features, labels = self.collect_training_data(league, start_date, end_date)
        
        if len(features) == 0:
            raise ValueError(f"No training data found for {league} in the last {days_back} days")
        
        return self.train_model(features, labels)
    
    def get_feature_importance(self) -> Dict[str, float]:
        """
        Get feature importance from trained model.
        """
        if not os.path.exists(self.model_path):
            return {}
        
        with open(self.model_path, 'rb') as f:
            model = pickle.load(f)
        
        # Get base estimator (CalibratedClassifierCV wraps it)
        base_estimator = model.base_estimator if hasattr(model, 'base_estimator') else model
        
        if hasattr(base_estimator, 'feature_importances_'):
            feature_names = [
                "home_elo", "away_elo", "elo_diff",
                "home_win_pct", "away_win_pct", "win_pct_diff",
                "home_form_win_pct", "away_form_win_pct",
                "home_form_avg_diff", "away_form_avg_diff",
                "home_form_momentum", "away_form_momentum",
                "h2h_home_win_pct", "h2h_avg_diff",
                "kalshi_prob", "volume_norm",
                "net_rating", "home_off_eff", "away_off_eff"
            ]
            
            importances = base_estimator.feature_importances_
            return dict(zip(feature_names, importances))
        
        return {}


def train_nba_model(days_back: int = 365):
    """Convenience function to train NBA model"""
    trainer = ModelTrainer("models/nba_model.pkl")
    return trainer.train_from_database("nba", days_back)


def train_nfl_model(days_back: int = 365):
    """Convenience function to train NFL model"""
    trainer = ModelTrainer("models/nfl_model.pkl")
    return trainer.train_from_database("nfl", days_back)


if __name__ == "__main__":
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description="Train prediction model")
    parser.add_argument("--league", choices=["nba", "nfl"], required=True)
    parser.add_argument("--days", type=int, default=365, help="Days of historical data")
    parser.add_argument("--model-path", help="Custom model path")
    
    args = parser.parse_args()
    
    model_path = args.model_path or f"models/{args.league}_model.pkl"
    trainer = ModelTrainer(model_path)
    
    metrics = trainer.train_from_database(args.league, args.days)
    
    print("\n=== Training Complete ===")
    print(f"Feature Importance:")
    importance = trainer.get_feature_importance()
    for feature, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {feature}: {imp:.4f}")




