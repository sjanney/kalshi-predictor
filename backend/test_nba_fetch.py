import asyncio
from app.services.nba import NBAClient
from datetime import datetime, timedelta

async def test_fetch():
    client = NBAClient()
    today = datetime.now()
    
    print("Testing fetch for last 3 days...")
    for i in range(1, 4):
        date = (today - timedelta(days=i)).strftime("%Y%m%d")
        print(f"Fetching for {date}...")
        games = client.get_scoreboard(date)
        print(f"Date: {date}, Games found: {len(games)}")
        if games:
            print(f"Sample game status: {games[0].get('status')}")
            print(f"Sample game ID: {games[0].get('game_id')}")
            print(f"Sample team IDs: {games[0].get('home_team_id')} vs {games[0].get('away_team_id')}")

if __name__ == "__main__":
    asyncio.run(test_fetch())
