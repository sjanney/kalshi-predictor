"""
Kalshi WebSocket Service for Real-time Market Data
Connects to Kalshi WebSocket API and streams market updates
"""
import asyncio
import json
import logging
import time
import base64
from typing import Dict, List, Optional, Set
from datetime import datetime
import websockets
from collections import deque
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from app.config import get_settings

logger = logging.getLogger(__name__)


class KalshiWebSocketService:
    """Manages WebSocket connection to Kalshi API for real-time market data"""
    
    def __init__(self):
        self.settings = get_settings()
        self.ws = None
        self.message_id = 1
        self.connected = False
        self.subscribed_channels: Set[str] = set()
        
        # Load private key for authentication
        self._private_key = None
        self.api_key_id = None
        self._load_credentials()
        
        # Market data storage (in-memory)
        self.market_data: Dict[str, Dict] = {}
        self.market_history: Dict[str, deque] = {}  # Price history for sparklines
        self.max_history = 50  # Keep last 50 price points
        
        # Connection management
        self.reconnect_delay = self.settings.WS_RECONNECT_DELAY if hasattr(self.settings, 'WS_RECONNECT_DELAY') else 5
        self.ping_interval = self.settings.WS_PING_INTERVAL if hasattr(self.settings, 'WS_PING_INTERVAL') else 30
        self.last_ping = time.time()
        
        # Task management
        self.connection_task = None
        self.ping_task = None
    
    def _load_credentials(self):
        """Load API credentials for authentication"""
        try:
            # Try to load from KALSHI_API_KEY (from onboarding)
            if hasattr(self.settings, 'KALSHI_API_KEY') and self.settings.KALSHI_API_KEY:
                self.api_key_id = self.settings.KALSHI_API_KEY
                logger.info("✅ Loaded Kalshi API key from settings")
            
            # Load private key from file
            key_path = getattr(self.settings, 'KALSHI_PRIVATE_KEY_PATH', 'prediction_api_key.txt')
            try:
                with open(key_path, 'rb') as key_file:
                    self._private_key = serialization.load_pem_private_key(
                        key_file.read(),
                        password=None
                    )
                logger.info(f"✅ Loaded private key from {key_path}")
            except FileNotFoundError:
                logger.warning(f"⚠️  Private key file not found: {key_path}")
            except Exception as e:
                logger.error(f"❌ Failed to load private key: {e}")
        except Exception as e:
            logger.error(f"Failed to load credentials: {e}")
    
    def _create_auth_headers(self) -> Dict[str, str]:
        """Create authentication headers for WebSocket connection"""
        if not self._private_key or not self.api_key_id:
            logger.warning("⚠️  No credentials available for WebSocket authentication")
            return {}
        
        timestamp = str(int(time.time() * 1000))
        path = "/trade-api/ws/v2"
        message = f"{timestamp}GET{path}".encode("utf-8")
        
        try:
            signature = self._private_key.sign(
                message,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.DIGEST_LENGTH,
                ),
                hashes.SHA256(),
            )
            
            signature_b64 = base64.b64encode(signature).decode("utf-8")
            return {
                "KALSHI-ACCESS-KEY": self.api_key_id,
                "KALSHI-ACCESS-TIMESTAMP": timestamp,
                "KALSHI-ACCESS-SIGNATURE": signature_b64,
            }
        except Exception as e:
            logger.error(f"Failed to create auth headers: {e}")
            return {}
        
    async def connect(self):
        """Establish WebSocket connection to Kalshi"""
        ws_url = getattr(self.settings, 'KALSHI_WS_URL', 'wss://api.elections.kalshi.com/trade-api/ws/v2')
        
        try:
            logger.info(f"Connecting to Kalshi WebSocket: {ws_url}")
            
            # Create authentication headers
            auth_headers = self._create_auth_headers()
            
            if auth_headers:
                logger.info("🔐 Connecting with authentication")
                self.ws = await websockets.connect(
                    ws_url,
                    additional_headers=auth_headers,
                    ping_interval=self.ping_interval,
                    ping_timeout=10,
                )
            else:
                logger.warning("⚠️  Connecting without authentication (public data only)")
                self.ws = await websockets.connect(
                    ws_url,
                    ping_interval=self.ping_interval,
                    ping_timeout=10,
                )
            
            self.connected = True
            logger.info("✅ Connected to Kalshi WebSocket")
            
            # Subscribe to ticker channel
            await self.subscribe_to_ticker()
            
            # Start message processing
            await self.process_messages()
            
        except websockets.exceptions.InvalidStatusCode as e:
            logger.error(f"❌ WebSocket connection failed with status code: {e.status_code}")
            logger.error(f"Response headers: {e.headers}")
            self.connected = False
            # Don't reconnect on auth failures
            if e.status_code in [401, 403]:
                logger.error("Authentication failed - check your API credentials")
            else:
                await self.reconnect()
        except websockets.exceptions.WebSocketException as e:
            logger.error(f"❌ WebSocket error: {type(e).__name__}: {e}")
            self.connected = False
            await self.reconnect()
        except Exception as e:
            logger.error(f"❌ WebSocket connection error: {type(e).__name__}: {e}")
            logger.exception("Full traceback:")
            self.connected = False
            await self.reconnect()
    
    async def subscribe_to_ticker(self):
        """Subscribe to ticker updates for all markets"""
        if not self.ws:
            logger.warning("Cannot subscribe: WebSocket not connected")
            return
        
        subscription_message = {
            "id": self.message_id,
            "cmd": "subscribe",
            "params": {
                "channels": ["ticker"]
            }
        }
        
        try:
            await self.ws.send(json.dumps(subscription_message))
            self.subscribed_channels.add("ticker")
            self.message_id += 1
            logger.info("📡 Subscribed to ticker channel")
        except Exception as e:
            logger.error(f"Failed to subscribe to ticker: {e}")
    
    async def subscribe_to_markets(self, market_tickers: List[str], channels: List[str] = None):
        """Subscribe to specific markets and channels"""
        if not self.ws:
            logger.warning("Cannot subscribe: WebSocket not connected")
            return
        
        if channels is None:
            channels = ["orderbook", "trades"]
        
        subscription_message = {
            "id": self.message_id,
            "cmd": "subscribe",
            "params": {
                "channels": channels,
                "market_tickers": market_tickers
            }
        }
        
        try:
            await self.ws.send(json.dumps(subscription_message))
            for channel in channels:
                self.subscribed_channels.add(f"{channel}:{','.join(market_tickers)}")
            self.message_id += 1
            logger.info(f"📡 Subscribed to {channels} for {len(market_tickers)} markets")
        except Exception as e:
            logger.error(f"Failed to subscribe to markets: {e}")
    
    async def process_messages(self):
        """Process incoming WebSocket messages"""
        try:
            async for message in self.ws:
                try:
                    data = json.loads(message)
                    await self.handle_message(data)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse message: {e}")
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
        except websockets.exceptions.ConnectionClosed:
            logger.warning("WebSocket connection closed")
            self.connected = False
            await self.reconnect()
        except Exception as e:
            logger.error(f"Error in message processing: {e}")
            self.connected = False
            await self.reconnect()
    
    async def handle_message(self, data: Dict):
        """Handle different types of WebSocket messages"""
        msg_type = data.get("type")
        
        if msg_type == "ticker":
            await self.handle_ticker_update(data.get("msg", {}))
        elif msg_type == "orderbook":
            await self.handle_orderbook_update(data.get("msg", {}))
        elif msg_type == "trade":
            await self.handle_trade_update(data.get("msg", {}))
        elif msg_type == "subscribed":
            logger.info(f"✅ Subscription confirmed: {data.get('msg', {})}")
        elif msg_type == "error":
            logger.error(f"❌ WebSocket error: {data.get('msg', {})}")
        else:
            logger.debug(f"Unknown message type: {msg_type}")
    
    async def handle_ticker_update(self, msg: Dict):
        """Handle ticker update messages"""
        ticker = msg.get("ticker")
        if not ticker:
            return
        
        # Extract market data
        market_update = {
            "ticker": ticker,
            "yes_price": msg.get("yes_price", 0),
            "no_price": msg.get("no_price", 0),
            "last_price": msg.get("last_price", 0),
            "volume": msg.get("volume", 0),
            "open_interest": msg.get("open_interest", 0),
            "timestamp": datetime.now().isoformat(),
        }
        
        # Store current data
        self.market_data[ticker] = market_update
        
        # Update price history for sparklines
        if ticker not in self.market_history:
            self.market_history[ticker] = deque(maxlen=self.max_history)
        
        self.market_history[ticker].append({
            "price": market_update["yes_price"],
            "timestamp": market_update["timestamp"]
        })
        
        logger.debug(f"📊 {ticker}: ${market_update['yes_price']:.2f} (Vol: {market_update['volume']})")
    
    async def handle_orderbook_update(self, msg: Dict):
        """Handle orderbook update messages"""
        ticker = msg.get("ticker")
        if not ticker:
            return
        
        # Store orderbook data
        if ticker in self.market_data:
            self.market_data[ticker]["orderbook"] = {
                "yes_bids": msg.get("yes", {}).get("bids", []),
                "yes_asks": msg.get("yes", {}).get("asks", []),
                "no_bids": msg.get("no", {}).get("bids", []),
                "no_asks": msg.get("no", {}).get("asks", []),
            }
    
    async def handle_trade_update(self, msg: Dict):
        """Handle trade update messages"""
        ticker = msg.get("ticker")
        if not ticker:
            return
        
        # Store last trade
        if ticker in self.market_data:
            self.market_data[ticker]["last_trade"] = {
                "price": msg.get("price", 0),
                "count": msg.get("count", 0),
                "taker_side": msg.get("taker_side", ""),
                "timestamp": msg.get("ts", "")
            }
    
    async def reconnect(self):
        """Attempt to reconnect to WebSocket"""
        logger.info(f"Reconnecting in {self.reconnect_delay} seconds...")
        await asyncio.sleep(self.reconnect_delay)
        await self.connect()
    
    def get_market_data(self, sport: Optional[str] = None) -> List[Dict]:
        """Get current market data, optionally filtered by sport"""
        # If not connected and no real data available, return mock data
        # Strictly return real data
        if sport:
            # Filter by sport prefix (e.g., KXNFL, KXNBA)
            sport_prefix = f"KX{sport.upper()}"
            return [
                {**data, "price_history": list(self.market_history.get(ticker, []))}
                for ticker, data in self.market_data.items()
                if ticker.startswith(sport_prefix)
            ]
        
        # Return all markets with price history
        return [
            {**data, "price_history": list(self.market_history.get(ticker, []))}
            for ticker, data in self.market_data.items()
        ]
    
    def get_market_by_ticker(self, ticker: str) -> Optional[Dict]:
        """Get specific market data by ticker"""
        data = self.market_data.get(ticker)
        if data:
            return {
                **data,
                "price_history": list(self.market_history.get(ticker, []))
            }
        return None
    
    async def _fetch_initial_state(self):
        """Fetch initial market state via REST API to populate data immediately"""
        try:
            from app.services.kalshi import KalshiClient
            logger.info("📥 Fetching initial market snapshot...")
            client = KalshiClient()
            
            # Fetch NBA and NFL markets
            nba_markets = client.get_league_markets("nba")
            nfl_markets = client.get_league_markets("nfl")
            
            all_markets = nba_markets + nfl_markets
            
            for market in all_markets:
                ticker = market.get("ticker")
                if not ticker:
                    continue
                    
                # Convert REST format to WebSocket format
                self.market_data[ticker] = {
                    "ticker": ticker,
                    "title": market.get("title"),
                    "subtitle": market.get("subtitle"),
                    "yes_price": market.get("yes_bid", 0), # Use bid as proxy for price
                    "no_price": market.get("no_bid", 0),
                    "last_price": market.get("last_price", 0),
                    "volume": market.get("volume_24h", 0),
                    "open_interest": market.get("open_interest", 0),
                    "timestamp": datetime.now().isoformat(),
                }
                
                # Initialize history with current price
                if ticker not in self.market_history:
                    self.market_history[ticker] = deque(maxlen=self.max_history)
                    if market.get("last_price"):
                        self.market_history[ticker].append({
                            "price": market.get("last_price"),
                            "timestamp": datetime.now().isoformat()
                        })
            
            logger.info(f"✅ Populated {len(self.market_data)} markets from initial snapshot")
            
        except Exception as e:
            logger.error(f"Failed to fetch initial state: {e}")

    async def start(self):
        """Start the WebSocket service"""
        logger.info("🚀 Starting Kalshi WebSocket Service")
        
        # Fetch initial state first so UI isn't empty
        await self._fetch_initial_state()
        
        self.connection_task = asyncio.create_task(self.connect())
    
    async def stop(self):
        """Stop the WebSocket service"""
        logger.info("🛑 Stopping Kalshi WebSocket Service")
        self.connected = False
        
        if self.ws:
            await self.ws.close()
        
        if self.connection_task:
            self.connection_task.cancel()
            try:
                await self.connection_task
            except asyncio.CancelledError:
                pass


# Global instance
_ws_service: Optional[KalshiWebSocketService] = None


def get_websocket_service() -> KalshiWebSocketService:
    """Get or create the WebSocket service singleton"""
    global _ws_service
    if _ws_service is None:
        _ws_service = KalshiWebSocketService()
    return _ws_service
