# Kalshi Predictor – Project Context & Feature Summary

## Overview
The **Kalshi Predictor** is a cross‑platform desktop application built with **Electron**, providing AI‑enhanced predictions for NBA/NFL games and Kalshi market contracts. It combines a modern **React/TypeScript** frontend with a **Flask** backend, integrating multiple data sources and local AI memory.

## Tech Stack
- **Frontend**: React, TypeScript (TSX), Vite, Electron, vanilla CSS (glassmorphism, gradients, micro‑animations).
- **Backend**: Python, Flask, various services (`nba.py`, `kalshi.py`, `prediction.py`, memory DB, etc.).
- **Data Sources**: Kalshi API, ESPN/NBA data feeds, free news/sentiment APIs (`feedparser`, `textblob`).
- **Local AI Memory**: Encrypted SQLite vector store for private notes and semantic search.
- **Build/Run**: `start.sh` launches Flask server (port 8000) and Electron UI (Vite dev server on 5173).

## Core Features
1. **Prediction Dashboard** – Displays upcoming games with AI‑generated win probabilities, market prices, confidence/divergence badges, and recommendations.
2. **Loading Screen** – Animated progress bar shown while the app initializes.
3. **Landing Page** – Visually rich entry page matching the app’s premium aesthetic.
4. **Help Guide** – Interactive animated guide explaining divergence, confidence, Kelly Criterion, etc.
5. **Game Cards** – Redesigned cards with team logos and dynamic AI prediction percentages.
6. **Accuracy Tracker** – Records predictions vs. outcomes to compute accuracy metrics.
7. **Free API Integration** – Replaced Google Gemini with free news and sentiment APIs.
8. **Local Encrypted Memory DB** – Private note‑taking, semantic search, and vector storage.
9. **Notion‑like Editor** – Live‑preview markdown editor with rich‑text commands.
10. **Semantic Search** – Context‑aware note linking, tagging, and AI‑driven retrieval.
11. **Settings & Onboarding** – User profile, theme selection, and initial setup flow.
12. **Dynamic UI Enhancements** – Glass‑style components, micro‑animations, responsive layout.
13. **Error Handling & Logging** – Improved backend logging and UI error displays.

## Recent Improvements
- Added loading screen and landing page.
- Implemented free news/sentiment APIs, removing Gemini dependency.
- Developed encrypted local memory DB with related endpoints.
- Refactored backend routes into modular files (`memory_routes.py`, `file_routes.py`).
- Updated frontend API layer to use plain `fetch` calls.
- Created animated help guide and redesigned game cards.
- Fixed UI bugs (grey whitespace, overlapping elements) and backend timeouts.

## Known Issues / TODO
- Final polish of AI prediction display (static 65% placeholder).
- Full UI integration of local memory search.
- Additional micro‑animation tweaks for premium feel.
- Comprehensive test suite for backend services.
- Replace mock markets with live Kalshi data once available.

---
*Generated on 2025‑11‑25. This file resides in the hidden `.cursor` directory for quick reference.*
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


