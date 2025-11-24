# Kalshi Predictor Context

## Overview
- Fullstack project under `/Users/shanejanney/Desktop/kalshi predictor`
- Backend: FastAPI (`backend/app`) providing `/api/games`
- Frontend: Vite + React + Electron (`frontend`) showing dashboards of NBA markets

## Backend Highlights
- `app/services/nba.py` pulls ESPN scoreboard games (fallback mock data if API fails)
- `app/services/kalshi.py`
  - Fetches Kalshi markets with heuristic NBA filter, caches results for 5 minutes
  - Normalizes markets and can generate mock markets (`generate_mock_markets_for_games`) when live data lacks NBA events
- `app/api/endpoints.py`
  - Matches ESPN games to Kalshi markets via `_build_team_keys` tokens and `match_game_to_markets`
  - Falls back to mock markets if none match
- `app/services/prediction.py`
  - Combines stat model probabilities with market signals
  - Outputs both `home_kalshi_prob` and `away_kalshi_prob`, plus final blended win probability and divergence signals

## Frontend Highlights
- `frontend/src/lib/api.ts` defines `Prediction` with dual market probabilities
- `frontend/src/components/GameCard.tsx`
  - Displays model, market, and final win probabilities for both teams
  - Shows market confidence, divergence badges, and recommendations
- `frontend/src/components/Dashboard.tsx` handles filtering, sorting, refresh intervals, stats, and electron UI tweaks

## Key Behaviors
- If Kalshi doesn’t return NBA matchups, backend logs “No matching game markets found. Generating MOCK markets for demo.” and produces realistic synthetic prices
- Frontend refreshes `/api/games` every 5 minutes (configurable) and filters results by confidence level and sort preferences

## Testing & Running
1. `./start.sh` launches backend (port 8000) and Electron frontend (Vite dev server on 5173)
2. `/api/games` JSON includes per-game structure with nested `prediction`, `factors`, and `market_data`
3. For quick verification, run: `curl http://localhost:8000/api/games?sort_by=time | jq '.[0]'`

## Future Ideas
- Replace mock markets with real Kalshi game tickers once available
- Persist Kalshi data to avoid fallback reliance and enable historical charts
- Expand prediction engine with richer team stats and volatility modeling

