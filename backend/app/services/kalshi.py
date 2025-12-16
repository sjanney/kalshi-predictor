import base64
import math
import os
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import logging

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

logger = logging.getLogger(__name__)

BASE_URL = os.getenv("KALSHI_API_BASE_URL", "https://api.elections.kalshi.com")
API_PATH_PREFIX = "/trade-api/v2"
DEFAULT_PRIVATE_KEY_PATH = Path(__file__).resolve().parents[3] / "prediction_api_key.txt"
DEFAULT_API_KEY_ID = os.getenv("KALSHI_API_KEY_ID", "0b3ab9ef-d8e0-4b83-8f1e-8cd84f33a89b")

NBA_TEAM_KEYWORDS = [
    "hawks", "celtics", "nets", "hornets", "bulls", "cavaliers", "mavericks",
    "nuggets", "pistons", "warriors", "rockets", "pacers", "clippers", "lakers",
    "grizzlies", "heat", "bucks", "timberwolves", "pelicans", "knicks",
    "thunder", "magic", "sixers", "suns", "blazers", "kings", "spurs", "raptors",
    "jazz", "wizards"
]

NFL_TEAM_KEYWORDS = [
    "cardinals", "falcons", "ravens", "bills", "panthers", "bears", "bengals",
    "browns", "cowboys", "broncos", "lions", "packers", "texans", "colts",
    "jaguars", "chiefs", "dolphins", "vikings", "patriots", "saints", "giants",
    "jets", "raiders", "eagles", "steelers", "chargers", "49ers", "seahawks",
    "rams", "buccaneers", "titans", "commanders"
]

LEAGUE_SERIES_TICKERS = {
    "nba": "KXNBAGAME",
    "nfl": "KXNFLGAME",
}


def _is_league_market(market: Dict, league: str) -> bool:
    """Heuristic to determine whether a Kalshi market references a league matchup."""
    text_parts = [
        str(market.get('title', '')),
        str(market.get('ticker', '')),
        str(market.get('category', '')),
        str(market.get('event_ticker', '')),
        str(market.get('event', {}).get('category', ''))
    ]
    text = " ".join(text_parts).lower()

    if league == 'nba':
        if "nba" in text or "basketball" in text:
            return True
        return any(team in text for team in NBA_TEAM_KEYWORDS)
    elif league == 'nfl':
        if "nfl" in text or "football" in text:
            return True
        return any(team in text for team in NFL_TEAM_KEYWORDS)

    return False


