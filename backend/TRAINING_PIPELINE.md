# Automated Training Pipeline

## Overview

The training pipeline automatically collects training data from verified game outcomes and trains ML models for NBA and NFL predictions. It supports both manual triggering and scheduled automatic training.

## Features

- ✅ **Automatic Data Collection**: Uses verified outcomes from accuracy tracker
- ✅ **Background Training**: Training jobs run asynchronously
- ✅ **Training History**: Tracks all training jobs with metrics
- ✅ **Smart Retraining**: Automatically determines when retraining is needed
- ✅ **Dual Data Sources**: Uses accuracy tracker (preferred) or ESPN API (fallback)
- ✅ **League-Specific Models**: Separate models for NBA and NFL

## Quick Start

### Manual Training via API

```bash
# Train NBA model
curl -X POST "http://localhost:8000/api/training/train?league=nba&days_back=365"

# Train NFL model
curl -X POST "http://localhost:8000/api/training/train?league=nfl&days_back=365"
```

### Check Training Status

```bash
# Get all current jobs
curl "http://localhost:8000/api/training/status"

# Get specific job
curl "http://localhost:8000/api/training/status?job_id=nba_20240101_120000"
```

### Get Latest Metrics

```bash
# NBA model metrics
curl "http://localhost:8000/api/training/metrics/nba"

# NFL model metrics
curl "http://localhost:8000/api/training/metrics/nfl"
```

## API Endpoints

### POST `/api/training/train`

Trigger a training job.

**Parameters:**
- `league` (required): `nba` or `nfl`
- `days_back` (optional, default: 365): Days of historical data
- `use_accuracy_tracker` (optional, default: true): Use verified outcomes
- `min_samples` (optional, default: 100): Minimum samples required

**Response:**
```json
{
  "message": "Training job started for NBA",
  "league": "nba",
  "status": "pending"
}
```

### GET `/api/training/status`

Get training job status.

**Parameters:**
- `job_id` (optional): Specific job ID to check

**Response:**
```json
{
  "current_jobs": [...],
  "recent_history": [...]
}
```

### GET `/api/training/history`

Get training history.

**Parameters:**
- `league` (optional): Filter by league
- `limit` (optional, default: 50): Max records

### GET `/api/training/metrics/{league}`

Get latest training metrics for a league.

### POST `/api/training/auto-train/{league}`

Automatically train if conditions are met (for scheduled jobs).

### GET `/api/training/should-retrain/{league}`

Check if retraining is needed.

## Scheduled Training

### Option 1: Cron Job (Recommended)

Add to your crontab to run daily:

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/backend && python scripts/auto_train.py >> logs/training.log 2>&1
```

### Option 2: API Endpoint

Call from an external scheduler:

```bash
curl -X POST "http://localhost:8000/api/training/auto-train/nba"
curl -X POST "http://localhost:8000/api/training/auto-train/nfl"
```

### Option 3: Python Script

```python
from app.services.training_pipeline import TrainingPipeline

pipeline = TrainingPipeline()

# Auto-train NBA if needed
result = pipeline.auto_train_if_needed("nba")

