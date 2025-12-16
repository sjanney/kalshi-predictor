"""
Trading API Endpoints - SIMULATED MODE

Provides REST API endpoints for simulated trading demonstration.
Uses mock data to show how the trading terminal works with real game data.

Endpoints:
    POST /api/trading/orders - Place a new order (simulated)
    DELETE /api/trading/orders/{order_id} - Cancel an order  
    GET /api/trading/orders/active - Get mock active orders
    GET /api/trading/orders/history - Get order history
    GET /api/trading/positions - Get simulated positions with P&L
    GET /api/trading/pnl - Get mock P&L summary
    GET /api/trading/balance - Get mock account balance
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trading", tags=["Trading"])


# ============================================================================
# Request/Response Models
# ============================================================================

class PlaceOrderRequest(BaseModel):
    """Request model for placing an order"""
    market_ticker: str = Field(..., description="Kalshi market ticker")
    side: Literal["yes", "no"] = Field(..., description="Order side: yes or no")
    quantity: int = Field(..., gt=0, description="Number of contracts")
    order_type: Literal["market", "limit"] = Field(default="market", description="Order type")
    price: Optional[float] = Field(None, ge=0, le=100, description="Limit price in cents")
    game_id: Optional[str] = Field(None, description="Associated game ID")


class PlaceOrderResponse(BaseModel):
    """Response model for order placement"""
    order_id: str
    status: str
    message: str
    order_details: dict


class CancelOrderResponse(BaseModel):
    """Response model for order cancellation"""
    order_id: str
    status: str
    message: str


# ============================================================================
# Order Endpoints
# ============================================================================

@router.post("/orders", response_model=PlaceOrderResponse)
async def place_order(request: PlaceOrderRequest):
    """
    Place a new trading order (SIMULATED).
    
    Creates a simulated order and adds it to mock positions.
    """
    try:
        from app.services.mock_trading_data import get_mock_trading_data, _mock_positions, _mock_orders
        from datetime import datetime
        
        logger.info(f"[SIMULATED] Placing order: {request.market_ticker} {request.side} x{request.quantity}")
        
        # Generate order ID
        order_id = str(uuid.uuid4())[:8]
        
        # Create mock order
        order = {
            "order_id": order_id,
            "market_ticker": request.market_ticker,
            "side": request.side,
            "order_type": request.order_type,
            "quantity": request.quantity,
            "price": request.price,
            "filled_quantity": request.quantity,  # Instantly fill in simulation
            "average_fill_price": request.price or 50.0,
            "status": "filled",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Add to positions
        entry_price = request.price or 50.0
        current_price = entry_price + 2.0  # Simulate small gain
        entry_value = request.quantity * entry_price / 100
        current_value = request.quantity * current_price / 100
        
        position = {
            "market_ticker": request.market_ticker,
            "side": request.side,
            "quantity": request.quantity,
            "average_entry_price": round(entry_price, 2),
            "current_market_price": round(current_price, 2),
            "unrealized_pnl": round(current_value - entry_value, 2),
            "realized_pnl": 0.0,
            "total_pnl": round(current_value - entry_value, 2),
            "position_value": round(current_value, 2),
            "game_id": request.game_id,
            "opened_at": datetime.now().isoformat()
        }
        
        _mock_positions.append(position)
        
        return PlaceOrderResponse(
            order_id=order_id,
            status="filled",
            message=f"[SIMULATED] Order filled: {request.side.upper()} {request.quantity} contracts",
            order_details=order
        )
        
    except Exception as e:
        logger.error(f"Order placement failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to place order: {str(e)}")


@router.delete("/orders/{order_id}", response_model=CancelOrderResponse)
async def cancel_order(order_id: str):
    """Cancel an order (SIMULATED)"""
    logger.info(f"[SIMULATED] Cancelling order: {order_id}")
    return CancelOrderResponse(
        order_id=order_id,
        status="cancelled",
        message=f"[SIMULATED] Order {order_id} cancelled"
    )


@router.get("/orders/active")
async def get_active_orders():
    """Get simulated active orders"""
    try:
        from app.services.mock_trading_data import get_mock_trading_data
        mock_data = get_mock_trading_data()
        return {
            "active_orders": mock_data["orders"],
            "count": len(mock_data["orders"])
        }
    except Exception as e:
        logger.error(f"Failed to fetch active orders: {str(e)}")
        return {"active_orders": [], "count": 0}


@router.get("/orders/history")
async def get_order_history(limit: int = 50):
    """Get order history (returns empty for simulation)"""
    return {"order_history": [], "count": 0}


# ============================================================================
# Position Endpoints
# ============================================================================

@router.get("/positions")
async def get_positions():
    """Get simulated positions with P&L"""
    try:
        from app.services.mock_trading_data import get_mock_trading_data, update_mock_position_prices
        
        # Update prices to simulate market movement
        update_mock_position_prices()
        
        mock_data = get_mock_trading_data()
        positions = mock_data["positions"]
        
        total_unrealized_pnl = sum(p.get("unrealized_pnl", 0) for p in positions)
        total_position_value = sum(p.get("position_value", 0) for p in positions)
        
        logger.info(f"[SIMULATED] Returning {len(positions)} positions, total P&L: ${total_unrealized_pnl:.2f}")
        
        return {
            "positions": positions,
            "count": len(positions),
            "total_unrealized_pnl": round(total_unrealized_pnl, 2),
            "total_position_value": round(total_position_value, 2)
        }
    except Exception as e:
        logger.error(f"Failed to fetch positions: {str(e)}")
        return {"positions": [], "count": 0, "total_unrealized_pnl": 0.0, "total_position_value": 0.0}


@router.get("/pnl")
async def get_pnl_summary():
    """Get simulated P&L summary"""
    try:
        from app.services.mock_trading_data import get_mock_trading_data, update_mock_position_prices
        update_mock_position_prices()
        mock_data = get_mock_trading_data()
        logger.info(f"[SIMULATED] P&L Summary - Total: ${mock_data['pnl_summary']['total_pnl']:.2f}")
        return mock_data["pnl_summary"]
    except Exception as e:
        logger.error(f"Failed to fetch P&L summary: {str(e)}")
        return {
            "total_pnl": 0.0,
            "unrealized_pnl": 0.0,
            "realized_pnl": 0.0,
            "total_exposure": 0.0,
            "position_count": 0,
            "balance": 10000.0,
            "available_capital": 10000.0
        }


@router.get("/balance")
async def get_balance():
    """Get simulated account balance"""
    return {
        "balance": 10000.0,
        "available": 8500.0,
        "currency": "USD"
    }


# ============================================================================
# Utility Endpoints
# ============================================================================

@router.post("/refresh")
async def refresh_positions():
    """Refresh position data (simulated)"""
    from app.services.mock_trading_data import update_mock_position_prices
    update_mock_position_prices()
    return {"message": "[SIMULATED] Positions refreshed successfully"}
