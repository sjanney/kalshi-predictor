import pytest
from app.services.enhanced_prediction import EnhancedPredictionEngine

@pytest.fixture
def engine():
    return EnhancedPredictionEngine()

def test_statistical_model_logic(engine):
    """Test the logistic regression logic directly"""
    # Case 1: Huge advantage for home team
    # Elo diff +200, Form diff +0.5, Record diff +0.4, H2H +0.1
    prob = engine.predict_with_statistical(
        elo_diff=200,
        form_diff=0.5,
        record_diff=0.4,
        h2h_adjustment=0.1,
        market_confidence="LOW"
    )
    assert prob > 0.8  # Should be very high
    
    # Case 2: Huge disadvantage
    prob_loss = engine.predict_with_statistical(
        elo_diff=-200,
        form_diff=-0.5,
        record_diff=-0.4,
        h2h_adjustment=-0.1,
        market_confidence="LOW"
    )
    assert prob_loss < 0.2  # Should be very low

    # Case 3: Even match (should be slightly > 0.5 due to home advantage)
    prob_even = engine.predict_with_statistical(
        elo_diff=0,
        form_diff=0,
        record_diff=0,
        h2h_adjustment=0,
        market_confidence="LOW"
    )
    assert 0.5 < prob_even < 0.6

def test_market_calibration(engine):
    """Test that market confidence affects the prediction"""
    base_args = {
        "elo_diff": 0,
        "form_diff": 0,
        "record_diff": 0,
        "h2h_adjustment": 0
    }
    
    prob_high = engine.predict_with_statistical(market_confidence="HIGH", **base_args)
    prob_med = engine.predict_with_statistical(market_confidence="MEDIUM", **base_args)
    prob_low = engine.predict_with_statistical(market_confidence="LOW", **base_args)
    
    # High confidence boosts slightly (assuming market efficiency / favorite bias check)
    # Actually in implementation: HIGH adds 0.02, MEDIUM 0.0, LOW -0.01
    assert prob_high > prob_med
    assert prob_med > prob_low

def test_enhanced_prediction_integration(engine):
    """Test full prediction generation"""
    game = {
        "game_id": "test_1",
        "home_team_name": "Home Team",
        "away_team_name": "Away Team",
        "home_team_abbrev": "HOM",
        "away_team_abbrev": "AWY",
        "game_date": "2023-01-01",
        "status": "Scheduled",
        "home_record": "10-0",
        "away_record": "0-10",
        "league": "nba"
    }
    
    # Mock stats
    home_stats = {}
    away_stats = {}
    
    # Mock all games for form calc
    all_games = [
        # 5 recent wins for home
        {"home_team_id": "Home Team", "home_score": 100, "away_score": 90, "status": "Final"} for _ in range(5)
    ]
    
    # Mock market
    market = {
        "type": "single_home",
        "home_market": {"prob": 0.8, "volume": 1000}
    }
    
    result = engine.generate_prediction(game, home_stats, away_stats, market, all_games)
    
    pred = result["prediction"]
    assert pred["stat_ensemble_prob"] > 0.5  # Should be high due to 10-0 record and form
    assert "stat_ensemble_prob" in pred
    assert "ml_prob" not in pred  # Should be removed/replaced in output keys if we updated them (we did: renamed to stat_ensemble_prob in API output)
    
    # Check if weights sum to approx 1.0
    weights = result["analytics"]["model_weights"]
    total_weight = sum(weights.values())
    assert 0.99 <= total_weight <= 1.01

def test_edge_cases(engine):
    """Test with missing data"""
    game = {
        "game_id": "test_2",
        "home_team_name": "Home",
        "away_team_name": "Away"
        # No records, no dates
    }
    
    result = engine.generate_prediction(game, {}, {}, None, [])
    pred = result["prediction"]
    
    # Should degrade gracefully to near 0.5
    assert 0.4 <= pred["stat_ensemble_prob"] <= 0.6
