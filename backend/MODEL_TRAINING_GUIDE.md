# ML Model Training Guide

## Overview

The enhanced prediction engine includes a machine learning component that needs to be trained on historical game data to be effective. Currently, the model is just a placeholder structure.

## Why Training is Needed

The ML model uses **19 features** to predict game outcomes:
- Elo ratings (home, away, difference)
- Win percentages (season, recent form)
- Point differentials and momentum
- Head-to-head statistics
- Market data (price, volume)
- Advanced metrics

Without training, the model returns default probabilities (0.5). After training on historical data, it learns which features are most predictive and can improve accuracy by **3-8%**.

## Training Process

### Step 1: Collect Historical Data

You need historical games with:
- Game outcomes (home team won/lost)
- Scores
- Team records
- Market data (if available)

### Step 2: Extract Features

For each historical game, extract the 19 features using the `EnhancedPredictionEngine.extract_features()` method.

### Step 3: Train Model

Use the `ModelTrainer` class to:
1. Collect training data
2. Split into train/test sets
3. Train Gradient Boosting model
4. Calibrate probabilities
5. Evaluate performance

## Quick Start

### Option 1: Train from ESPN API (Limited)

```python
from app.services.model_trainer import train_nba_model, train_nfl_model

# Train NBA model on last 365 days
metrics = train_nba_model(days_back=365)

# Train NFL model
metrics = train_nfl_model(days_back=365)
```

### Option 2: Train from Database (Recommended)

If you have a database of historical games:

```python
from app.services.model_trainer import ModelTrainer
import pandas as pd

trainer = ModelTrainer("models/nba_model.pkl")

# Load your historical data
games_df = pd.read_csv("historical_games.csv")  # Your data

# Convert to format expected by trainer
features = []
labels = []

for _, game in games_df.iterrows():
    # Extract features
    feature_vector = trainer.engine.extract_features(
        game.to_dict(),
        {},
        {},
        None,  # Market data if available
        all_games  # Historical games for form/H2H
    )
    features.append(feature_vector)
    
    # Label: 1 if home won, 0 if away won
    labels.append(1 if game['home_score'] > game['away_score'] else 0)

# Train
metrics = trainer.train_model(np.array(features), np.array(labels))
```

### Option 3: Command Line

```bash
# Train NBA model
python -m app.services.model_trainer --league nba --days 365

# Train NFL model
python -m app.services.model_trainer --league nfl --days 365

# Custom model path
python -m app.services.model_trainer --league nba --model-path models/custom_model.pkl
```

## Training Requirements

### Minimum Data
- **At least 100 games** for basic training
- **500+ games** for reliable performance
- **1000+ games** for optimal performance

### Data Quality
- Games must have final scores
- Team records should be accurate
- Market data improves accuracy but isn't required

## Expected Performance

After training, you should see:

| Metric | Target |
|--------|--------|
| Accuracy | 55-65% (better than 50% random) |
| Brier Score | < 0.25 (lower is better) |
| Log Loss | < 0.65 (lower is better) |
| ROC-AUC | > 0.60 (higher is better) |

## Model Updates

### When to Retrain

1. **Weekly**: After each week of games
2. **Monthly**: Full retrain with all new data
3. **Seasonally**: At start of new season

### Retraining Process

```python
# Load existing model
trainer = ModelTrainer("models/nba_model.pkl")

# Collect new data
features, labels = trainer.collect_training_data("nba", start_date, end_date)

# Retrain (model will be updated)
metrics = trainer.train_model(features, labels, retrain=True)
```

## Feature Importance

After training, check which features matter most:

```python
trainer = ModelTrainer("models/nba_model.pkl")
importance = trainer.get_feature_importance()

# Top features
for feature, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]:
    print(f"{feature}: {imp:.4f}")
```

Commonly important features:
- Elo ratings
- Recent form
- Market probabilities
- Head-to-head history

## Integration

Once trained, the model is automatically used by `EnhancedPredictionEngine`:

```python
engine = EnhancedPredictionEngine(model_path="models/nba_model.pkl")
prediction = engine.generate_prediction(...)
# prediction['prediction']['ml_prob'] will now use trained model
```

## Troubleshooting

### "No training data found"
- Check date range has completed games
- Verify API is returning game data
- Ensure games have final scores

### Low Accuracy (< 50%)
- Need more training data
- Check data quality
- Verify feature extraction is working

### Model Not Improving
- Try different hyperparameters
- Add more features
- Check for data leakage

## Best Practices

1. **Start Small**: Train on recent season first
2. **Validate**: Always use train/test split
3. **Monitor**: Track performance over time
4. **Iterate**: Adjust based on feature importance
5. **Calibrate**: Use CalibratedClassifierCV for better probabilities

## Next Steps

1. Set up historical data collection
2. Run initial training
3. Evaluate performance
4. Set up automated retraining schedule
5. Monitor and improve

The model will improve as you collect more data and retrain regularly!