# Auto-train NFL if needed
result = pipeline.auto_train_if_needed("nfl")
```

## Retraining Logic

The pipeline automatically retrains when:

1. **Time-based**: 7+ days since last training
2. **Data-based**: 20+ new verified games since last training
3. **Failure-based**: Last training failed

You can customize these thresholds:

```python
pipeline.should_retrain(
    league="nba",
    days_since_last_training=7,  # Days before retraining
    min_new_games=20  # Minimum new games needed
)
```

## Training Data Sources

### Primary: Accuracy Tracker (Preferred)

Uses verified game outcomes from the accuracy tracker. This is preferred because:
- Uses actual prediction data
- Includes all model features
- More accurate feature extraction

### Fallback: ESPN API

If accuracy tracker doesn't have enough data, falls back to ESPN API:
- Fetches historical completed games
- Extracts features from game data
- Less ideal but works when starting fresh

## Training Process

1. **Data Collection** (30% progress)
   - Collects verified games from accuracy tracker
   - Falls back to ESPN if needed
   - Validates minimum sample size

2. **Feature Extraction** (30-60% progress)
   - Extracts 19 features per game
   - Includes Elo, form, H2H, market data
   - Normalizes and validates features

3. **Model Training** (60-90% progress)
   - Splits into train/test sets
   - Trains Gradient Boosting model
   - Calibrates probabilities
   - Evaluates performance

4. **Metrics & Storage** (90-100% progress)
   - Calculates accuracy, Brier score, ROC-AUC
   - Gets feature importance
   - Saves model to disk
   - Records in training history

## Training Metrics

After training, you get:

- **Test Accuracy**: Percentage of correct predictions
- **Brier Score**: Probability calibration (lower is better)
- **Log Loss**: Prediction quality (lower is better)
- **ROC-AUC**: Model discrimination (higher is better)
- **Feature Importance**: Which features matter most

Example metrics:
```json
{
  "test_accuracy": 0.623,
  "test_brier_score": 0.214,
  "test_log_loss": 0.589,
  "test_roc_auc": 0.687,
  "cv_accuracy_mean": 0.615,
  "cv_accuracy_std": 0.032
}
```

## Model Storage

Trained models are saved to:
- `models/nba_model.pkl` - NBA model
- `models/nfl_model.pkl` - NFL model

The `EnhancedPredictionEngine` automatically loads the appropriate model based on league.

## Training History

All training jobs are stored in `data/training_history.json`:

```json
{
  "history": [
    {
      "job_id": "nba_20240101_120000",
      "league": "nba",
      "status": "completed",
      "started_at": "2024-01-01T12:00:00",
      "completed_at": "2024-01-01T12:15:30",
      "metrics": {...},
      "feature_importance": {...},
      "training_samples": 1250,
      "test_samples": 250
    }
  ],
  "current_jobs": {}
}
```

## Monitoring

### Check Training Status

```python
from app.services.training_pipeline import TrainingPipeline

pipeline = TrainingPipeline()

# Get all current jobs
status = pipeline.get_training_status()

# Get specific job
job_status = pipeline.get_training_status("nba_20240101_120000")
```

### View Training History

```python
# Get last 10 trainings
history = pipeline.get_training_history(limit=10)

# Get NBA training history
nba_history = pipeline.get_training_history(league="nba")
```

### Get Latest Metrics

```python
# Get latest NBA model metrics
metrics = pipeline.get_latest_model_metrics("nba")

if metrics:
    print(f"Accuracy: {metrics['metrics']['test_accuracy']:.3f}")
    print(f"Brier Score: {metrics['metrics']['test_brier_score']:.3f}")
```

## Troubleshooting

### "Insufficient training data"

**Problem**: Not enough verified games to train.

**Solutions**:
1. Wait for more games to complete and be verified
2. Reduce `min_samples` parameter (not recommended)
3. Use ESPN fallback by setting `use_accuracy_tracker=false`
4. Increase `days_back` to get more historical data

### Training Takes Too Long

**Problem**: Training is slow.

**Solutions**:
1. Reduce `days_back` to use less data
2. Increase `min_samples` to skip if too few samples
3. Run training in background (default behavior)

### Model Not Improving

**Problem**: Accuracy not increasing after training.

**Solutions**:
1. Check feature importance - are important features being used?
2. Verify data quality - are outcomes being recorded correctly?
3. Try different hyperparameters in `ModelTrainer`
4. Collect more training data

### Background Job Not Running

**Problem**: Training doesn't start in background.

**Solutions**:
1. Ensure FastAPI BackgroundTasks is working
2. Check server logs for errors
3. Use the Python script directly: `python scripts/auto_train.py`

## Best Practices

1. **Regular Training**: Train weekly or after each game week
2. **Monitor Metrics**: Track accuracy over time
3. **Feature Importance**: Review which features matter most
4. **Data Quality**: Ensure outcomes are verified correctly
5. **Backup Models**: Keep previous model versions
6. **Logging**: Monitor training logs for errors

## Integration

The training pipeline integrates with:

- **Accuracy Tracker**: Source of verified outcomes
- **Enhanced Prediction Engine**: Uses trained models
- **Model Trainer**: Handles actual training
- **NBA/NFL Clients**: Fallback data source

## Next Steps

1. Set up scheduled training (cron job)
2. Monitor first training run
3. Review metrics and feature importance
4. Adjust retraining thresholds as needed
5. Set up alerts for training failures

The pipeline will automatically improve your predictions as more data becomes available!