class KalshiClient:
    def __init__(self):
        self.base_url = BASE_URL.rstrip("/")
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes
        self._last_fetch = 0
        self.api_key_id = DEFAULT_API_KEY_ID
        self._private_key = self._load_private_key()

    def _load_private_key(self):
        key_path = os.getenv("KALSHI_PRIVATE_KEY_PATH", str(DEFAULT_PRIVATE_KEY_PATH))
        try:
            path_obj = Path(key_path).resolve()
            if not path_obj.exists():
                logger.warning(f"Kalshi private key not found at {path_obj}. Falling back to unauthenticated requests.")
                return None
            with path_obj.open("rb") as fh:
                key_data = fh.read()
            return serialization.load_pem_private_key(key_data, password=None)
        except Exception as exc:
            logger.warning(f"Failed to load Kalshi private key: {exc}")
            return None

    def _normalize_endpoint(self, endpoint: str) -> str:
        if not endpoint.startswith("/"):
            endpoint = f"/{endpoint}"
        if not endpoint.startswith(API_PATH_PREFIX):
            endpoint = f"{API_PATH_PREFIX}{endpoint}"
        return endpoint

    def _create_signature_headers(self, method: str, endpoint: str) -> Dict[str, str]:
        if not self._private_key or not self.api_key_id:
            return {}

        timestamp = str(int(time.time() * 1000))
        path = endpoint.split("?")[0]
        message = f"{timestamp}{method.upper()}{path}".encode("utf-8")

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

    def _request(self, method: str, endpoint: str, **kwargs):
        endpoint = self._normalize_endpoint(endpoint)
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.pop("headers", {})
        headers.update(self._create_signature_headers(method, endpoint))
        try:
            response = requests.request(method, url, headers=headers, timeout=15, **kwargs)
            response.raise_for_status()
            return response
        except Exception as exc:
            logger.error(f"Error performing Kalshi {method} {endpoint}: {exc}")
            raise

    def get_league_markets(self, league: str = 'nba') -> List[Dict]:
        """Fetch all active markets for a league from Kalshi with caching"""
        now = time.time()
        cache_key = f'markets_{league}'
        
        if self._cache.get(cache_key) and (now - self._last_fetch < self._cache_ttl):
            logger.debug(f"Returning cached Kalshi markets for {league}")
            return self._cache.get(cache_key, [])

        try:
            # Pagination handling could be added here, but for now we assume <100 active NBA markets usually
            # We'll fetch 500 just in case
            params = {
                "status": "open",
                "limit": 500
            }
            series_ticker = LEAGUE_SERIES_TICKERS.get(league.lower())
            if series_ticker:
                params["series_ticker"] = series_ticker

            response = self._request("GET", "/markets", params=params)
            data = response.json()
            markets = data.get('markets', [])
            logger.debug(f"Fetched {len(markets)} total markets from Kalshi for {league.upper()}")

            if not markets and series_ticker:
                logger.debug(f"Series ticker {series_ticker} returned no markets. Falling back to broad fetch.")
                response = self._request("GET", "/markets", params={"status": "open", "limit": 500})
                markets = response.json().get('markets', [])

            if series_ticker:
                league_markets = markets
                logger.debug(f"Retrieved {len(league_markets)} {league.upper()} markets via {series_ticker}")
            else:
                league_markets = [m for m in markets if _is_league_market(m, league)]
                if not league_markets:
                    logger.debug(f"No {league} markets matched heuristics, returning all markets for downstream matching.")
                    league_markets = markets
                else:
                    logger.debug(f"Filtered down to {len(league_markets)} {league} markets")
            
            # Update cache
            self._cache[cache_key] = league_markets
            self._last_fetch = now
            
            return league_markets
        except Exception as e:
            logger.error(f"Error fetching Kalshi markets: {e}")
            return self._cache.get(cache_key, []) # Return stale cache if available
    
    # Backward compatibility alias
    def get_nba_markets(self) -> List[Dict]:
        return self.get_league_markets('nba')

    def normalize_market(self, market: Dict) -> Dict:
        """
        Simplify market data and attempt to identify the 'Yes' side subject.
        Returns a structured object with normalized prices.
        """
        title = market.get('title', '')
        subtitle = market.get('subtitle', '')
        ticker = market.get('ticker', '')
        
        # Identify the subject (the team "winning" in this market)
        # Usually subtitle has the team name if title is the event
        subject = title
        if subtitle:
            subject = subtitle
            
        last_price = market.get('last_price')
        yes_bid = market.get('yes_bid', 0)
        yes_ask = market.get('yes_ask', 100)
        
        # Calculate effective probability (cents to decimal)
        if last_price:
            prob = last_price / 100.0
        elif yes_bid and yes_ask:
             prob = (yes_bid + yes_ask) / 200.0
        else:
             prob = 0.5 # Default/Unknown
             
        return {
            "market_id": ticker,
            "event_ticker": market.get('event_ticker'),
            "title": title,
            "subtitle": subtitle,
            "subject": subject,
            "prob": prob,
            "yes_bid": yes_bid,
            "yes_ask": yes_ask,
            "volume": market.get('volume_24h', 0),
            "raw": market
        }

    def extract_probability(self, market: Dict) -> float:
        """Convert Kalshi market prices to probability"""
        last_price = market.get('last_price')
        yes_bid = market.get('yes_bid', 0)
        yes_ask = market.get('yes_ask', 100)
        
        if last_price:
            return last_price / 100.0
        
        # Midpoint if no last price
        return (yes_bid + yes_ask) / 200.0

    def get_market_details(self, market: Dict) -> Dict:
        """Extract rich market details for the UI"""
        yes_bid = market.get("yes_bid", 0)
        yes_ask = market.get("yes_ask", 0)
        last_price = market.get("last_price", 0)
        
        # Calculate spread metrics
        spread = yes_ask - yes_bid
        mid_price = (yes_bid + yes_ask) / 2 if yes_bid and yes_ask else last_price
        spread_pct = (spread / mid_price * 100) if mid_price > 0 else 0
        
        # Calculate 24h change if previous price available
        prev_price = market.get("previous_price")  # May not always be available
        price_change_24h = ((last_price - prev_price) / prev_price * 100) if prev_price and prev_price > 0 else 0
        
        return {
            "market_id": market.get("ticker"),
            "title": market.get("title"),
            "subtitle": market.get("subtitle"),
            "yes_bid": yes_bid,
            "yes_ask": yes_ask,
            "last_price": last_price,
            "mid_price": round(mid_price, 2),
            "spread": spread,
            "spread_pct": round(spread_pct, 2),
            "volume": market.get("volume_24h", 0),
            "open_interest": market.get("open_interest", 0),
            "liquidity": market.get("liquidity", 0),
            "close_date": market.get("close_date"),
            "last_traded": market.get("last_trade_time"),
            "price_change_24h": round(price_change_24h, 2),
            "status": market.get("status", "unknown")
        }

    def assess_market_confidence(self, market: Dict) -> str:
        """Determine how much to trust the market signal"""
        volume = market.get('volume_24h', 0)
        yes_bid = market.get('yes_bid', 0)
        yes_ask = market.get('yes_ask', 100)
        spread = yes_ask - yes_bid
        
        if volume > 500 and spread <= 5:
            return "HIGH"
        elif volume > 100 and spread <= 15:
            return "MEDIUM"
        else:
            return "LOW"
