from app.services.kalshi import KalshiClient
import json

client = KalshiClient()
# Hack to bypass filter for debug
import requests
response = requests.get("https://api.elections.kalshi.com/trade-api/v2/markets", params={"limit": 20, "status": "open"})
data = response.json()
markets = data.get('markets', [])

print(f"First 20 raw markets:")
for m in markets:
    print(f" - {m.get('title')} [{m.get('ticker')}] Cat: {m.get('category')}")
