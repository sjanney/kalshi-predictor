# Kalshi Predictor - Complete Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Installation & Setup](#installation--setup)
5. [Core Features](#core-features)
6. [API Documentation](#api-documentation)
7. [Frontend Components](#frontend-components)
8. [Backend Services](#backend-services)
9. [Data Flow](#data-flow)
10. [Security & Licensing](#security--licensing)
11. [Development Workflow](#development-workflow)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Kalshi Predictor v3.0** is a production-ready prediction engine for Kalshi sports markets (NBA & NFL). It combines advanced statistical modeling, machine learning, and real-time market data to provide actionable betting insights.

### Key Capabilities
- **Multi-Model Ensemble**: Combines Elo ratings, recent form analysis, statistical models, and ML predictions
- **Real-Time Market Integration**: Live Kalshi market data with WebSocket support
- **Advanced Analytics**: Injury impact, weather correlation, market microstructure analysis
- **Smart Signals**: Edge detection, divergence alerts, arbitrage opportunities
- **Production Ready**: Comprehensive logging, error handling, security, and licensing system

### Target Users
- Sports bettors seeking data-driven insights
- Quantitative analysts researching prediction markets
- Developers building on prediction market infrastructure

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        KALSHI PREDICTOR                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │    FRONTEND      │◄─────────────┤     BACKEND      │        │
│  │  React + TypeScript              │  FastAPI + Python│        │
│  │  Vite + Electron │   REST API   │  Uvicorn Server  │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
│           │                                  │                   │
│           │                                  │                   │
│  ┌────────▼─────────┐              ┌────────▼─────────┐        │
│  │  UI Components   │              │    Services      │        │
│  │  - Dashboard     │              │  - Prediction    │        │
│  │  - GameCard      │              │  - Data Feeds    │        │
│  │  - Analytics     │              │  - Kalshi Client │        │
│  │  - Market Modal  │              │  - ML Models     │        │
│  └──────────────────┘              └────────┬─────────┘        │
│                                              │                   │
│                                     ┌────────▼─────────┐        │
│                                     │  Data Layer      │        │
│                                     │  - SQLite DB     │        │
│                                     │  - File Cache    │        │
│                                     │  - Elo Ratings   │        │
│                                     └────────┬─────────┘        │
│                                              │                   │
│                                     ┌────────▼─────────┐        │
│                                     │  External APIs   │        │
│                                     │  - Kalshi        │        │
│                                     │  - ESPN          │        │
│                                     │  - RSS Feeds     │        │
│                                     └──────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Frontend Layer
- **Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 7.2.4
- **Desktop App**: Electron 39.2.3
- **Styling**: TailwindCSS 4.0.0
- **State Management**: Zustand 5.0.8
- **Charts**: Recharts 3.5.0
- **Animations**: Framer Motion 12.23.24

#### Backend Layer
- **Framework**: FastAPI (async Python web framework)
- **Server**: Uvicorn (ASGI server)
- **Database**: SQLite (local historical data)
- **ML Libraries**: scikit-learn, scipy, pandas
- **API Client**: httpx, aiohttp
- **WebSocket**: websockets 12.0+
- **Security**: cryptography (RSA licensing)

---

## Technology Stack

### Frontend Dependencies

```json
{
  "dependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@tailwindcss/vite": "^4.1.17",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.23.24",
    "lucide-react": "^0.554.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-window": "^2.2.3",
    "recharts": "^3.5.0",
    "zustand": "^5.0.8"
  },
  "devDependencies": {
    "electron": "^39.2.3",
    "electron-builder": "^26.0.12",
    "typescript": "~5.9.3",
    "vite": "^7.2.4"
  }
}
```

### Backend Dependencies

```
fastapi
uvicorn
requests
pandas
scikit-learn
scipy
python-dotenv
httpx
pytest
cryptography
feedparser
textblob
websockets>=12.0
aiohttp>=3.9.0
sse-starlette>=3.0.0
rich
```

---

## Installation & Setup

### Prerequisites
- **Node.js**: v18+ (for frontend)
- **Python**: 3.10+ (for backend)
- **npm**: 8+ (comes with Node.js)
- **Git**: For version control

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp env_example .env
   ```
   
   Edit `.env`:
   ```env
   KALSHI_API_BASE_URL=https://api.elections.kalshi.com
   KALSHI_API_KEY_ID=your_key_id_here
   KALSHI_PRIVATE_KEY_PATH=prediction_api_key.txt
   API_PORT=8000
   CORS_ORIGINS=*
   LOG_LEVEL=INFO
   ENVIRONMENT=development
   ```

5. **Generate license keys** (one-time setup):
   ```bash
   python scripts/generate_keys.py
   ```
   This creates `private_key.pem` and `public_key.pem`.

6. **Generate a license**:
   ```bash
   python scripts/generate_license.py --name "Your Name" --email "your@email.com"
   ```
   Save the output to `license.key` in the backend directory.

7. **Start the server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional):
   ```bash
   cp env_example .env
   ```
   
   Edit `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   VITE_APP_VERSION=3.0.0
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **For Electron app**:
   ```bash
   npm run electron:dev
   ```

### Quick Start Script

From the project root:
```bash
./start.sh
```

This script:
- Starts the backend on port 8000
- Starts the frontend dev server on port 5173
- Launches the Electron app

---

## Core Features

### 1. Enhanced Prediction Engine

**Location**: `backend/app/services/enhanced_prediction.py`

#### Elo Rating System
- Dynamic Elo ratings with 0.95 decay factor
- Home advantage adjustment (+65 Elo points)
- K-factor of 32 for rating updates
- Tracks team strength over time

#### Recent Form Analysis
- Last 5 games win percentage
- Point differential tracking
- Momentum calculation (recent 3 vs previous 2)
- Strength classification (STRONG, GOOD, NEUTRAL, WEAK)

#### Head-to-Head History
- Historical matchup tracking
- Win percentage and point differential
- 10% weight in final prediction

#### Statistical Models
- Offensive/defensive efficiency proxies
- Net rating calculations
- Strength of schedule considerations

#### Model Weighting
```python
# High confidence markets
STAT_ELO_WEIGHT = 0.15
STAT_FORM_WEIGHT = 0.10
STAT_RECORD_WEIGHT = 0.20
STAT_INJURY_WEIGHT = 0.05
KALSHI_WEIGHT = 0.50

# Low confidence markets
STAT_ELO_WEIGHT = 0.25
STAT_FORM_WEIGHT = 0.20
STAT_RECORD_WEIGHT = 0.35
STAT_INJURY_WEIGHT = 0.05
KALSHI_WEIGHT = 0.15
```

### 2. Enhanced Signal Generation

**Location**: `backend/app/services/enhanced_signals.py`

#### Price Momentum Tracking
- Historical price tracking (last 100 prices)
- Short-term vs long-term trend detection
- Bullish/bearish momentum with strength levels

#### Volume Analysis
- Volume spike detection (2x+ average)
- Volume history tracking
- Correlation with price movements

#### Market Microstructure
- Bid-ask spread analysis
- Order flow detection
- Market efficiency scoring

#### Arbitrage Detection
- Detects pricing inefficiencies (3%+)
- Long and short arbitrage opportunities
- Market quality scoring

### 3. Real-Time Market Data

**Location**: `backend/app/services/kalshi_websocket.py`

#### WebSocket Integration
- Authenticated WebSocket connection to Kalshi
- Real-time market updates
- Automatic reconnection on disconnect
- Message queuing and broadcasting

#### Market Data Enhancement
```python
{
    "mid_price": float,        # (bid + ask) / 2
    "spread_pct": float,       # spread / mid_price * 100
    "price_change_24h": float, # % change over 24h
    "open_interest": int,      # Total contracts
    "liquidity": int,          # Depth score
    "last_traded": str,        # ISO timestamp
    "status": str              # Market status
}
```

### 4. Advanced Analytics

#### Injury Impact Analysis
**Location**: `backend/app/services/enhanced_data_feeds.py`

- Position-based impact weighting
- Severity classification (CRITICAL, HIGH, MEDIUM, LOW)
- Team-level injury aggregation
- Real-time injury data fetching

#### Weather Correlation (NFL)
- Weather severity scoring
- Impact on game outcomes
- Wind, precipitation, temperature factors

#### News Sentiment Analysis
- RSS feed aggregation
- TextBlob sentiment scoring
- Team-specific news filtering

### 5. Accuracy Tracking

**Location**: `backend/app/services/accuracy_tracker.py`

#### Performance Metrics
- **Binary Accuracy**: Correct win/loss predictions
- **Brier Score**: Probability calibration
- **Log Loss**: Probabilistic accuracy
- **Calibration Curves**: Predicted vs actual by bucket

#### Model Comparison
- Statistical model accuracy
- Kalshi market accuracy
- Elo rating accuracy
- Form-based prediction accuracy

### 6. Portfolio Kelly Calculator

**Location**: `frontend/src/components/PortfolioKellyCalculator.tsx`

- Multi-game selection
- Aggregate Kelly fraction calculation
- Total recommended bet sizing
- Expected value aggregation
- Risk-adjusted portfolio recommendations

---

## API Documentation

### Base URL
```
http://localhost:8000
```

### Authentication
All endpoints (except `/health` and `/api/license/*`) require a valid license.

### Endpoints

#### 1. Get Games with Predictions
```http
GET /api/games?league={NBA|NFL}
```

**Query Parameters**:
- `league` (optional): Filter by league (NBA or NFL)

**Response**:
```json
{
  "games": [
    {
      "id": "string",
      "league": "NBA",
      "home_team": "Lakers",
      "away_team": "Warriors",
      "date": "2025-11-27T19:00:00Z",
      "prediction": {
        "home_win_prob": 0.65,
        "away_win_prob": 0.35,
        "confidence": "HIGH",
        "edge": 0.15,
        "ev": 2.5,
        "kelly_fraction": 0.08,
        "recommended_bet": "HOME",
        "reasoning": ["..."]
      },
      "market_data": {
        "price": 65,
        "yes_bid": 64,
        "yes_ask": 66,
        "mid_price": 65.0,
        "spread": 2,
        "spread_pct": 3.08,
        "volume": 1250,
        "open_interest": 5000,
        "liquidity": 850,
        "confidence": "HIGH"
      },
      "signals": [
        {
          "type": "EDGE",
          "strength": "HIGH",
          "description": "Model predicts 15% edge",
          "actionable": true
        }
      ]
    }
  ]
}
```

#### 2. Get Game Details
```http
GET /api/games/{game_id}
```

**Response**:
```json
{
  "game": { /* Same as above */ },
  "context": {
    "injuries": {
      "home": [
        {
          "player": "LeBron James",
          "status": "QUESTIONABLE",
          "position": "SF",
          "impact": "HIGH"
        }
      ],
      "away": []
    },
    "weather": {
      "condition": "Clear",
      "temperature": 72,
      "wind_speed": 5,
      "severity": "NONE"
    },
    "news": [
      {
        "title": "Lakers on 5-game win streak",
        "sentiment": 0.8,
        "source": "ESPN"
      }
    ]
  },
  "analytics": {
    "elo_ratings": {
      "home": 1650,
      "away": 1580
    },
    "recent_form": {
      "home": {
        "last_5_wins": 4,
        "momentum": "STRONG"
      },
      "away": {
        "last_5_wins": 2,
        "momentum": "WEAK"
      }
    },
    "head_to_head": {
      "games_played": 12,
      "home_wins": 7,
      "avg_point_diff": 5.2
    }
  }
}
```

#### 3. Get Market Context
```http
GET /api/market-context?league={NBA|NFL}
```

**Response**:
```json
{
  "weather": { /* Weather data for all games */ },
  "injuries": { /* Injury data for all teams */ },
  "news": { /* Recent news for all teams */ }
}
```

#### 4. Get Accuracy Metrics
```http
GET /api/accuracy?days_back=30
```

**Response**:
```json
{
  "overall": {
    "accuracy": 0.68,
    "brier_score": 0.18,
    "log_loss": 0.52,
    "total_predictions": 150
  },
  "by_model": {
    "statistical": { "accuracy": 0.65 },
    "elo": { "accuracy": 0.62 },
    "form": { "accuracy": 0.58 },
    "kalshi": { "accuracy": 0.70 }
  },
  "calibration": [
    { "predicted": 0.6, "actual": 0.58, "count": 25 }
  ]
}
```

#### 5. WebSocket Endpoint
```
ws://localhost:8000/ws/markets
```

**Message Format**:
```json
{
  "type": "market_update",
  "market_id": "NBAWIN-LAL-2025-11-27",
  "data": {
    "price": 66,
    "volume": 1300,
    "timestamp": "2025-11-27T20:15:30Z"
  }
}
```

#### 6. License Management
```http
POST /api/license/activate
Content-Type: application/json

{
  "license_key": "your_license_key_here"
}
```

```http
GET /api/license/status
```

#### 7. Health Check
```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "environment": "development"
}
```

---

## Frontend Components

### Component Hierarchy

```
App
├── Dashboard
│   ├── Toolbar
│   ├── InsightsPanel
│   ├── AccuracyPanel
│   └── GameList
│       └── GameCard
│           ├── GameAnalyticsModal
│           │   ├── OverviewTab
│           │   ├── AnalyticsTab
│           │   ├── ContextTab
│           │   └── MarketTab
│           └── MarketDetailModal
├── StrategyLab
├── PortfolioKellyCalculator
└── HelpGuide
```

### Key Components

#### 1. Dashboard
**Location**: `frontend/src/components/Dashboard.tsx`

- Main application view
- Displays game cards in a grid
- Filters by league (NBA/NFL)
- Real-time data updates

#### 2. GameCard
**Location**: `frontend/src/components/GameCard.tsx`

- Displays individual game information
- Shows prediction probabilities
- Displays signals and edge
- Opens analytics modal on click

**Props**:
```typescript
interface GameCardProps {
  game: Game;
  onClick: () => void;
}
```

#### 3. GameAnalyticsModal
**Location**: `frontend/src/components/GameAnalyticsModal.tsx`

- Tabbed interface for game details
- Overview, Analytics, Context, Market tabs
- Charts and visualizations
- Responsive design

#### 4. MarketDetailModal
**Location**: `frontend/src/components/MarketDetailModal.tsx`

- Enhanced market analytics
- Price/volume charts
- Market quality scoring
- Trading interface (future)

#### 5. PortfolioKellyCalculator
**Location**: `frontend/src/components/PortfolioKellyCalculator.tsx`

- Multi-game selection
- Aggregate statistics
- Portfolio recommendations
- Animated transitions

#### 6. StrategyLab
**Location**: `frontend/src/components/StrategyLab.tsx`

- Game evaluation interface
- Custom probability inputs
- Kelly calculation
- Strategy testing

---

## Backend Services

### Service Architecture

```
backend/app/services/
├── enhanced_prediction.py      # Main prediction engine
├── enhanced_data_feeds.py      # Market context (weather, injuries, news)
├── enhanced_signals.py         # Signal generation
├── kalshi.py                   # Kalshi API client
├── kalshi_websocket.py         # WebSocket service
├── nba.py                      # NBA data client
├── nfl.py                      # NFL data client
├── elo_manager.py              # Elo rating system
├── accuracy_tracker.py         # Performance tracking
├── model_trainer.py            # ML model training
├── model_calibration.py        # Model calibration
└── game_result_monitor.py      # Automated result tracking
```

### Service Descriptions

#### 1. EnhancedPredictionEngine
**File**: `enhanced_prediction.py`

**Responsibilities**:
- Generate predictions for games
- Combine multiple models (Elo, form, stats, ML)
- Calculate edge and EV
- Provide reasoning for predictions

**Key Methods**:
```python
def generate_prediction(
    game: dict,
    home_stats: dict,
    away_stats: dict,
    kalshi_markets: list,
    all_games: list = None
) -> dict
```

#### 2. EnhancedDataFeeds
**File**: `enhanced_data_feeds.py`

**Responsibilities**:
- Fetch injury data
- Get weather information
- Aggregate news and sentiment
- Calculate injury impact

**Key Methods**:
```python
def get_team_injuries(team: str, league: str) -> list
def get_weather_for_game(game: dict) -> dict
def get_team_news(team: str, league: str) -> list
def calculate_injury_impact(injuries: list) -> dict
```

#### 3. EnhancedSignalEngine
**File**: `enhanced_signals.py`

**Responsibilities**:
- Generate trading signals
- Detect arbitrage opportunities
- Analyze market microstructure
- Track price momentum

**Key Methods**:
```python
def generate_signals(
    game: dict,
    market_data: dict,
    context: dict,
    kalshi_markets: list
) -> list
```

#### 4. KalshiClient
**File**: `kalshi.py`

**Responsibilities**:
- Authenticate with Kalshi API
- Fetch market data
- Get market details
- Handle API errors

**Key Methods**:
```python
def get_league_markets(league: str) -> list
def get_market_details(market_id: str) -> dict
def authenticate() -> str
```

#### 5. KalshiWebSocketService
**File**: `kalshi_websocket.py`

**Responsibilities**:
- Maintain WebSocket connection
- Subscribe to market updates
- Broadcast updates to clients
- Handle reconnection

**Key Methods**:
```python
async def start()
async def stop()
async def subscribe_to_markets(market_ids: list)
```

#### 6. EloManager
**File**: `elo_manager.py`

**Responsibilities**:
- Maintain Elo ratings for teams
- Update ratings after games
- Calculate expected win probabilities
- Persist ratings to disk

**Key Methods**:
```python
def get_elo(team: str, league: str) -> float
def update_elo(winner: str, loser: str, league: str, point_diff: int)
def calculate_win_probability(team1_elo: float, team2_elo: float, home_advantage: bool) -> float
```

#### 7. AccuracyTracker
**File**: `accuracy_tracker.py`

**Responsibilities**:
- Record predictions
- Record game outcomes
- Calculate accuracy metrics
- Generate calibration curves

**Key Methods**:
```python
def record_prediction(prediction: dict, game_id: str, league: str)
def record_outcome(game_id: str, home_won: bool, home_score: int, away_score: int)
def calculate_accuracy_metrics(days_back: int = 30) -> dict
```

---

## Data Flow

### Prediction Generation Flow

```
1. User opens Dashboard
   │
   ├──> Frontend calls GET /api/games
   │
2. Backend receives request
   │
   ├──> NFLClient.fetch_games() or NBAClient.fetch_games()
   │    │
   │    └──> Returns: game_id, teams, date, status
   │
3. KalshiClient.get_league_markets(league)
   │
   ├──> Fetches markets from Kalshi API
   │    │
   │    └──> Returns: markets with prices, volume, bid/ask
   │
4. Match games to markets
   │
   ├──> match_game_to_markets(game, markets)
   │
5. For each game:
   │
   ├──> EnhancedDataFeeds.get_team_injuries(team, league)
   ├──> EnhancedDataFeeds.get_weather_for_game(game)
   ├──> EnhancedDataFeeds.get_team_news(team, league)
   │
6. EnhancedPredictionEngine.generate_prediction()
   │
   ├──> Calculate Elo probabilities
   ├──> Calculate form-based probabilities
   ├──> Calculate statistical probabilities
   ├──> Calculate injury impact
   ├──> Combine with Kalshi market data
   ├──> Calculate edge and EV
   ├──> Generate reasoning
   │
7. EnhancedSignalEngine.generate_signals()
   │
   ├──> Analyze price momentum
   ├──> Detect volume spikes
   ├──> Check for arbitrage
   ├──> Evaluate market microstructure
   │
8. AccuracyTracker.record_prediction()
   │
   ├──> Store prediction in database
   │
9. Return response to frontend
   │
   └──> Frontend renders GameCards with predictions
```

### Real-Time Update Flow

```
1. Backend starts WebSocket service
   │
   ├──> KalshiWebSocketService.start()
   │    │
   │    └──> Connects to Kalshi WebSocket API
   │
2. Frontend connects to backend WebSocket
   │
   ├──> ws://localhost:8000/ws/markets
   │
3. Kalshi sends market update
   │
   ├──> WebSocket receives message
   │    │
   │    └──> Parses market data
   │
4. Backend broadcasts to all connected clients
   │
   ├──> Sends JSON message with updated data
   │
5. Frontend receives update
   │
   ├──> Updates Zustand store
   │    │
   │    └──> React components re-render
   │
6. User sees updated prices/volumes in real-time
```

---

## Security & Licensing

### Licensing System

**Location**: `backend/app/core/security.py`

#### Architecture
- **Offline licensing**: No central server required
- **RSA signatures**: Prevents license forgery
- **Asymmetric cryptography**: Private key for signing, public key for verification

#### Key Generation
```bash
python backend/scripts/generate_keys.py
```

Creates:
- `private_key.pem` (keep secret, used for signing)
- `public_key.pem` (ship with app, used for verification)

#### License Generation
```bash
python backend/scripts/generate_license.py --name "John Doe" --email "john@example.com"
```

Output:
```
eyJ1c2VyX25hbWUiOiJKb2huIERvZSIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsImlzc3VlZF9hdCI6IjIwMjUtMTEtMjdUMDA6MDA6MDBaIn0=.signature_here
```

#### License Verification
```python
from app.core.security import license_manager

# Load and verify license
is_valid = license_manager.load_and_verify_stored_license()

# Check if license is active
if license_manager.is_active:
    # Allow access
else:
    # Block access
```

#### Middleware Protection
```python
@app.middleware("http")
async def check_license(request: Request, call_next):
    # Allow health check and license endpoints
    if request.url.path in ["/", "/health"] or request.url.path.startswith("/api/license"):
        return await call_next(request)
    
    # Check license
    if not license_manager.is_active:
        return JSONResponse(
            status_code=403,
            content={"detail": "License invalid or missing"}
        )
    
    return await call_next(request)
```

### API Security

#### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Kalshi API Authentication
```python
# RSA-PSS signature generation
signature = private_key.sign(
    message.encode(),
    padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH
    ),
    hashes.SHA256()
)
```

### Data Security

#### Environment Variables
- Never commit `.env` files
- Use `env_example` as template
- Store sensitive keys outside repository

#### Database Security
- SQLite database with file permissions
- No sensitive user data stored
- Predictions and outcomes only

---

## Development Workflow

### Project Structure

```
kalshi-predictor/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── core/             # Core infrastructure
│   │   ├── services/         # Business logic
│   │   ├── config.py         # Configuration
│   │   └── main.py           # Application entry
│   ├── data/                 # SQLite database
│   ├── logs/                 # Application logs
│   ├── models/               # ML models
│   ├── scripts/              # Utility scripts
│   ├── tests/                # Unit tests
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities and API
│   │   └── main.tsx          # Application entry
│   ├── electron/             # Electron main process
│   ├── public/               # Static assets
│   └── package.json          # Node dependencies
├── docs/                     # Documentation
├── installers/               # macOS/Windows installers
├── landing_page/             # Marketing landing page
├── .cursor/                  # Cursor IDE documentation
├── README.md                 # Main documentation
└── start.sh                  # Quick start script
```

### Development Commands

#### Backend
```bash
# Activate virtual environment
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run server with hot reload
cd backend
uvicorn app.main:app --reload --port 8000

# Run tests
pytest backend/tests/

# Generate license
python backend/scripts/generate_license.py --name "Test User" --email "test@example.com"
```

#### Frontend
```bash
# Install dependencies
cd frontend
npm install

# Run dev server
npm run dev

# Run Electron app
npm run electron:dev

# Build for production
npm run build

# Build Electron app
npm run electron:build

# Lint code
npm run lint
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
```

### Code Style

#### Python (Backend)
- Follow PEP 8
- Use type hints
- Document functions with docstrings
- Maximum line length: 100 characters

```python
def calculate_elo_probability(
    team1_elo: float,
    team2_elo: float,
    home_advantage: bool = False
) -> float:
    """
    Calculate win probability based on Elo ratings.
    
    Args:
        team1_elo: Elo rating of team 1
        team2_elo: Elo rating of team 2
        home_advantage: Whether team 1 has home advantage
        
    Returns:
        Probability of team 1 winning (0.0 to 1.0)
    """
    # Implementation
```

#### TypeScript (Frontend)
- Use TypeScript strict mode
- Define interfaces for all data structures
- Use functional components with hooks
- Maximum line length: 100 characters

```typescript
interface GameCardProps {
  game: Game;
  onClick: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  // Implementation
};
```

### Testing

#### Backend Tests
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_enhanced_prediction.py

# Run with coverage
pytest --cov=app tests/
```

#### Frontend Tests (Future)
```bash
# Run tests
npm run test

# Run with coverage
npm run test:coverage
```

---

## Deployment

### Production Build

#### Backend
```bash
cd backend

# Install production dependencies
pip install -r requirements.txt

# Set environment to production
export ENVIRONMENT=production

# Run with Gunicorn (production server)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Frontend
```bash
cd frontend

# Build for web
npm run build

# Build Electron app
npm run electron:build
```

### macOS Installer

**Location**: `installers/mac/`

```bash
cd installers/mac
./build_installer.sh
```

Creates:
- `.pkg` installer for macOS
- Includes backend, frontend, and dependencies
- Installs to `/Applications/KalshiPredictor/`

### Environment Configuration

#### Production `.env` (Backend)
```env
ENVIRONMENT=production
API_PORT=8000
CORS_ORIGINS=https://yourdomain.com
LOG_LEVEL=WARNING
KALSHI_API_BASE_URL=https://api.elections.kalshi.com
KALSHI_API_KEY_ID=your_production_key
KALSHI_PRIVATE_KEY_PATH=/path/to/production/key.txt
```

#### Production `.env` (Frontend)
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_VERSION=3.0.0
```

### Monitoring

#### Logs
```bash
# View backend logs
tail -f backend/logs/app.log

# View error logs
grep ERROR backend/logs/app.log
```

#### Health Check
```bash
curl http://localhost:8000/health
```

---

## Troubleshooting

### Common Issues

#### 1. Backend won't start

**Symptom**: `uvicorn: command not found` or import errors

**Solution**:
```bash
# Ensure virtual environment is activated
source backend/venv/bin/activate

# Reinstall dependencies
pip install -r backend/requirements.txt

# Check Python version (must be 3.10+)
python --version
```

#### 2. Frontend connection errors

**Symptom**: "Failed to fetch" or CORS errors

**Solution**:
```bash
# Ensure backend is running
curl http://localhost:8000/health

# Check CORS settings in backend/app/config.py
# Verify VITE_API_BASE_URL in frontend/.env
```

#### 3. License errors

**Symptom**: 403 Forbidden on all API calls

**Solution**:
```bash
# Generate new license
cd backend
python scripts/generate_license.py --name "Your Name" --email "your@email.com"

# Save output to license.key
echo "license_key_here" > license.key

# Restart backend
```

#### 4. Kalshi API errors

**Symptom**: "Authentication failed" or empty market data

**Solution**:
```bash
# Verify API credentials
cat backend/.env | grep KALSHI

# Check private key file exists
ls -l prediction_api_key.txt

# Test authentication
python backend/test_websocket_credentials.py
```

#### 5. Database errors

**Symptom**: "Database locked" or "Table not found"

**Solution**:
```bash
# Delete and recreate database
rm backend/data/historical_data.db

# Restart backend (will recreate tables)
cd backend
uvicorn app.main:app --reload
```

#### 6. Electron app won't start

**Symptom**: White screen or "Cannot find module"

**Solution**:
```bash
# Rebuild frontend
cd frontend
npm run build

# Clear cache
rm -rf .vite dist

# Reinstall dependencies
rm -rf node_modules
npm install

# Try again
npm run electron:dev
```

### Debug Mode

#### Enable Debug Logging (Backend)
```bash
# In backend/.env
LOG_LEVEL=DEBUG
```

#### Enable Debug Logging (Frontend)
```javascript
// In browser console
localStorage.setItem('DEBUG', 'true');
```

### Performance Issues

#### Slow predictions
- Check if Kalshi API is responding slowly
- Verify network connectivity
- Consider enabling caching in `enhanced_prediction.py`

#### High memory usage
- Reduce cache sizes in `SimpleCache`
- Limit historical data retention
- Monitor with `top` or Activity Monitor

---

## Additional Resources

### Documentation Files
- `README.md` - Main documentation
- `PRODUCTION_READY.md` - Production deployment guide
- `IMPROVEMENTS.md` - Accuracy improvements
- `ACCURACY_TRACKING.md` - Tracking system documentation
- `MODEL_TRAINING_GUIDE.md` - ML model training
- `.cursor/architecture.md` - Technical architecture
- `.cursor/user_guide.md` - User guide

### External Links
- [Kalshi API Documentation](https://docs.kalshi.com)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [React Documentation](https://react.dev)
- [Electron Documentation](https://www.electronjs.org/docs)

### Support
For issues or questions, check:
1. This documentation
2. Existing GitHub issues
3. Conversation history in `.cursor/`

---

**Last Updated**: November 26, 2025
**Version**: 3.0.0
**Maintained by**: Shane Janney
