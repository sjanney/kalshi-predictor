"""
Populate test data for model performance metrics.
This script adds completed games and their predictions to the database.
"""
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import db_manager
from datetime import datetime, timedelta
import random
import time

def populate_test_data():
    """Add test games and predictions to demonstrate model performance."""
    
    print("Populating test data for model performance...")
    print(f"Database path: {db_manager.db_path}")
    print(f"Database exists: {db_manager.db_path.exists()}")
    
    # Sample NBA teams
    teams = [
        ("Boston Celtics", "BOS"),
        ("Miami Heat", "MIA"),
        ("Milwaukee Bucks", "MIL"),
        ("Philadelphia 76ers", "PHI"),
        ("Los Angeles Lakers", "LAL"),
        ("Golden State Warriors", "GSW"),
        ("Phoenix Suns", "PHX"),
        ("Denver Nuggets", "DEN"),
    ]
    
    # Generate 30 completed games over the last 30 days
    games_added = 0
    predictions_added = 0
    
    for i in range(30):
        # Random matchup
        home_team, home_abbr = random.choice(teams)
        away_team, away_abbr = random.choice([t for t in teams if t[0] != home_team])
        
        # Random date in the past 30 days
        days_ago = random.randint(1, 30)
        game_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Random scores (realistic NBA scores)
        home_score = random.randint(95, 125)
        away_score = random.randint(95, 125)
        winner = home_team if home_score > away_score else away_team
        
        # Game ID (unique for each game)
        game_id = f"test_game_{i:04d}"
        
        # Save game
        game_data = {
            "id": game_id,
            "date": game_date,
            "home_team": home_team,
            "away_team": away_team,
            "home_score": home_score,
            "away_score": away_score,
            "winner": winner,
            "season": "2024",
            "league": "nba"
        }
        
        try:
            db_manager.save_game(game_data)
            
            # Verify it was saved
            import sqlite3
            conn = sqlite3.connect(db_manager.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM games WHERE id = ?", (game_id,))
            count = cursor.fetchone()[0]
            conn.close()
            
            if count > 0:
                games_added += 1
                if i < 3:  # Only print first 3 to avoid spam
                    print(f"  ✓ Saved and verified game {i+1}: {home_team} {home_score} - {away_score} {away_team}")
            else:
                print(f"  ✗ Game {i+1} not found after save!")
        except Exception as e:
            import traceback
            print(f"  Error saving game {i+1}: {e}")
            traceback.print_exc()
        
        # Generate a prediction for this game
        # Model should be reasonably accurate (60-70% accuracy)
        actual_home_won = home_score > away_score
        
        # 70% of the time, predict correctly
        if random.random() < 0.70:
            predicted_winner = home_team if actual_home_won else away_team
            win_probability = random.uniform(0.55, 0.75)
        else:
            predicted_winner = away_team if actual_home_won else home_team
            win_probability = random.uniform(0.45, 0.55)
        
        prediction_data = {
            "id": f"{game_id}_pred",
            "game_id": game_id,
            "predicted_winner": predicted_winner,
            "win_probability": win_probability,
            "model_version": "enhanced_v1",
            "input_data": {
                "elo_diff": random.uniform(-100, 100),
                "form_diff": random.uniform(-0.3, 0.3),
                "market_prob": random.uniform(0.3, 0.7)
            }
        }
        
        db_manager.save_prediction(prediction_data)
        predictions_added += 1
    
    print(f"✓ Added {games_added} test games")
    print(f"✓ Added {predictions_added} test predictions")
    print("\nModel performance metrics should now be visible in the UI!")

if __name__ == "__main__":
    populate_test_data()
