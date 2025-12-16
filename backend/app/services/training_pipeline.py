"""
Automated Training Pipeline for ML Models
Handles data collection, training, and model updates automatically.
"""
import os
import json
import pickle
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import numpy as np
from app.services.model_trainer import ModelTrainer
from app.services.accuracy_tracker import AccuracyTracker
from app.services.enhanced_prediction import EnhancedPredictionEngine
from app.services.nba import NBAClient
from app.services.nfl import NFLClient


class TrainingStatus(Enum):
    """Training job status"""
    PENDING = "pending"
    COLLECTING_DATA = "collecting_data"
    TRAINING = "training"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TrainingPipeline:
    """
    Automated training pipeline that:
    1. Collects training data from verified game outcomes
    2. Trains models automatically
    3. Tracks training history and metrics
    4. Supports scheduled and on-demand training
    """
    
    def __init__(self, storage_path: str = "data/training_history.json"):
        self.storage_path = storage_path
        self.training_history: List[Dict] = []
        self.current_jobs: Dict[str, Dict] = {}  # job_id -> job_info
        # Use absolute path for accuracy tracker to ensure consistent storage
        accuracy_storage = os.path.join(os.path.dirname(storage_path), "predictions_history.json")
        self.accuracy_tracker = AccuracyTracker(storage_path=accuracy_storage)
        self.nba_client = NBAClient()
        self.nfl_client = NFLClient()
        self.load_history()
    
    def load_history(self):
        """Load training history from storage"""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r') as f:
                    data = json.load(f)
                    self.training_history = data.get('history', [])
                    self.current_jobs = data.get('current_jobs', {})
            except Exception as e:
                print(f"Error loading training history: {e}")
                self.training_history = []
                self.current_jobs = {}
    
    def save_history(self):
        """Save training history to storage"""
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        with open(self.storage_path, 'w') as f:
            json.dump({
                'history': self.training_history,
                'current_jobs': self.current_jobs
            }, f, indent=2, default=str)
    
    def collect_training_data_from_accuracy_tracker(
        self, 
        league: str, 
        days_back: Optional[int] = None
    ) -> Tuple[List[np.ndarray], List[int], List[Dict]]:
        """
        Collect training data from accuracy tracker's verified outcomes.
        This is the preferred method as it uses actual prediction data.
        
        Returns:
            (features, labels, game_metadata)
        """
        # Load all verified predictions
        verified = [
            r for r in self.accuracy_tracker.predictions_history
            if r.get("verified") and r.get("outcome") and r.get("league") == league
        ]
        
        # Filter by date if specified
        if days_back:
            cutoff_date = datetime.now() - timedelta(days=days_back)
            verified = [
                r for r in verified
                if datetime.fromisoformat(r["timestamp"].replace("Z", "")) >= cutoff_date
            ]
        
        if not verified:
            return [], [], []
        
        print(f"Found {len(verified)} verified games for {league.upper()}")
        
        # We need to reconstruct the game data and features
        # For now, we'll use a simplified approach - in production, 
        # you'd store the original game data with predictions
        features = []
        labels = []
        metadata = []
        
        # Create engine for feature extraction
        engine = EnhancedPredictionEngine()
        
        # Collect all games for form/H2H calculation
        all_games = []
        for record in verified:
            # Reconstruct minimal game dict from stored data
            game = {
                'game_id': record['game_id'],
                'league': record['league'],
                'home_team_name': record.get('home_team', ''),
                'away_team': record.get('away_team', ''),
                'game_date': record.get('game_date', ''),
                'home_record': '0-0',  # Would need to store this
                'away_record': '0-0',
                'home_team_id': record['game_id'].split('_')[0] if '_' in record['game_id'] else '',
                'away_team_id': record['game_id'].split('_')[1] if '_' in record['game_id'] else '',
            }
            all_games.append(game)
        
        # Extract features for each verified game
        for record in verified:
            try:
                # Reconstruct game
                game = {
                    'game_id': record['game_id'],
                    'league': record['league'],
                    'home_team_name': record.get('home_team', ''),
                    'away_team': record.get('away_team', ''),
                    'game_date': record.get('game_date', ''),
                    'home_record': '0-0',
                    'away_record': '0-0',
                    'home_team_id': record['game_id'].split('_')[0] if '_' in record['game_id'] else '',
                    'away_team_id': record['game_id'].split('_')[1] if '_' in record['game_id'] else '',
                }
                
                # Extract features (using empty stats/markets as we don't have historical data)
                feature_vector = engine.extract_features(
                    game,
                    {},  # home_stats
                    {},  # away_stats
                    None,  # kalshi_markets
                    all_games  # For form/H2H
                )
                
                # Label: 1 if home won, 0 if away won
                label = 1 if record['outcome']['home_won'] else 0
                
                features.append(feature_vector)
                labels.append(label)
                metadata.append({
                    'game_id': record['game_id'],
                    'timestamp': record['timestamp'],
                    'outcome': record['outcome']
                })
                
            except Exception as e:
                print(f"Error processing game {record.get('game_id')}: {e}")
                continue
        
        print(f"Extracted features for {len(features)} games")
        return np.array(features), np.array(labels), metadata
    
    def collect_training_data_from_espn(
        self,
        league: str,
        start_date: datetime,
        end_date: datetime
    ) -> Tuple[List[np.ndarray], List[int], List[Dict]]:
        """
        Collect training data directly from ESPN API for historical games.
        Fallback method when accuracy tracker doesn't have enough data.
        """
        trainer = ModelTrainer()
        features, labels = trainer.collect_training_data(league, start_date, end_date)
        
        # Create minimal metadata
        metadata = [{'source': 'espn', 'league': league} for _ in range(len(features))]
        
        return features, labels, metadata
    
    def train_model_automated(
        self,
        league: str,
        days_back: int = 365,
        use_accuracy_tracker: bool = True,
        min_samples: int = 100
    ) -> Dict:
        """
        Automated training pipeline.
        
        Args:
            league: 'nba' or 'nfl'
            days_back: Days of historical data to use
            use_accuracy_tracker: If True, use verified outcomes from accuracy tracker
            min_samples: Minimum number of samples required to train
        
        Returns:
            Training job information
        """
        job_id = f"{league}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        job_info = {
            'job_id': job_id,
            'league': league,
            'status': TrainingStatus.COLLECTING_DATA.value,
            'started_at': datetime.now().isoformat(),
            'days_back': days_back,
            'use_accuracy_tracker': use_accuracy_tracker,
            'progress': 0.0,
            'message': 'Starting data collection...'
        }
        
        self.current_jobs[job_id] = job_info
        self.save_history()
        
        try:
            # Step 1: Collect training data
            print(f"[{job_id}] Collecting training data...")
            job_info['message'] = 'Collecting training data...'
            job_info['status'] = TrainingStatus.COLLECTING_DATA.value
            self.save_history()
            
            if use_accuracy_tracker:
                features, labels, metadata = self.collect_training_data_from_accuracy_tracker(
                    league, days_back
                )
            else:
                end_date = datetime.now()
                start_date = end_date - timedelta(days=days_back)
                features, labels, metadata = self.collect_training_data_from_espn(
                    league, start_date, end_date
                )
            
            if len(features) < min_samples:
                # Try fallback to ESPN if accuracy tracker doesn't have enough
                if use_accuracy_tracker:
                    print(f"[{job_id}] Not enough data from accuracy tracker, trying ESPN...")
                    end_date = datetime.now()
                    start_date = end_date - timedelta(days=days_back)
                    features_espn, labels_espn, metadata_espn = self.collect_training_data_from_espn(
                        league, start_date, end_date
                    )
                    
                    # Combine if we have any
                    if len(features_espn) > 0:
                        features = np.vstack([features, features_espn]) if len(features) > 0 else features_espn
                        labels = np.concatenate([labels, labels_espn]) if len(labels) > 0 else labels_espn
                        metadata.extend(metadata_espn)
                
                if len(features) < min_samples:
                    raise ValueError(
                        f"Insufficient training data: {len(features)} samples "
                        f"(minimum: {min_samples})"
                    )
            
            print(f"[{job_id}] Collected {len(features)} training samples")
            job_info['samples_collected'] = len(features)
            job_info['progress'] = 0.3
            job_info['message'] = f'Collected {len(features)} samples, starting training...'
            job_info['status'] = TrainingStatus.TRAINING.value
            self.save_history()
            
            # Step 2: Train model
            print(f"[{job_id}] Training model...")
            model_path = f"models/{league}_model.pkl"
            trainer = ModelTrainer(model_path=model_path)
            
            metrics = trainer.train_model(features, labels, retrain=True)
            
            job_info['progress'] = 0.9
            job_info['message'] = 'Training complete, calculating metrics...'
            self.save_history()
            
            # Step 3: Get feature importance
            feature_importance = trainer.get_feature_importance()
            
            # Step 4: Update job info
            job_info['status'] = TrainingStatus.COMPLETED.value
            job_info['completed_at'] = datetime.now().isoformat()
            job_info['progress'] = 1.0
            job_info['message'] = 'Training completed successfully'
            job_info['metrics'] = metrics
            job_info['feature_importance'] = feature_importance
            job_info['model_path'] = model_path
            job_info['training_samples'] = len(features)
            job_info['test_samples'] = metrics.get('test_samples', 0)
            
            # Move to history
            self.training_history.append(job_info)
            if job_id in self.current_jobs:
                del self.current_jobs[job_id]
            
            self.save_history()
            
            print(f"[{job_id}] Training completed successfully")
            print(f"  Accuracy: {metrics.get('test_accuracy', 0):.3f}")
            print(f"  Brier Score: {metrics.get('test_brier_score', 0):.3f}")
            print(f"  ROC-AUC: {metrics.get('test_roc_auc', 0):.3f}")
            
            return job_info
            
        except Exception as e:
            print(f"[{job_id}] Training failed: {e}")
            job_info['status'] = TrainingStatus.FAILED.value
            job_info['completed_at'] = datetime.now().isoformat()
            job_info['error'] = str(e)
            job_info['message'] = f'Training failed: {str(e)}'
            
            # Move to history
            self.training_history.append(job_info)
            if job_id in self.current_jobs:
                del self.current_jobs[job_id]
            
            self.save_history()
            raise
    
    def get_training_status(self, job_id: Optional[str] = None) -> Dict:
        """Get status of training job(s)"""
        if job_id:
            if job_id in self.current_jobs:
                return self.current_jobs[job_id]
            # Check history
            for job in self.training_history:
                if job['job_id'] == job_id:
                    return job
            return {'error': 'Job not found'}
        
        # Return all current jobs
        return {
            'current_jobs': list(self.current_jobs.values()),
            'recent_history': self.training_history[-10:] if self.training_history else []
        }
    
    def get_training_history(
        self,
        league: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get training history, optionally filtered by league"""
        history = self.training_history
        
        if league:
            history = [h for h in history if h.get('league') == league]
        
        return history[-limit:]
    
    def get_latest_model_metrics(self, league: str) -> Optional[Dict]:
        """Get metrics from the most recent successful training for a league"""
        history = self.get_training_history(league=league, limit=1)
        
        if not history:
            return None
        
        latest = history[0]
        if latest.get('status') == TrainingStatus.COMPLETED.value:
            return {
                'job_id': latest['job_id'],
                'completed_at': latest.get('completed_at'),
                'metrics': latest.get('metrics', {}),
                'feature_importance': latest.get('feature_importance', {}),
                'training_samples': latest.get('training_samples', 0)
            }
        
        return None
    
    def should_retrain(
        self,
        league: str,
        days_since_last_training: int = 7,
        min_new_games: int = 20
    ) -> bool:
        """
        Determine if model should be retrained based on:
        - Time since last training
        - Number of new verified games
        """
        # Check last training time
        history = self.get_training_history(league=league, limit=1)
        if not history:
            return True  # Never trained
        
        last_training = history[0]
        if last_training.get('status') != TrainingStatus.COMPLETED.value:
            return True  # Last training failed
        
        last_training_time = datetime.fromisoformat(
            last_training.get('completed_at', datetime.now().isoformat())
        )
        days_since = (datetime.now() - last_training_time).days
        
        if days_since >= days_since_last_training:
            return True
        
        # Check for new verified games
        verified = [
            r for r in self.accuracy_tracker.predictions_history
            if r.get("verified") and r.get("league") == league
        ]
        
        if verified:
            last_verified_time = datetime.fromisoformat(
                verified[-1].get("verified_at", datetime.now().isoformat())
            )
            new_games = [
                r for r in verified
                if datetime.fromisoformat(r.get("verified_at", datetime.now().isoformat())) > last_training_time
            ]
            
            if len(new_games) >= min_new_games:
                return True
        
        return False
    
    def auto_train_if_needed(self, league: str) -> Optional[Dict]:
        """
        Automatically train if conditions are met.
        Call this periodically (e.g., daily cron job).
        """
        if self.should_retrain(league):
            print(f"Auto-training {league.upper()} model...")
            return self.train_model_automated(league, days_back=365, use_accuracy_tracker=True)
        else:
            print(f"No retraining needed for {league.upper()}")
            return None

