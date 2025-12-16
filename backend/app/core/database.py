import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Get project root (3 levels up from this file: database.py -> core -> app -> backend -> project_root)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
DB_PATH = PROJECT_ROOT / "data" / "historical_data.db"

class DatabaseManager:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        """Initialize the database schema."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Games table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS games (
                        id TEXT PRIMARY KEY,
                        date TEXT,
                        home_team TEXT,
                        away_team TEXT,
                        home_score INTEGER,
                        away_score INTEGER,
                        winner TEXT,
                        season TEXT,
                        league TEXT
                    )
                """)
                
                # Predictions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS predictions (
                        id TEXT PRIMARY KEY,
                        game_id TEXT,
                        timestamp TEXT,
                        predicted_winner TEXT,
                        win_probability REAL,
                        model_version TEXT,
                        input_data TEXT,
                        FOREIGN KEY (game_id) REFERENCES games (id)
                    )
                """)
                
                # Model Performance table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS model_performance (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        date TEXT,
                        accuracy REAL,
                        total_predictions INTEGER,
                        correct_predictions INTEGER,
                        league TEXT
                    )
                """)
                
                conn.commit()
                logger.info("Database initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise

    def save_game(self, game_data: Dict[str, Any]):
        """Save a game result to the database."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO games (id, date, home_team, away_team, home_score, away_score, winner, season, league)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    game_data['id'],
                    game_data['date'],
                    game_data['home_team'],
                    game_data['away_team'],
                    game_data.get('home_score'),
                    game_data.get('away_score'),
                    game_data.get('winner'),
                    game_data.get('season'),
                    game_data.get('league', 'NBA')
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving game {game_data.get('id')}: {e}")

    def save_prediction(self, prediction_data: Dict[str, Any]):
        """Save a prediction to the database."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO predictions (id, game_id, timestamp, predicted_winner, win_probability, model_version, input_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    prediction_data['id'],
                    prediction_data['game_id'],
                    datetime.now().isoformat(),
                    prediction_data['predicted_winner'],
                    prediction_data['win_probability'],
                    prediction_data.get('model_version', '1.0'),
                    json.dumps(prediction_data.get('input_data', {}))
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving prediction for game {prediction_data.get('game_id')}: {e}")

    def get_historical_games(self, league: str = 'NBA', limit: int = 1000) -> List[Dict[str, Any]]:
        """Retrieve historical games."""
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM games 
                    WHERE league = ? 
                    ORDER BY date DESC 
                    LIMIT ?
                """, (league, limit))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error retrieving historical games: {e}")
            return []

    def get_accuracy_metrics(self, days_back: int = 30) -> Dict[str, Any]:
        """Calculate accuracy metrics from historical data."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Calculate date threshold
                threshold_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
                
                # Join predictions and games to compare results
                cursor.execute("""
                    SELECT 
                        p.predicted_winner,
                        p.win_probability,
                        p.model_version,
                        g.winner,
                        g.home_team
                    FROM predictions p
                    JOIN games g ON p.game_id = g.id
                    WHERE g.date >= ? 
                    AND g.winner IS NOT NULL
                """, (threshold_date,))
                
                rows = cursor.fetchall()
                
                total_predictions = len(rows)
                if total_predictions == 0:
                    return {
                        "total_predictions": 0,
                        "accuracy": 0.0,
                        "brier_score": 0.0,
                        "log_loss": 0.0,
                        "calibration": {},
                        "by_model": {}
                    }
                
                correct_predictions = 0
                brier_score_sum = 0
                by_model = {}
                
                for row in rows:
                    predicted_winner, win_prob, model_version, actual_winner, home_team = row
                    
                    # Normalize winner names if needed (assuming they match for now)
                    is_correct = (predicted_winner == actual_winner)
                    if is_correct:
                        correct_predictions += 1
                    
                    # Brier score calculation
                    # If predicted home win (prob p), and home won (outcome 1) -> (p-1)^2
                    # If predicted home win (prob p), and away won (outcome 0) -> (p-0)^2
                    # Need to know if predicted_winner was home or away to align prob
                    # Assuming win_probability is for the predicted_winner
                    outcome = 1.0 if is_correct else 0.0
                    brier_score_sum += (win_prob - outcome) ** 2
                    
                    # By Model breakdown
                    if model_version not in by_model:
                        by_model[model_version] = {"correct": 0, "total": 0, "brier_sum": 0.0}
                    
                    by_model[model_version]["total"] += 1
                    if is_correct:
                        by_model[model_version]["correct"] += 1
                    by_model[model_version]["brier_sum"] += (win_prob - outcome) ** 2

                accuracy = correct_predictions / total_predictions
                brier_score = brier_score_sum / total_predictions
                
                # Format by_model
                formatted_by_model = {}
                for mv, stats in by_model.items():
                    formatted_by_model[mv] = {
                        "accuracy": stats["correct"] / stats["total"],
                        "brier_score": stats["brier_sum"] / stats["total"],
                        "count": stats["total"]
                    }

                return {
                    "total_predictions": total_predictions,
                    "accuracy": accuracy,
                    "brier_score": brier_score,
                    "log_loss": 0.0, # Placeholder
                    "calibration": {}, # Placeholder for now
                    "by_model": formatted_by_model
                }
                
        except Exception as e:
            logger.error(f"Error calculating accuracy metrics: {e}")
            return {
                "total_predictions": 0,
                "accuracy": 0.0,
                "brier_score": 0.0,
                "log_loss": 0.0,
                "calibration": {},
                "by_model": {}
            }

db_manager = DatabaseManager()
