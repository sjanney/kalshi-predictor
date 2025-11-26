"""
Startup tasks for the Kalshi Predictor backend.
Initializes Elo ratings and other data on first startup.
"""
import logging
from app.services.elo_manager import EloManager

logger = logging.getLogger(__name__)

def initialize_elo_ratings():
    """Initialize Elo ratings for both NBA and NFL on startup"""
    try:
        elo_manager = EloManager()
        
        # Initialize NBA ratings
        logger.info("Initializing NBA Elo ratings...")
        elo_manager.initialize_ratings("nba", force_refresh=False)
        
        # Initialize NFL ratings
        logger.info("Initializing NFL Elo ratings...")
        elo_manager.initialize_ratings("nfl", force_refresh=False)
        
        # Log summary
        nba_ratings = elo_manager.get_all_ratings("nba")
        nfl_ratings = elo_manager.get_all_ratings("nfl")
        
        logger.info(f"✓ Elo initialization complete:")
        logger.info(f"  - NBA: {len(nba_ratings)} teams")
        logger.info(f"  - NFL: {len(nfl_ratings)} teams")
        logger.info(f"  - Total games processed: {elo_manager.ratings.get('games_processed', 0)}")
        
    except Exception as e:
        logger.error(f"Error initializing Elo ratings: {e}")
        logger.warning("Application will continue with default Elo ratings (1500)")

def run_startup_tasks():
    """Run all startup tasks"""
    logger.info("Running startup tasks...")
    initialize_elo_ratings()
    logger.info("Startup tasks complete")
