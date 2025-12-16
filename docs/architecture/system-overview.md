# System Architecture Overview

This document provides a comprehensive overview of the Kalshi Predictor system architecture.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KALSHI PREDICTOR                             │
│                         Version 3.0.0                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────┐         ┌──────────────────────┐         │
│  │   Desktop App        │         │   Web App            │         │
│  │   (Electron)         │         │   (Browser)          │         │
│  │   - React 19.2.0     │         │   - React 19.2.0     │         │
│  │   - TypeScript       │         │   - Vite Dev Server  │         │
│  │   - TailwindCSS 4.0  │         │   - Port 5173        │         │
│  └──────────┬───────────┘         └──────────┬───────────┘         │
│             │                                 │                      │
│             └─────────────┬───────────────────┘                      │
│                           │                                          │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                         APPLICATION LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              FastAPI Backend (Python)                 │          │
│  │              Port 8000                                │          │
│  ├──────────────────────────────────────────────────────┤          │
│  │                                                       │          │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │          │
│  │  │   API       │  │  WebSocket  │  │  Middleware │ │          │
│  │  │  Endpoints  │  │   Service   │  │  - CORS     │ │          │
│  │  │             │  │             │  │  - License  │ │          │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │          │
│  │                                                       │          │
│  └───────────────────────┬───────────────────────────────┘          │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                         BUSINESS LOGIC LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Prediction      │  │  Signal          │  │  Data Feeds     │  │
│  │  Engine          │  │  Engine          │  │  Service        │  │
│  │  - Elo Ratings   │  │  - Edge Detection│  │  - Injuries     │  │
│  │  - Form Analysis │  │  - Momentum      │  │  - Weather      │  │
│  │  - ML Models     │  │  - Arbitrage     │  │  - News         │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Kalshi Client   │  │  NBA/NFL Client  │  │  Accuracy       │  │
│  │  - API Auth      │  │  - Game Data     │  │  Tracker        │  │
│  │  - Market Data   │  │  - Team Stats    │  │  - Metrics      │  │
│  │  - WebSocket     │  │  - Schedules     │  │  - Calibration  │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                         DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  SQLite DB       │  │  File Cache      │  │  Elo Ratings    │  │
│  │  - Predictions   │  │  - Market Data   │  │  - JSON Storage │  │
│  │  - Outcomes      │  │  - Injury Data   │  │  - NBA/NFL      │  │
│  │  - Accuracy      │  │  - News          │  │  - Updates      │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                         EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Kalshi API      │  │  ESPN API        │  │  RSS Feeds      │  │
│  │  - Markets       │  │  - NBA Games     │  │  - Team News    │  │
│  │  - Prices        │  │  - NFL Games     │  │  - Sentiment    │  │
│  │  - WebSocket     │  │  - Team Stats    │  │  - Analysis     │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Presentation Layer

#### Desktop Application (Electron)
- **Technology**: Electron 39.2.3
- **Purpose**: Native desktop experience
- **Features**:
  - System tray integration
  - Native notifications
  - Auto-updates
  - Offline support

#### Web Application
- **Technology**: React 19.2.0 + Vite 7.2.4
- **Purpose**: Browser-based access
- **Features**:
  - Responsive design
  - Hot module replacement
  - Progressive Web App (PWA) ready

### Application Layer

#### FastAPI Backend
- **Technology**: FastAPI + Uvicorn
- **Port**: 8000
- **Features**:
  - Async request handling
  - Automatic API documentation
  - WebSocket support
  - Middleware pipeline

#### API Endpoints
```python
# Main endpoints
GET  /api/games              # List games with predictions
GET  /api/games/{game_id}    # Game details
GET  /api/market-context     # Contextual data
GET  /api/accuracy           # Performance metrics

# License endpoints
POST /api/license/activate   # Activate license
GET  /api/license/status     # Check license status

# Health check
GET  /health                 # Service health
```

#### WebSocket Service
- **Endpoint**: `ws://localhost:8000/ws/markets`
- **Purpose**: Real-time market updates
- **Features**:
  - Authenticated connections
  - Market subscriptions
  - Automatic reconnection
  - Message broadcasting

#### Middleware
1. **CORS Middleware**: Cross-origin request handling
2. **GZip Middleware**: Response compression
3. **License Middleware**: License verification
4. **Logging Middleware**: Request/response logging

### Business Logic Layer

#### Prediction Engine
**File**: `backend/app/services/enhanced_prediction.py`

**Responsibilities**:
- Generate win probability predictions
- Calculate edge and expected value
- Provide betting recommendations
- Generate reasoning for predictions

