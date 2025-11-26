#!/usr/bin/env python3
"""
Script to fetch today's games and record predictions for accuracy tracking.
"""
import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000/api"

def fetch_games(league="nba"):
    """Fetch games from the API"""
    try:
        response = requests.get(f"{API_BASE}/games?league={league}", timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching games: {e}")
        return []

def record_predictions(games):
    """Record predictions for tracking"""
    predictions = []
    
    for game in games:
        # Match the format expected by AccuracyTracker
        prediction_record = {
            "game_id": game.get("game_id"),
            "league": game.get("league", "nba"),
            "timestamp": datetime.now().isoformat(),
            "home_team": game.get("home_team"),
            "away_team": game.get("away_team"),
            "game_date": game.get("game_date"),
            "prediction": {
                "home_win_prob": game.get("prediction", {}).get("home_win_prob"),
                "stat_model_prob": game.get("prediction", {}).get("stat_model_prob"),
                "kalshi_prob": game.get("prediction", {}).get("kalshi_prob"),
                "elo_prob": game.get("analytics", {}).get("elo_ratings", {}).get("home"),
                "form_prob": game.get("analytics", {}).get("recent_form", {}).get("home", {}).get("win_pct"),
            },
            "outcome": None,
            "verified": False
        }
        
        # If game is final, record the outcome
        if game.get("status", "").lower().find("final") != -1:
            home_score = game.get("home_score")
            away_score = game.get("away_score")
            if home_score is not None and away_score is not None:
                # Convert scores to int if they're strings
                try:
                    home_score = int(home_score)
                    away_score = int(away_score)
                except (ValueError, TypeError):
                    continue  # Skip if scores are invalid
                
                prediction_record["outcome"] = {
                    "home_won": home_score > away_score,
                    "home_score": home_score,
                    "away_score": away_score
                }
                prediction_record["verified"] = True
                prediction_record["verified_at"] = datetime.now().isoformat()
        
        predictions.append(prediction_record)
    
    return predictions

def save_predictions(predictions, filename="backend/data/predictions_history.json"):
    """Save predictions to file"""
    import os
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    # Load existing predictions if file exists
    existing = []
    if os.path.exists(filename):
        try:
            with open(filename, 'r') as f:
                existing = json.load(f)
        except:
            existing = []
    
    # Get existing game IDs to avoid duplicates
    existing_ids = {p.get("game_id") for p in existing}
    
    # Add new predictions
    new_predictions = [p for p in predictions if p.get("game_id") not in existing_ids]
    
    # Combine and save
    all_predictions = existing + new_predictions
    
    with open(filename, 'w') as f:
        json.dump(all_predictions, f, indent=2)
    
    return len(new_predictions), len(all_predictions)

def main():
    print("Fetching NBA games...")
    nba_games = fetch_games("nba")
    print(f"Found {len(nba_games)} NBA games")
    
    print("\nFetching NFL games...")
    nfl_games = fetch_games("nfl")
    print(f"Found {len(nfl_games)} NFL games")
    
    all_games = nba_games + nfl_games
    
    if not all_games:
        print("No games found!")
        return
    
    print(f"\nProcessing {len(all_games)} total games...")
    predictions = record_predictions(all_games)
    
    # Count final games
    final_games = [p for p in predictions if p.get("verified")]
    print(f"  - {len(final_games)} games are final")
    print(f"  - {len(predictions) - len(final_games)} games are pending")
    
    # Save predictions
    new_count, total_count = save_predictions(predictions)
    print(f"\nSaved {new_count} new predictions")
    print(f"Total predictions in history: {total_count}")
    
    # Show some stats
    if final_games:
        print("\n=== Final Games ===")
        for game in final_games:
            home_won = game["outcome"]["home_won"]
            predicted_home_win = game["prediction"]["home_win_prob"] > 0.5
            correct = home_won == predicted_home_win
            
            home_team = game.get("home_team", "Home")
            away_team = game.get("away_team", "Away")
            winner = home_team if home_won else away_team
            predicted = home_team if predicted_home_win else away_team
            
            status = "✓ CORRECT" if correct else "✗ WRONG"
            prob = game["prediction"]["home_win_prob"]
            print(f"{status}: {away_team} @ {home_team} - Winner: {winner}, Predicted: {predicted} ({prob:.1%})")

if __name__ == "__main__":
    main()
