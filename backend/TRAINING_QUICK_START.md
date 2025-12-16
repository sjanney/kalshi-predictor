# Training Pipeline - Quick Start Guide

## 🚀 Quick Start

### 1. Manual Training (API)

```bash
# Train NBA model
curl -X POST "http://localhost:8000/api/training/train?league=nba"

# Train NFL model  
curl -X POST "http://localhost:8000/api/training/train?league=nfl"
```

### 2. Check Status

```bash
# See all training jobs
curl "http://localhost:8000/api/training/status"

# See latest metrics
curl "http://localhost:8000/api/training/metrics/nba"
```

### 3. Automated Training (Cron)

Add to crontab:
```bash
0 2 * * * cd /path/to/backend && python scripts/auto_train.py
```

Or use the API endpoint:
```bash
curl -X POST "http://localhost:8000/api/training/auto-train/nba"
curl -X POST "http://localhost:8000/api/training/auto-train/nfl"
```

## 📊 What Gets Trained?

The pipeline trains ML models that predict game outcomes using:
- Elo ratings
- Recent form (last 5 games)
- Head-to-head history
- Market probabilities
- Team records
- Advanced metrics

## 🔄 When Does It Retrain?

Automatically retrains when:
- ✅ 7+ days since last training
- ✅ 20+ new verified games available
- ✅ Last training failed

## 📈 Expected Results

After training, you should see:
- **Accuracy**: 55-65% (better than 50% random)
- **Brier Score**: < 0.25 (lower is better)
- **ROC-AUC**: > 0.60 (higher is better)

## 🛠️ Troubleshooting

**Not enough data?**
- Wait for more games to complete
- Reduce `min_samples` (not recommended)
- Increase `days_back` parameter

**Training slow?**
- Runs in background by default
- Check status endpoint for progress

**Model not improving?**
- Check feature importance
- Verify data quality
- Collect more training data

## 📚 Full Documentation

See `TRAINING_PIPELINE.md` for complete documentation.




