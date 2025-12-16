"""
Mock WebSocket data for testing Live Markets tab
Provides simulated market data when WebSocket connection is unavailable
"""
import random
from datetime import datetime, timedelta

# Sample market tickers for different sports
MOCK_MARKETS = {
    "nfl": [
        "KXNFL-2024-W13-BUF-SF",
        "KXNFL-2024-W13-KC-LV",
        "KXNFL-2024-W13-PHI-BAL",
        "KXNFL-2024-W13-DET-CHI",
        "KXNFL-2024-W13-MIA-GB",
    ],
    "nba": [
        "KXNBA-2024-11-26-LAL-PHX",
        "KXNBA-2024-11-26-BOS-MIA",
        "KXNBA-2024-11-26-GSW-DEN",
        "KXNBA-2024-11-26-DAL-HOU",
        "KXNBA-2024-11-26-NYK-BKN",
    ]
}


def generate_mock_market_data():
    """Generate mock market data for all sports"""
    markets = []
    
    for sport, tickers in MOCK_MARKETS.items():
        for ticker in tickers:
            # Generate realistic price data
            yes_price = random.uniform(0.35, 0.65)
            no_price = 1 - yes_price
            
            # Generate price history (last 20 points)
            base_price = yes_price
            price_history = []
            for i in range(20):
                # Add some random walk
                change = random.uniform(-0.02, 0.02)
                price = max(0.1, min(0.9, base_price + change))
                timestamp = (datetime.now() - timedelta(minutes=20-i)).isoformat()
                price_history.append({
                    "price": price,
                    "timestamp": timestamp
                })
                base_price = price
            
            market = {
                "ticker": ticker,
                "yes_price": yes_price,
                "no_price": no_price,
                "last_price": yes_price,
                "volume": random.randint(5000, 50000),
                "open_interest": random.randint(10000, 100000),
                "timestamp": datetime.now().isoformat(),
                "price_history": price_history,
            }
            
            # Randomly add last trade data
            if random.random() > 0.5:
                market["last_trade"] = {
                    "price": yes_price + random.uniform(-0.01, 0.01),
                    "count": random.randint(1, 100),
                    "taker_side": random.choice(["yes", "no"]),
                    "timestamp": datetime.now().isoformat()
                }
            
            markets.append(market)
    
    return markets
