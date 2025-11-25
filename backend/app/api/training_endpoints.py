"""
API endpoints for model training pipeline.
NOTE: These endpoints are intended for administrative/background use and are NOT currently used by the frontend.
"""
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Optional, Dict, List
from app.services.training_pipeline import TrainingPipeline

router = APIRouter()
training_pipeline = TrainingPipeline()


@router.post("/training/train")
async def trigger_training(
    league: str = Query(..., enum=["nba", "nfl"]),
    days_back: int = Query(365, ge=30, le=730),
    use_accuracy_tracker: bool = Query(True),
    min_samples: int = Query(100, ge=50),
    background_tasks: BackgroundTasks = None
) -> Dict:
    """
    Trigger a training job for a specific league.
    Training runs in the background.
    
    Args:
        league: 'nba' or 'nfl'
        days_back: Days of historical data to use
        use_accuracy_tracker: Use verified outcomes from accuracy tracker
        min_samples: Minimum samples required to train
    """
    try:
        # Run training in background
        def run_training():
            try:
                training_pipeline.train_model_automated(
                    league=league,
                    days_back=days_back,
                    use_accuracy_tracker=use_accuracy_tracker,
                    min_samples=min_samples
                )
            except Exception as e:
                print(f"Background training failed: {e}")
        
        if background_tasks:
            background_tasks.add_task(run_training)
            return {
                "message": f"Training job started for {league.upper()}",
                "league": league,
                "status": "pending"
            }
        else:
            # Run synchronously if no background tasks
            job_info = training_pipeline.train_model_automated(
                league=league,
                days_back=days_back,
                use_accuracy_tracker=use_accuracy_tracker,
                min_samples=min_samples
            )
            return job_info
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/training/status")
async def get_training_status(
    job_id: Optional[str] = Query(None, description="Specific job ID to check")
) -> Dict:
    """
    Get status of training job(s).
    If job_id is provided, returns status for that job.
    Otherwise, returns all current jobs and recent history.
    """
    return training_pipeline.get_training_status(job_id)


@router.get("/training/history")
async def get_training_history(
    league: Optional[str] = Query(None, enum=["nba", "nfl"]),
    limit: int = Query(50, ge=1, le=200)
) -> Dict:
    """
    Get training history.
    
    Args:
        league: Filter by league (optional)
        limit: Maximum number of records to return
    """
    history = training_pipeline.get_training_history(league=league, limit=limit)
    return {
        "history": history,
        "count": len(history)
    }


@router.get("/training/metrics/{league}")
async def get_latest_metrics(league: str) -> Dict:
    """
    Get metrics from the most recent successful training for a league.
    """
    if league not in ["nba", "nfl"]:
        raise HTTPException(status_code=400, detail="Invalid league. Must be 'nba' or 'nfl'")
    
    metrics = training_pipeline.get_latest_model_metrics(league)
    
    if not metrics:
        raise HTTPException(
            status_code=404,
            detail=f"No completed training found for {league.upper()}"
        )
    
    return metrics


@router.post("/training/auto-train/{league}")
async def auto_train_if_needed(league: str) -> Dict:
    """
    Automatically train if conditions are met (new games, time since last training, etc.).
    This is the endpoint to call from a scheduled job/cron.
    """
    if league not in ["nba", "nfl"]:
        raise HTTPException(status_code=400, detail="Invalid league. Must be 'nba' or 'nfl'")
    
    result = training_pipeline.auto_train_if_needed(league)
    
    if result:
        return {
            "message": f"Auto-training triggered for {league.upper()}",
            "job_id": result.get("job_id"),
            "status": "started"
        }
    else:
        return {
            "message": f"No retraining needed for {league.upper()}",
            "status": "skipped"
        }


@router.get("/training/should-retrain/{league}")
async def check_should_retrain(league: str) -> Dict:
    """
    Check if model should be retrained based on current conditions.
    """
    if league not in ["nba", "nfl"]:
        raise HTTPException(status_code=400, detail="Invalid league. Must be 'nba' or 'nfl'")
    
    should_retrain = training_pipeline.should_retrain(league)
    
    latest_metrics = training_pipeline.get_latest_model_metrics(league)
    
    return {
        "should_retrain": should_retrain,
        "latest_training": latest_metrics,
        "league": league
    }