**Models Used**:
1. **Elo Rating System**
   - Dynamic ratings with decay
   - Home advantage adjustment
   - K-factor updates

2. **Recent Form Analysis**
   - Last 5 games performance
   - Momentum calculation
   - Strength classification

3. **Statistical Model**
   - Win percentage analysis
   - Point differential
   - Advanced metrics

4. **Machine Learning**
   - Gradient Boosting Classifier
   - 19 engineered features
   - Calibrated probabilities

**Weighting Strategy**:
```python
# High confidence markets
KALSHI_WEIGHT = 0.50
STAT_WEIGHT = 0.20
ELO_WEIGHT = 0.15
FORM_WEIGHT = 0.10
INJURY_WEIGHT = 0.05

# Low confidence markets
KALSHI_WEIGHT = 0.15
STAT_WEIGHT = 0.35
ELO_WEIGHT = 0.25
FORM_WEIGHT = 0.20
INJURY_WEIGHT = 0.05
```

#### Signal Engine
**File**: `backend/app/services/enhanced_signals.py`

**Signal Types**:
1. **Edge Signals**: Model vs market divergence
2. **Momentum Signals**: Price trend detection
3. **Volume Signals**: Unusual trading activity
4. **Arbitrage Signals**: Pricing inefficiencies
5. **Microstructure Signals**: Bid-ask spread analysis

**Signal Strength**:
- HIGH: >10% edge or strong indicator
- MEDIUM: 5-10% edge or moderate indicator
- WEAK: <5% edge or weak indicator

#### Data Feeds Service
**File**: `backend/app/services/enhanced_data_feeds.py`

**Data Sources**:
1. **Injury Data**
   - Position-based impact weighting
   - Severity classification
   - Team aggregation

2. **Weather Data** (NFL only)
   - Temperature, wind, precipitation
   - Severity scoring
   - Historical correlation

3. **News & Sentiment**
   - RSS feed aggregation
   - TextBlob sentiment analysis
   - Team-specific filtering

#### External API Clients

**Kalshi Client** (`kalshi.py`):
- RSA-PSS authentication
- Market data fetching
- WebSocket connection
- Error handling and retries

**NBA Client** (`nba.py`):
- ESPN API integration
- Game schedules
- Team statistics
- Live scores

**NFL Client** (`nfl.py`):
- ESPN API integration
- Game schedules
- Team statistics
- Weather integration

### Data Layer

#### SQLite Database
**Location**: `backend/data/historical_data.db`

**Tables**:
```sql
-- Predictions table
CREATE TABLE predictions (
    id INTEGER PRIMARY KEY,
    game_id TEXT,
    league TEXT,
    home_team TEXT,
    away_team TEXT,
    home_win_prob REAL,
    prediction_time TIMESTAMP,
    model_version TEXT
);

-- Outcomes table
CREATE TABLE outcomes (
    id INTEGER PRIMARY KEY,
    game_id TEXT,
    home_won BOOLEAN,
    home_score INTEGER,
    away_score INTEGER,
    outcome_time TIMESTAMP
);

-- Accuracy metrics table
CREATE TABLE accuracy_metrics (
    id INTEGER PRIMARY KEY,
    date DATE,
    league TEXT,
    accuracy REAL,
    brier_score REAL,
    log_loss REAL
);
```

#### File Cache
**Location**: `backend/app/services/` (in-memory)

**Cached Data**:
- Market data (5 minutes TTL)
- Injury data (1 hour TTL)
- News data (1 hour TTL)
- Predictions (2 minutes TTL)

#### Elo Ratings Storage
**Location**: `backend/data/elo_ratings_*.json`

**Format**:
```json
{
  "Los Angeles Lakers": 1650,
  "Golden State Warriors": 1580,
  "last_updated": "2025-11-27T00:00:00Z"
}
```

---

## Data Flow Diagrams

### Prediction Generation Flow

```
User Request
    │
    ├─> Frontend: GET /api/games
    │
    ├─> Backend: API Endpoint
    │       │
    │       ├─> NFL/NBA Client: Fetch games
    │       │       │
    │       │       └─> ESPN API
    │       │
    │       ├─> Kalshi Client: Fetch markets
    │       │       │
    │       │       └─> Kalshi API
    │       │
    │       ├─> Data Feeds: Get context
    │       │       │
    │       │       ├─> Injury data
    │       │       ├─> Weather data
    │       │       └─> News data
    │       │
    │       ├─> Prediction Engine: Generate prediction
    │       │       │
    │       │       ├─> Elo Manager: Get ratings
    │       │       ├─> Form Analysis: Calculate momentum
    │       │       ├─> Statistical Model: Calculate probabilities
    │       │       └─> ML Model: Predict outcome
    │       │
    │       ├─> Signal Engine: Generate signals
    │       │       │
    │       │       ├─> Edge detection
    │       │       ├─> Momentum analysis
    │       │       └─> Arbitrage detection
    │       │
    │       └─> Accuracy Tracker: Record prediction
    │
    └─> Frontend: Render game cards
```

