import requests
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional

BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"
NBA_TEAM_KEYWORDS = [
    "hawks", "celtics", "nets", "hornets", "bulls", "cavaliers", "mavericks",
    "nuggets", "pistons", "warriors", "rockets", "pacers", "clippers", "lakers",
    "grizzlies", "heat", "bucks", "timberwolves", "pelicans", "knicks",
    "thunder", "magic", "sixers", "suns", "blazers", "kings", "spurs", "raptors",
    "jazz", "wizards"
]


def _is_nba_market(market: Dict) -> bool:
    """Heuristic to determine whether a Kalshi market references an NBA matchup."""
    text_parts = [
        str(market.get('title', '')),
        str(market.get('ticker', '')),
        str(market.get('category', '')),
        str(market.get('event_ticker', '')),
        str(market.get('event', {}).get('category', ''))
    ]
    text = " ".join(text_parts).lower()

    if "nba" in text or "basketball" in text:
        return True

    return any(team in text for team in NBA_TEAM_KEYWORDS)


class KalshiClient:
    def __init__(self):
        self.base_url = BASE_URL
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes
        self._last_fetch = 0

    def get_nba_markets(self) -> List[Dict]:
        """Fetch all active NBA markets from Kalshi with caching"""
        now = time.time()
        if self._cache and (now - self._last_fetch < self._cache_ttl):
            print("DEBUG: Returning cached Kalshi markets")
            return self._cache.get('markets', [])

        try:
            # Pagination handling could be added here, but for now we assume <100 active NBA markets usually
            # We'll fetch 500 just in case
            response = requests.get(
                f"{self.base_url}/markets",
                params={
                    "status": "open",
                    "limit": 500  # Increased limit
                }
            )
            response.raise_for_status()
            data = response.json()
            markets = data.get('markets', [])
            print(f"DEBUG: Fetched {len(markets)} total markets from Kalshi")
            
            # Filter for NBA games using expanded heuristics
            nba_markets = [m for m in markets if _is_nba_market(m)]

            if not nba_markets:
                print("DEBUG: No NBA markets matched heuristics, returning all markets for downstream matching.")
                # Don't cache 'all' if we failed to filter, or maybe we should? 
                # For safety let's just return them but not cache as 'nba_markets' to force retry? 
                # No, usually it means our heuristic failed or no markets exist.
                # Let's cache empty if it's truly empty, or 'all' if we're unsure.
                # If we return 'all', matching will be slow but works.
                nba_markets = markets

            print(f"DEBUG: Filtered down to {len(nba_markets)} NBA markets")
            
            # Update cache
            self._cache = {'markets': nba_markets}
            self._last_fetch = now
            
            return nba_markets
        except Exception as e:
            print(f"Error fetching Kalshi markets: {e}")
            return self._cache.get('markets', []) # Return stale cache if available

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

    def generate_mock_markets_for_games(self, games: List[Dict]) -> List[Dict]:
        """Generate mock markets for a list of games to simulate API data."""
        import random
        mock_markets = []
        
        for game in games:
            home = game.get('home_team_name')
            away = game.get('away_team_name')
            if not home or not away:
                continue
                
            # Randomize prob
            home_prob = random.uniform(0.3, 0.7)
            yes_bid = int(home_prob * 100) - 1
            yes_ask = int(home_prob * 100) + 1
            
            # Create a "Winner" market
            mock_markets.append({
                "ticker": f"KX-{home[:3].upper()}{away[:3].upper()}",
                "event_ticker": f"KX-{home[:3].upper()}{away[:3].upper()}",
                "title": f"Winner of {home} vs {away}",
                "subtitle": home, # Implies Home is Yes
                "last_price": int(home_prob * 100),
                "yes_bid": yes_bid,
                "yes_ask": yes_ask,
                "volume_24h": random.randint(1000, 50000),
                "open_interest": random.randint(500, 10000),
                "liquidity": random.randint(10000, 100000),
                "category": "NBA",
                "status": "open"
            })
            
        return mock_markets

    def get_market_details(self, market: Dict) -> Dict:
        """Extract rich market details for the UI"""
        return {
            "market_id": market.get("ticker"),
            "title": market.get("title"),
            "yes_bid": market.get("yes_bid", 0),
            "yes_ask": market.get("yes_ask", 0),
            "last_price": market.get("last_price", 0),
            "volume": market.get("volume_24h", 0),
            "open_interest": market.get("open_interest", 0),
            "liquidity": market.get("liquidity", 0),
            "close_date": market.get("close_date")
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
