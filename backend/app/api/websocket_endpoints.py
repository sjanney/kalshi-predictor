"""
WebSocket API Endpoints for Real-time Market Data
Provides SSE (Server-Sent Events) endpoints for streaming market data to frontend
"""
import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.services.kalshi_websocket import get_websocket_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ws", tags=["websocket"])


async def market_stream_generator(sport: Optional[str] = None):
    """Generator for SSE market data stream"""
    ws_service = get_websocket_service()
    
    try:
        while True:
            # Get current market data
            markets = ws_service.get_market_data(sport=sport)
            
            # Send data as SSE event
            yield {
                "event": "market_update",
                "data": json.dumps({
                    "markets": markets,
                    "connected": ws_service.connected,
                    "timestamp": asyncio.get_event_loop().time()
                })
            }
            
            # Update every second
            await asyncio.sleep(1)
            
    except asyncio.CancelledError:
        logger.info(f"Market stream cancelled for sport: {sport or 'all'}")
    except Exception as e:
        logger.error(f"Error in market stream: {e}")


@router.get("/markets/stream")
async def stream_all_markets(request: Request):
    """
    SSE endpoint for all market data
    
    Returns real-time market updates for all sports
    """
    return EventSourceResponse(market_stream_generator())


@router.get("/markets/{sport}")
async def stream_sport_markets(sport: str, request: Request):
    """
    SSE endpoint for sport-specific market data
    
    Args:
        sport: Sport identifier (nfl, nba, etc.)
    
    Returns real-time market updates for the specified sport
    """
    return EventSourceResponse(market_stream_generator(sport=sport))


@router.get("/markets/ticker/{ticker}")
async def get_market_ticker(ticker: str):
    """
    Get current data for a specific market ticker
    
    Args:
        ticker: Market ticker symbol (e.g., KXNFL-2024-W12-BUF-KC)
    
    Returns current market data including price history
    """
    ws_service = get_websocket_service()
    market_data = ws_service.get_market_by_ticker(ticker)
    
    if market_data:
        return {
            "success": True,
            "data": market_data
        }
    else:
        return {
            "success": False,
            "error": "Market not found or no data available"
        }


@router.get("/status")
async def websocket_status():
    """
    Get WebSocket connection status
    
    Returns connection state and statistics
    """
    ws_service = get_websocket_service()
    
    return {
        "connected": ws_service.connected,
        "subscribed_channels": list(ws_service.subscribed_channels),
        "total_markets": len(ws_service.market_data),
        "markets_by_sport": {
            "nfl": len([t for t in ws_service.market_data.keys() if t.startswith("KXNFL")]),
            "nba": len([t for t in ws_service.market_data.keys() if t.startswith("KXNBA")]),
        }
    }
