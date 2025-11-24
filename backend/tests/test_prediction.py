import pytest
from app.services.prediction import PredictionEngine

def test_calculate_record_win_prob():
    engine = PredictionEngine()
    assert engine.calculate_record_win_prob("10-0") == 1.0
    assert engine.calculate_record_win_prob("0-10") == 0.0
    assert engine.calculate_record_win_prob("5-5") == 0.5
    assert engine.calculate_record_win_prob("N/A") == 0.5

def test_generate_prediction_structure():
    engine = PredictionEngine()
    game = {
        "game_id": "123",
        "home_team_name": "Celtics",
        "away_team_name": "Lakers",
        "home_record": "10-5",
        "away_record": "5-10",
        "game_date": "2023-01-01",
        "status": "Scheduled"
    }
    market = {
        "last_price": 60,
        "yes_bid": 55,
        "yes_ask": 65,
        "volume_24h": 1000
    }
    
    result = engine.generate_prediction(game, {}, {}, market)
    
    assert "prediction" in result
    assert "stat_model_prob" in result["prediction"]
    assert "kalshi_prob" in result["prediction"]
    assert result["prediction"]["kalshi_prob"] == 0.60
    assert result["prediction"]["recommendation"] is not None
    assert result["factors"]["home_record"] == "10-5"

def test_generate_prediction_no_market():
    engine = PredictionEngine()
    game = {
        "game_id": "123",
        "home_team_name": "Celtics",
        "away_team_name": "Lakers",
        "home_record": "10-5",
        "away_record": "5-10"
    }
    
    result = engine.generate_prediction(game, {}, {}, None)
    
    assert result["prediction"]["kalshi_prob"] == 0.5
    assert result["prediction"]["confidence_score"] == "LOW"

