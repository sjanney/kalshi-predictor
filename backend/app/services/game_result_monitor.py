"""
Game Result Monitor Service
Monitors games for completion and automatically processes results.
"""
import threading
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional
import json
import os

logger = logging.getLogger(__name__)


class GameResultMonitor:
    """
    Background service that monitors games for completion and triggers result processing.
    """
    
    def __init__(self, nba_client, nfl_client, accuracy_tracker, elo_manager, 
                 check_interval: int = 900):  # 15 minutes default
        """
        Initialize the game result monitor.
        
        Args:
            nba_client: NBA data client
            nfl_client: NFL data client
            accuracy_tracker: AccuracyTracker instance
            elo_manager: EloManager instance
            check_interval: Seconds between checks (default 900 = 15 minutes)
        """
        self.nba_client = nba_client
        self.nfl_client = nfl_client
        self.accuracy_tracker = accuracy_tracker
        self.elo_manager = elo_manager
        self.check_interval = check_interval
        
        # Threading control
        self._monitor_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._running = False
        
        # Processed games tracking
        self.data_dir = "data"
        self.processed_file = os.path.join(self.data_dir, "processed_games.json")
        self.processed_games: Set[str] = self._load_processed_games()
        
        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)
        
        logger.info(f"GameResultMonitor initialized with {check_interval}s interval")
    
    def _load_processed_games(self) -> Set[str]:
        """Load set of already processed game IDs."""
        if os.path.exists(self.processed_file):
            try:
                with open(self.processed_file, 'r') as f:
                    data = json.load(f)
                    return set(data.get('processed_game_ids', []))
            except Exception as e:
                logger.error(f"Error loading processed games: {e}")
        return set()
    
    def _save_processed_games(self):
        """Save processed game IDs to disk."""
        try:
            data = {
                'processed_game_ids': list(self.processed_games),
                'last_check': datetime.now().isoformat()
            }
            with open(self.processed_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving processed games: {e}")
    
    def _is_game_already_processed(self, game_id: str) -> bool:
        """Check if a game has already been processed."""
        return game_id in self.processed_games
    
    def _mark_game_processed(self, game_id: str):
        """Mark a game as processed."""
        self.processed_games.add(game_id)
        self._save_processed_games()
    
    def check_completed_games(self, league: str) -> List[Dict]:
        """
        Check for newly completed games in a league.
        
        Args:
            league: 'nba' or 'nfl'
            
        Returns:
            List of newly completed games
        """
        try:
            # Fetch current games
            if league == 'nba':
                games = self.nba_client.get_scoreboard()
            elif league == 'nfl':
                games = self.nfl_client.get_scoreboard()
            else:
                logger.warning(f"Unknown league: {league}")
                return []
            
            # Filter for completed games that haven't been processed
            completed_games = []
            for game in games:
                game_id = str(game.get('game_id'))
                status = game.get('status', '').lower()
                
                # Check if game is final and not yet processed
                if status in ['final', 'status_final'] and not self._is_game_already_processed(game_id):
                    completed_games.append(game)
                    logger.info(f"Found completed game: {game_id} - {game.get('home_team_name')} vs {game.get('away_team_name')}")
            
            return completed_games
            
        except Exception as e:
            logger.error(f"Error checking completed games for {league}: {e}")
            return []
    
    def process_game_result(self, game: Dict, league: str) -> bool:
        """
        Process a completed game result.
        
        Args:
            game: Game data dictionary
            league: 'nba' or 'nfl'
            
        Returns:
            True if processing succeeded, False otherwise
        """
        game_id = str(game.get('game_id'))
        
        try:
            # Extract game data
            home_score = int(game.get('home_score', 0))
            away_score = int(game.get('away_score', 0))
            home_won = home_score > away_score
            home_team_id = str(game.get('home_team_id'))
            away_team_id = str(game.get('away_team_id'))
            
            logger.info(f"Processing game {game_id}: {game.get('home_team_name')} {home_score} - {away_score} {game.get('away_team_name')}")
            
            # 1. Record outcome in accuracy tracker
            self.accuracy_tracker.record_outcome(
                game_id=game_id,
                home_won=home_won,
                home_score=home_score,
                away_score=away_score
            )
            logger.info(f"Recorded outcome for game {game_id}")
            
            # 2. Update Elo ratings
            self.elo_manager.update_with_game_result(game, league)
            logger.info(f"Updated Elo ratings for game {game_id}")
            
            # 3. Mark as processed
            self._mark_game_processed(game_id)
            
            logger.info(f"Successfully processed game {game_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing game {game_id}: {e}")
            return False
    
    def _monitor_loop(self):
        """Main monitoring loop (runs in background thread)."""
        logger.info("Game result monitor started")
        
        retry_count = 0
        max_retries = 5
        base_delay = 60  # Start with 1 minute delay on error
        
        while not self._stop_event.is_set():
            try:
                # Check both NBA and NFL
                for league in ['nba', 'nfl']:
                    completed_games = self.check_completed_games(league)
                    
                    for game in completed_games:
                        if self._stop_event.is_set():
                            break
                        
                        success = self.process_game_result(game, league)
                        if success:
                            retry_count = 0  # Reset retry count on success
                
                # Wait for next check interval
                self._stop_event.wait(self.check_interval)
                
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")
                
                # Exponential backoff on errors
                retry_count = min(retry_count + 1, max_retries)
                delay = base_delay * (2 ** retry_count)
                logger.info(f"Retrying in {delay}s (attempt {retry_count}/{max_retries})")
                self._stop_event.wait(delay)
        
        logger.info("Game result monitor stopped")
    
    def start_monitoring(self):
        """Start the background monitoring service."""
        if self._running:
            logger.warning("Monitor is already running")
            return
        
        self._stop_event.clear()
        self._running = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        logger.info("Game result monitoring started")
    
    def stop_monitoring(self):
        """Stop the background monitoring service."""
        if not self._running:
            logger.warning("Monitor is not running")
            return
        
        logger.info("Stopping game result monitor...")
        self._stop_event.set()
        
        if self._monitor_thread:
            self._monitor_thread.join(timeout=10)
        
        self._running = False
        logger.info("Game result monitor stopped")
    
    def is_running(self) -> bool:
        """Check if the monitor is currently running."""
        return self._running
    
    def get_status(self) -> Dict:
        """Get current monitor status."""
        return {
            'running': self._running,
            'check_interval': self.check_interval,
            'processed_games_count': len(self.processed_games),
            'last_check': self._get_last_check_time()
        }
    
    def _get_last_check_time(self) -> Optional[str]:
        """Get timestamp of last check from processed games file."""
        if os.path.exists(self.processed_file):
            try:
                with open(self.processed_file, 'r') as f:
                    data = json.load(f)
                    return data.get('last_check')
            except Exception:
                pass
        return None
    
    def manual_check(self) -> Dict:
        """
        Manually trigger a check for completed games.
        
        Returns:
            Summary of games processed
        """
        logger.info("Manual check triggered")
        
        results = {
            'nba': [],
            'nfl': [],
            'total_processed': 0
        }
        
        for league in ['nba', 'nfl']:
            completed_games = self.check_completed_games(league)
            
            for game in completed_games:
                success = self.process_game_result(game, league)
                if success:
                    results[league].append(game.get('game_id'))
                    results['total_processed'] += 1
        
        logger.info(f"Manual check complete: {results['total_processed']} games processed")
        return results
