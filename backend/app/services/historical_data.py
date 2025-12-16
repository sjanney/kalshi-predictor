from typing import List, Dict, Any
from app.core.database import db_manager
import logging

logger = logging.getLogger(__name__)

class HistoricalDataService:
    def __init__(self):
        self.db = db_manager

    async def save_game_result(self, game_data: Dict[str, Any]):
        """
        Save a completed game result to the local database.
        This allows the system to build a local dataset for future training.
        """
        logger.info(f"Saving historical game data for {game_data.get('id')}")
        self.db.save_game(game_data)

    async def save_prediction_log(self, prediction_data: Dict[str, Any]):
        """
        Log a prediction made by the system.
        """
        self.db.save_prediction(prediction_data)

    async def get_training_dataset(self, league: str = 'NBA') -> List[Dict[str, Any]]:
        """
        Retrieve the local dataset for training.
        """
        return self.db.get_historical_games(league=league)

historical_service = HistoricalDataService()