### Real-Time Update Flow

```
Kalshi Market Update
    │
    ├─> Kalshi WebSocket
    │
    ├─> Backend: WebSocket Service
    │       │
    │       ├─> Parse message
    │       ├─> Update cache
    │       └─> Broadcast to clients
    │
    ├─> Frontend: WebSocket connection
    │       │
    │       ├─> Receive update
    │       ├─> Update Zustand store
    │       └─> Re-render components
    │
    └─> User sees updated data
```

---

## Security Architecture

### Authentication & Authorization

#### License-Based Access Control
```python
# Middleware checks license on every request
@app.middleware("http")
async def check_license(request: Request, call_next):
    # Allow public endpoints
    if request.url.path in ["/", "/health", "/api/license/*"]:
        return await call_next(request)
    
    # Verify license
    if not license_manager.is_active:
        return JSONResponse(status_code=403, ...)
    
    return await call_next(request)
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

1. **Environment Variables**: Sensitive credentials in `.env`
2. **Private Key Storage**: RSA keys stored securely
3. **HTTPS**: Production uses TLS/SSL
4. **Input Validation**: FastAPI Pydantic models
5. **SQL Injection Prevention**: Parameterized queries

---

## Performance Considerations

### Caching Strategy

```python
# Backend caching
class SimpleCache:
    def __init__(self, ttl: int):
        self.cache = {}
        self.ttl = ttl  # Time to live in seconds
    
    def get(self, key: str):
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return value
        return None
    
    def set(self, key: str, value: any):
        self.cache[key] = (value, time.time())
```

### Async Processing

```python
# Concurrent API calls
async def fetch_all_data():
    results = await asyncio.gather(
        fetch_games(),
        fetch_markets(),
        fetch_injuries(),
        fetch_weather(),
        return_exceptions=True
    )
    return results
```

### Database Optimization

- Indexed columns: `game_id`, `league`, `prediction_time`
- Connection pooling for concurrent requests
- Batch inserts for bulk operations

---

## Scalability

### Current Limitations
- Single server instance
- SQLite (not suitable for high concurrency)
- In-memory caching (lost on restart)

### Future Improvements
1. **Horizontal Scaling**: Multiple backend instances with load balancer
2. **Database**: Migrate to PostgreSQL for better concurrency
3. **Caching**: Redis for distributed caching
4. **Message Queue**: RabbitMQ/Kafka for async processing
5. **CDN**: Static asset delivery
6. **Microservices**: Split services for independent scaling

---

## Monitoring & Logging

### Logging Architecture

```python
# Centralized logging
logger = setup_logging()

# Log levels
logger.debug("Detailed information")
logger.info("General information")
logger.warning("Warning messages")
logger.error("Error messages")
logger.critical("Critical issues")
```

### Log Storage
- **Location**: `backend/logs/app.log`
- **Rotation**: Daily rotation, 7-day retention
- **Format**: JSON structured logs

### Metrics to Monitor
- API response times
- Prediction accuracy
- Cache hit rates
- Error rates
- WebSocket connections
- Database query performance

---

## Deployment Architecture

### Development
```
Local Machine
├── Backend (localhost:8000)
├── Frontend Dev Server (localhost:5173)
└── Electron App
```

### Production (Future)
```
Cloud Infrastructure
├── Load Balancer
├── Backend Instances (N)
│   ├── FastAPI App
│   └── WebSocket Service
├── Database Cluster
│   ├── Primary (Read/Write)
│   └── Replicas (Read)
├── Redis Cache Cluster
└── CDN (Static Assets)
```

---

## Technology Decisions

### Why FastAPI?
- Async support for high performance
- Automatic API documentation
- Type safety with Pydantic
- WebSocket support
- Modern Python features

### Why React?
- Component-based architecture
- Large ecosystem
- TypeScript support
- Excellent performance
- Electron compatibility

### Why SQLite?
- Zero configuration
- Embedded database
- Perfect for local storage
- Easy backup (single file)
- Sufficient for current scale

### Why Zustand?
- Lightweight state management
- Simple API
- No boilerplate
- TypeScript support
- React hooks integration

---

**Last Updated**: November 26, 2025  
**Version**: 3.0.0
