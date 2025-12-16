"""
Trading Service Module

Provides a modular interface for executing trades, managing positions, and tracking P&L
on the Kalshi platform. Designed with separation of concerns:

- TradingClient: Low-level API interactions (order placement, cancellation)
- PositionTracker: Position management and P&L calculations  
- OrderManager: Order state management and history
- TradingService: High-level facade combining all trading operations

Usage:
    from app.services.trading_service import trading_service
    
    # Place an order
    result = await trading_service.place_order(
        market_ticker="KXNBAGAME-24NOV27-LAL-BOS",
        side="yes",
        quantity=10,
        order_type="market"
    )
    
    # Get all positions
    positions = await trading_service.get_positions()
    
    # Get P&L summary
    pnl = await trading_service.get_pnl_summary()
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass, asdict
from enum import Enum
import requests
from app.config import get_settings
from app.services.kalshi import KalshiClient

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================================
# Data Models
# ============================================================================

class OrderSide(str, Enum):
    """Order side enum"""
    YES = "yes"
    NO = "no"


class OrderType(str, Enum):
    """Order type enum"""
    MARKET = "market"
    LIMIT = "limit"


class OrderStatus(str, Enum):
    """Order status enum"""
    PENDING = "pending"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


@dataclass
class Order:
    """Represents a trading order"""
    order_id: str
    market_ticker: str
    side: OrderSide
    order_type: OrderType
    quantity: int
    price: Optional[float] = None  # For limit orders
    filled_quantity: int = 0
    average_fill_price: Optional[float] = None
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = None
    updated_at: datetime = None
    error_message: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        result = asdict(self)
        result['created_at'] = self.created_at.isoformat()
        result['updated_at'] = self.updated_at.isoformat()
        result['side'] = self.side.value
        result['order_type'] = self.order_type.value
        result['status'] = self.status.value
        return result


@dataclass
class Position:
    """Represents an open position"""
    market_ticker: str
    side: OrderSide
    quantity: int
    average_entry_price: float
    current_market_price: float
    unrealized_pnl: float
    realized_pnl: float = 0.0
    total_pnl: float = 0.0
    position_value: float = 0.0
    game_id: Optional[str] = None
    league: Optional[str] = None
    description: Optional[str] = None
    opened_at: datetime = None
    
    def __post_init__(self):
        if self.opened_at is None:
            self.opened_at = datetime.now()
        self.calculate_pnl()
    
    def calculate_pnl(self):
        """Calculate P&L metrics"""
        # Kalshi prices are in cents, so positions are valued in dollars
        entry_value = self.quantity * self.average_entry_price / 100
        current_value = self.quantity * self.current_market_price / 100
        
        self.position_value = current_value
        self.unrealized_pnl = current_value - entry_value
        self.total_pnl = self.unrealized_pnl + self.realized_pnl
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        result = asdict(self)
        result['side'] = self.side.value
        result['opened_at'] = self.opened_at.isoformat()
        return result


# ============================================================================
# Trading Client - Low-level API interactions
# ============================================================================

class TradingClient:
    """
    Low-level client for Kalshi Trading API interactions.
    Handles authentication and raw API calls.
    """
    
    def __init__(self, kalshi_client: KalshiClient):
        self.kalshi = kalshi_client
        self.base_url = settings.KALSHI_API_BASE_URL.rstrip("/")
        self.mock_mode = settings.USE_MOCK_DATA
        
    async def place_order(
        self,
        market_ticker: str,
        side: OrderSide,
        quantity: int,
        order_type: OrderType = OrderType.MARKET,
        price: Optional[int] = None
    ) -> Dict:
        """
        Place an order on Kalshi.
        
        Args:
            market_ticker: The market ticker (e.g., "KXNBAGAME-24NOV27-LAL-BOS")
            side: "yes" or "no"
            quantity: Number of contracts
            order_type: "market" or "limit"
            price: Price in cents (required for limit orders)
            
        Returns:
            API response with order details
        """
        if self.mock_mode:
            return self._mock_place_order(market_ticker, side, quantity, order_type, price)
        
        try:
            endpoint = "/trade-api/v2/portfolio/orders"
            
            payload = {
                "ticker": market_ticker,
                "action": "buy",  # Kalshi uses "buy" for both yes/no
                "side": side.value,
                "count": quantity,
                "type": order_type.value,
            }
            
            if order_type == OrderType.LIMIT and price is not None:
                payload["yes_price"] = price if side == OrderSide.YES else None
                payload["no_price"] = price if side == OrderSide.NO else None
            
            response = self.kalshi._request("POST", endpoint, json=payload)
            data = response.json() if hasattr(response, 'json') else response
            logger.info(f"Order placed successfully: {market_ticker} {side.value} x{quantity}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to place order: {str(e)}")
            raise
    
    async def cancel_order(self, order_id: str) -> Dict:
        """
        Cancel an existing order.
        
        Args:
            order_id: The order ID to cancel
            
        Returns:
            API response
        """
        if self.mock_mode:
            return {"order_id": order_id, "status": "cancelled"}
        
        try:
            endpoint = f"/trade-api/v2/portfolio/orders/{order_id}"
            response = self.kalshi._request("DELETE", endpoint)
            data = response.json() if hasattr(response, 'json') else response
            logger.info(f"Order cancelled: {order_id}")
            return data
        except Exception as e:
            logger.error(f"Failed to cancel order {order_id}: {str(e)}")
            raise
    
    async def get_order_status(self, order_id: str) -> Dict:
        """Get the current status of an order"""
        if self.mock_mode:
            return self._mock_order_status(order_id)
        
        try:
            endpoint = f"/trade-api/v2/portfolio/orders/{order_id}"
            response = self.kalshi._request("GET", endpoint)
            return response.json() if hasattr(response, 'json') else response
        except Exception as e:
            logger.error(f"Failed to get order status for {order_id}: {str(e)}")
            raise
    
    async def get_portfolio_positions(self) -> List[Dict]:
        """Get all current positions from Kalshi"""
        if self.mock_mode:
            return self._mock_positions()
        
        try:
            endpoint = "/trade-api/v2/portfolio/positions"
            response = self.kalshi._request("GET", endpoint)
            data = response.json() if hasattr(response, 'json') else response
            return data.get("positions", [])
        except Exception as e:
            logger.error(f"Failed to get positions: {str(e)}")
            return []
    
    async def get_portfolio_balance(self) -> Dict:
        """Get account balance information"""
        if self.mock_mode:
            return {"balance": 10000.0, "available": 8500.0}
        
        try:
            endpoint = "/trade-api/v2/portfolio/balance"
            response = self.kalshi._request("GET", endpoint)
            data = response.json() if hasattr(response, 'json') else response
            return data
        except Exception as e:
            logger.error(f"Failed to get balance: {str(e)}")
            return {"balance": 0.0, "available": 0.0}
    
    # Mock implementations for testing without API
    def _mock_place_order(self, ticker, side, qty, order_type, price):
        """Mock order placement for testing"""
        import uuid
        return {
            "order_id": str(uuid.uuid4()),
            "ticker": ticker,
            "side": side.value,
            "count": qty,
            "type": order_type.value,
            "status": "filled",
            "filled_count": qty,
            "average_price": price or 50,  # Mock price
        }
    
    def _mock_order_status(self, order_id):
        """Mock order status"""
        return {
            "order_id": order_id,
            "status": "filled",
            "filled_count": 10,
        }
    
    def _mock_positions(self):
        """Mock positions"""
        return []


# ============================================================================
# Position Tracker - Position management and P&L
# ============================================================================

class PositionTracker:
    """
    Manages position tracking and P&L calculations.
    Maintains in-memory position state with persistence to database.
    """
    
    def __init__(self):
        self.positions: Dict[str, Position] = {}  # ticker -> Position
        
    def update_from_api(self, api_positions: List[Dict], market_prices: Dict[str, float]):
        """
        Update positions from API response and current market prices.
        
        Args:
            api_positions: List of positions from Kalshi API
            market_prices: Dict of ticker -> current market price
        """
        for pos_data in api_positions:
            ticker = pos_data.get("ticker")
            if not ticker:
                continue
            
            quantity = pos_data.get("position", 0)
            if quantity == 0:
                # Position closed
                if ticker in self.positions:
                    del self.positions[ticker]
                continue
            
            side = OrderSide.YES if quantity > 0 else OrderSide.NO
            avg_price = pos_data.get("average_price", 50)
            current_price = market_prices.get(ticker, avg_price)
            
            if ticker in self.positions:
                # Update existing position
                pos = self.positions[ticker]
                pos.quantity = abs(quantity)
                pos.current_market_price = current_price
                pos.calculate_pnl()
            else:
                # New position
                self.positions[ticker] = Position(
                    market_ticker=ticker,
                    side=side,
                    quantity=abs(quantity),
                    average_entry_price=avg_price,
                    current_market_price=current_price,
                    unrealized_pnl=0.0,
                )
    
    def update_position_from_fill(self, order: Order, fill_price: float):
        """Update position when an order is filled"""
        ticker = order.market_ticker
        
        if ticker in self.positions:
            # Add to existing position
            pos = self.positions[ticker]
            total_qty = pos.quantity + order.quantity
            total_cost = (pos.quantity * pos.average_entry_price + 
                         order.quantity * fill_price)
            pos.average_entry_price = total_cost / total_qty
            pos.quantity = total_qty
            pos.calculate_pnl()
        else:
            # New position
            self.positions[ticker] = Position(
                market_ticker=ticker,
                side=order.side,
                quantity=order.quantity,
                average_entry_price=fill_price,
                current_market_price=fill_price,
                unrealized_pnl=0.0,
            )
    
    def get_all_positions(self) -> List[Position]:
        """Get all current positions"""
        return list(self.positions.values())
    
    def get_total_pnl(self) -> float:
        """Calculate total P&L across all positions"""
        return sum(pos.total_pnl for pos in self.positions.values())
    
    def get_total_exposure(self) -> float:
        """Calculate total position value"""
        return sum(pos.position_value for pos in self.positions.values())


# ============================================================================
# Order Manager - Order state and history
# ============================================================================

class OrderManager:
    """
    Manages order lifecycle and history.
    Tracks pending, filled, and historical orders.
    """
    
    def __init__(self):
        self.active_orders: Dict[str, Order] = {}  # order_id -> Order
        self.order_history: List[Order] = []
        self.max_history = 100
        
    def add_order(self, order: Order):
        """Add a new order to tracking"""
        self.active_orders[order.order_id] = order
        
    def update_order_status(
        self,
        order_id: str,
        status: OrderStatus,
        filled_qty: int = 0,
        avg_price: Optional[float] = None,
        error: Optional[str] = None
    ):
        """Update order status"""
        if order_id not in self.active_orders:
            return
        
        order = self.active_orders[order_id]
        order.status = status
        order.filled_quantity = filled_qty
        order.average_fill_price = avg_price
        order.error_message = error
        order.updated_at = datetime.now()
        
        # Move to history if terminal state
        if status in [OrderStatus.FILLED, OrderStatus.CANCELLED, OrderStatus.REJECTED]:
            self.order_history.insert(0, order)
            del self.active_orders[order_id]
            
            # Limit history size
            if len(self.order_history) > self.max_history:
                self.order_history = self.order_history[:self.max_history]
    
    def get_active_orders(self) -> List[Order]:
        """Get all active orders"""
        return list(self.active_orders.values())
    
    def get_order_history(self, limit: int = 50) -> List[Order]:
        """Get recent order history"""
        return self.order_history[:limit]
    
    def get_order(self, order_id: str) -> Optional[Order]:
        """Get specific order by ID"""
        return self.active_orders.get(order_id)


# ============================================================================
# Trading Service - High-level facade
# ============================================================================

class TradingService:
    """
    High-level trading service that coordinates all trading operations.
    This is the main interface for the application to interact with.
    """
    
    def __init__(self):
        self.kalshi_client = KalshiClient()
        self.trading_client = TradingClient(self.kalshi_client)
        self.position_tracker = PositionTracker()
        self.order_manager = OrderManager()
        
    async def place_order(
        self,
        market_ticker: str,
        side: str,
        quantity: int,
        order_type: str = "market",
        price: Optional[float] = None,
        game_id: Optional[str] = None
    ) -> Dict:
        """
        Place a trading order.
        
        Args:
            market_ticker: Market ticker symbol
            side: "yes" or "no"
            quantity: Number of contracts
            order_type: "market" or "limit"
            price: Limit price (required for limit orders)
            game_id: Associated game ID for tracking
            
        Returns:
            Order details including order_id and status
        """
        try:
            # Validate inputs
            order_side = OrderSide(side.lower())
            ord_type = OrderType(order_type.lower())
            
            # Convert price to cents if provided
            price_cents = int(price * 100) if price else None
            
            # Place order via API
            response = await self.trading_client.place_order(
                market_ticker=market_ticker,
                side=order_side,
                quantity=quantity,
                order_type=ord_type,
                price=price_cents
            )
            
            # Create order object
            order = Order(
                order_id=response.get("order_id") or response.get("order", {}).get("order_id"),
                market_ticker=market_ticker,
                side=order_side,
                order_type=ord_type,
                quantity=quantity,
                price=price,
                filled_quantity=response.get("filled_count", 0),
                average_fill_price=response.get("average_price"),
                status=OrderStatus(response.get("status", "pending"))
            )
            
            # Track order
            self.order_manager.add_order(order)
            
            # Update position if filled
            if order.status == OrderStatus.FILLED:
                self.position_tracker.update_position_from_fill(
                    order,
                    order.average_fill_price or price or 50.0
                )
            
            logger.info(f"Order placed: {order.order_id} - {market_ticker} {side} x{quantity}")
            return order.to_dict()
            
        except Exception as e:
            logger.error(f"Error placing order: {str(e)}")
            raise
    
    async def cancel_order(self, order_id: str) -> Dict:
        """Cancel an active order"""
        try:
            response = await self.trading_client.cancel_order(order_id)
            self.order_manager.update_order_status(order_id, OrderStatus.CANCELLED)
            logger.info(f"Order cancelled: {order_id}")
            return {"order_id": order_id, "status": "cancelled"}
        except Exception as e:
            logger.error(f"Error cancelling order: {str(e)}")
            raise
    
    async def get_positions(self) -> List[Dict]:
        """Get all active positions with current P&L"""
        try:
            # Fetch positions from API
            api_positions = await self.trading_client.get_portfolio_positions()
            
            # Get current market prices
            market_prices = {}
            for pos in api_positions:
                ticker = pos.get("ticker")
                if ticker:
                    # Fetch current price from markets (would need to call Kalshi market data)
                    # For now, use the position's current price
                    market_prices[ticker] = pos.get("market_price", 50)
            
            # Update position tracker
            self.position_tracker.update_from_api(api_positions, market_prices)
            
            # Return positions
            positions = self.position_tracker.get_all_positions()
            return [pos.to_dict() for pos in positions]
            
        except Exception as e:
            logger.error(f"Error getting positions: {str(e)}")
            return []
    
    async def get_active_orders(self) -> List[Dict]:
        """Get all active orders"""
        orders = self.order_manager.get_active_orders()
        return [order.to_dict() for order in orders]
    
    async def get_order_history(self, limit: int = 50) -> List[Dict]:
        """Get order history"""
        orders = self.order_manager.get_order_history(limit)
        return [order.to_dict() for order in orders]
    
    async def get_pnl_summary(self) -> Dict:
        """
        Get comprehensive P&L summary.
        
        Returns:
            Dict with total_pnl, unrealized_pnl, realized_pnl, total_exposure, etc.
        """
        positions = self.position_tracker.get_all_positions()
        
        total_unrealized = sum(p.unrealized_pnl for p in positions)
        total_realized = sum(p.realized_pnl for p in positions)
        total_exposure = self.position_tracker.get_total_exposure()
        
        # Get balance
        balance_info = await self.trading_client.get_portfolio_balance()
        
        return {
            "total_pnl": total_unrealized + total_realized,
            "unrealized_pnl": total_unrealized,
            "realized_pnl": total_realized,
            "total_exposure": total_exposure,
            "position_count": len(positions),
            "balance": balance_info.get("balance", 0.0),
            "available_capital": balance_info.get("available", 0.0),
        }
    
    async def refresh_positions(self):
        """Refresh position data from API"""
        await self.get_positions()


# ============================================================================
# Singleton instance
# ============================================================================

trading_service = TradingService()
