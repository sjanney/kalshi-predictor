"""
Startup tasks for the Kalshi Predictor backend.
Initializes Elo ratings, game monitor, and calibration services.
"""
import logging
import atexit
from app.services.elo_manager import EloManager
from app.services.nba import NBAClient
from app.services.nfl import NFLClient
from app.services.accuracy_tracker import AccuracyTracker
from app.services.game_result_monitor import GameResultMonitor
from app.services.model_calibration import ModelCalibration

logger = logging.getLogger(__name__)

# Global service instances
game_monitor_instance = None
calibration_instance = None

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

def initialize_game_monitor():
    """Initialize and start the game result monitor service"""
    global game_monitor_instance
    
    try:
        logger.info("Initializing game result monitor...")
        
        # Create service instances
        nba_client = NBAClient()
        nfl_client = NFLClient()
        accuracy_tracker = AccuracyTracker()
        elo_manager = EloManager()
        
        # Create monitor with 15-minute check interval
        game_monitor_instance = GameResultMonitor(
            nba_client=nba_client,
            nfl_client=nfl_client,
            accuracy_tracker=accuracy_tracker,
            elo_manager=elo_manager,
            check_interval=900  # 15 minutes
        )
        
        # Start monitoring
        game_monitor_instance.start_monitoring()
        
        logger.info("✓ Game result monitor started (checking every 15 minutes)")
        
    except Exception as e:
        logger.error(f"Error initializing game monitor: {e}")
        logger.warning("Application will continue without automatic result monitoring")

def initialize_calibration_service():
    """Initialize the model calibration service"""
    global calibration_instance
    
    try:
        logger.info("Initializing model calibration service...")
        
        accuracy_tracker = AccuracyTracker()
        calibration_instance = ModelCalibration(accuracy_tracker)
        
        # Get current status
        status = calibration_instance.get_calibration_status()
        
        if status['calibrated']:
            logger.info(f"✓ Model calibration service initialized")
            logger.info(f"  - Last calibrated: {status.get('last_calibrated', 'Never')}")
            logger.info(f"  - Calibration runs: {status.get('calibration_count', 0)}")
        else:
            logger.info("✓ Model calibration service initialized (not yet calibrated)")
        
    except Exception as e:
        logger.error(f"Error initializing calibration service: {e}")
        logger.warning("Application will continue with default model weights")

def register_services_with_api():
    """Register service instances with API endpoints"""
    try:
        from app.api import enhanced_endpoints
        enhanced_endpoints.init_services(calibration_instance, game_monitor_instance)
        logger.info("✓ Services registered with API endpoints")
    except Exception as e:
        logger.error(f"Error registering services with API: {e}")

def shutdown_services():
    """Gracefully shutdown services"""
    global game_monitor_instance
    
    logger.info("Shutting down services...")
    
    if game_monitor_instance:
        try:
            game_monitor_instance.stop_monitoring()
            logger.info("✓ Game monitor stopped")
        except Exception as e:
            logger.error(f"Error stopping game monitor: {e}")

def run_startup_tasks():
    """Run all startup tasks"""
    logger.info("Running startup tasks...")
    
    # Initialize Elo ratings
    initialize_elo_ratings()
    
    # Initialize calibration service
    initialize_calibration_service()
    
    # Initialize and start game monitor
    initialize_game_monitor()
    
    # Register services with API
    register_services_with_api()
    
    # Register shutdown handler
    atexit.register(shutdown_services)
    
    logger.info("✓ Startup tasks complete")

def get_game_monitor():
    """Get the game monitor instance"""
    return game_monitor_instance

def get_calibration_service():
    """Get the calibration service instance"""
    return calibration_instance
