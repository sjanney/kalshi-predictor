"""
Mock Trading Data Generator

Generates simulated trading data for testing the trading terminal without live API.
Creates mock positions, orders, and market tickers based on real game data.
"""

import logging
from typing import Dict, List
from datetime import datetime, timedelta
import random
import uuid

logger = logging.getLogger(__name__)


def generate_market_ticker(game_id: str, home_abbr: str, away_abbr: str, game_date: str, league: str) -> str:
    """
    Generate a mock Kalshi market ticker for a game.
    
    Format: KX{LEAGUE}GAME-{DATE}-{AWAY}-{HOME}
    Example: KXNBAGAME-24NOV27-LAL-BOS
    """
    try:
        # Parse date
        date_obj = datetime.fromisoformat(game_date.replace('Z', '+00:00'))
        date_str = date_obj.strftime("%y%b%d").upper()
    except:
        date_str = "24NOV27"
    
    league_code = league.upper()
    return f"KX{league_code}GAME-{date_str}-{away_abbr}-{home_abbr}"


def generate_mock_positions(count: int = 3) -> List[Dict]:
    """Generate mock trading positions for display"""
    positions = []
    
    mock_tickers = [
        "KXNBAGAME-24NOV27-LAL-BOS",
        "KXNBAGAME-24NOV28-GSW-PHX",
        "KXNFLGAME-24DEC01-KC-BUF",
    ]
    
    for i in range(min(count, len(mock_tickers))):
        ticker = mock_tickers[i]
        side = random.choice(["yes", "no"])
        quantity = random.randint(5, 20)
        entry_price = random.uniform(40, 60)
        current_price = entry_price + random.uniform(-10, 15)
        
        # Calculate P&L
        entry_value = quantity * entry_price / 100
        current_value = quantity * current_price / 100
        unrealized_pnl = current_value - entry_value
        
        position = {
            "market_ticker": ticker,
            "side": side,
            "quantity": quantity,
            "average_entry_price": round(entry_price, 2),
            "current_market_price": round(current_price, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "realized_pnl": 0.0,
            "total_pnl": round(unrealized_pnl, 2),
            "position_value": round(current_value, 2),
            "opened_at": (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat()
        }
        positions.append(position)
    
    return positions


def generate_mock_orders(count: int = 2) -> List[Dict]:
    """Generate mock active orders"""
    orders = []
    
    for i in range(count):
        order_id = str(uuid.uuid4())
        side = random.choice(["yes", "no"])
        order_type = random.choice(["market", "limit"])
        quantity = random.randint(5, 15)
        
        order = {
            "order_id": order_id,
            "market_ticker": f"KXNBAGAME-24NOV27-MOCK-{i}",
            "side": side,
            "order_type": order_type,
            "quantity": quantity,
            "price": random.randint(45, 55) if order_type == "limit" else None,
            "filled_quantity": 0,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        orders.append(order)
    
    return orders


def calculate_pnl_summary(positions: List[Dict]) -> Dict:
    """Calculate P&L summary from positions"""
    total_unrealized = sum(p["unrealized_pnl"] for p in positions)
    total_realized = sum(p.get("realized_pnl", 0.0) for p in positions)
    total_exposure = sum(p["position_value"] for p in positions)
    
    return {
        "total_pnl": round(total_unrealized + total_realized, 2),
        "unrealized_pnl": round(total_unrealized, 2),
        "realized_pnl": round(total_realized, 2),
        "total_exposure": round(total_exposure, 2),
        "position_count": len(positions),
        "balance": 10000.0,  # Mock balance
        "available_capital": round(10000.0 - total_exposure, 2),
    }


# Global mock data storage for consistency
_mock_positions = []
_mock_orders = []


def get_mock_trading_data():
    """Get or initialize mock trading data"""
    global _mock_positions, _mock_orders
    
    if not _mock_positions:
        _mock_positions = generate_mock_positions(3)
    
    if not _mock_orders:
        _mock_orders = generate_mock_orders(2)
    
    return {
        "positions": _mock_positions,
        "orders": _mock_orders,
        "pnl_summary": calculate_pnl_summary(_mock_positions)
    }


def update_mock_position_prices():
    """Simulate market price changes"""
    global _mock_positions
    
    for position in _mock_positions:
        # Randomly update price by +/- 2 cents
        price_change = random.uniform(-2, 2)
        position["current_market_price"] = max(1, min(99, position["current_market_price"] + price_change))
        
        # Recalculate P&L
        entry_value = position["quantity"] * position["average_entry_price"] / 100
        current_value = position["quantity"] * position["current_market_price"] / 100
        position["unrealized_pnl"] = round(current_value - entry_value, 2)
        position["total_pnl"] = position["unrealized_pnl"]
        position["position_value"] = round(current_value, 2)
