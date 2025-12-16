#!/usr/bin/env python3
"""
Automated training script for scheduled execution (cron job).
Runs daily to check if models need retraining and trains if needed.
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.training_pipeline import TrainingPipeline

def main():
    """Run automated training for both leagues"""
    pipeline = TrainingPipeline()
    
    print("=" * 60)
    print("Automated Training Pipeline")
    print("=" * 60)
    
    results = {}
    
    for league in ["nba", "nfl"]:
        print(f"\n[{league.upper()}] Checking if retraining is needed...")
        
        should_retrain = pipeline.should_retrain(league)
        print(f"  Should retrain: {should_retrain}")
        
        if should_retrain:
            print(f"  Starting training for {league.upper()}...")
            try:
                result = pipeline.train_model_automated(
                    league=league,
                    days_back=365,
                    use_accuracy_tracker=True,
                    min_samples=100
                )
                results[league] = {
                    "status": "completed",
                    "job_id": result.get("job_id"),
                    "metrics": result.get("metrics", {})
                }
                print(f"  ✓ Training completed for {league.upper()}")
            except Exception as e:
                results[league] = {
                    "status": "failed",
                    "error": str(e)
                }
                print(f"  ✗ Training failed for {league.upper()}: {e}")
        else:
            latest = pipeline.get_latest_model_metrics(league)
            results[league] = {
                "status": "skipped",
                "reason": "No retraining needed",
                "latest_training": latest
            }
            print(f"  ⊘ Skipped {league.upper()} (no retraining needed)")
    
    print("\n" + "=" * 60)
    print("Training Summary")
    print("=" * 60)
    for league, result in results.items():
        print(f"{league.upper()}: {result['status']}")
        if result['status'] == 'completed' and 'metrics' in result:
            metrics = result['metrics']
            print(f"  Accuracy: {metrics.get('test_accuracy', 0):.3f}")
            print(f"  Brier Score: {metrics.get('test_brier_score', 0):.3f}")
    
    return results

if __name__ == "__main__":
    main()




