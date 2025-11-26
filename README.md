# Kalshi Predictor v3.0

Production-ready prediction engine for Kalshi sports markets (NBA & NFL).

## Features

- **Enhanced Prediction Engine**: Multi-model ensemble with Elo ratings, recent form analysis, and statistical calibration
- **Real-time Market Data**: Live Kalshi market integration with synthetic fallbacks
- **Advanced Analytics**: Injury impact analysis, weather correlation, and market context
- **Smart Signals**: Edge detection, divergence alerts, and actionable insights
- **Production Ready**: Error handling, logging, security enhancements, and environment configuration

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment (if not exists):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables (optional):
```bash
cp env_example .env
# Edit .env with your Kalshi API credentials
```

5. Start the server:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment (optional):
```bash
cp env_example .env
# Edit .env if you need to change API URL
```

4. Start development server:
```bash
npm run dev
```

5. For Electron app:
```bash
npm run electron:dev
```

### Using the Start Script

From the project root:
```bash
./start.sh
```

This will:
- Start the backend on port 8000
- Start the frontend dev server on port 5173
- Launch Electron app

## Environment Variables

### Backend (`backend/.env`)

```env
KALSHI_API_BASE_URL=https://api.elections.kalshi.com
KALSHI_API_KEY_ID=your_key_id
KALSHI_PRIVATE_KEY_PATH=prediction_api_key.txt
API_PORT=8000
CORS_ORIGINS=*
LOG_LEVEL=INFO
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_VERSION=3.0.0
```

## Architecture

### Backend Services

**Primary Services** (used in production):
- `enhanced_prediction.py` - Main prediction engine with Elo, form, and statistical ensemble
- `enhanced_data_feeds.py` - Market context (weather, injuries, news)
- `enhanced_signals.py` - Advanced signal generation

**Legacy Services** (maintained for backward compatibility):
- `prediction.py` - Original prediction engine
- `data_feeds.py` - Basic data feeds
- `signals.py` - Basic signal engine

### API Endpoints

**Main Endpoints** (used by frontend):
- `GET /api/games` - Get games with predictions
- `GET /api/games/{game_id}` - Get detailed game analytics
- `GET /api/market-context` - Get weather, injuries, news

**Additional Endpoints** (available but not used by frontend):
- `GET /api/enhanced/games` - Enhanced predictions endpoint
- `GET /api/training/*` - Model training endpoints
- `POST /api/alerts/run` - Manual alert scan

## Version 3.0 Changes

### Production Readiness
- ✅ Centralized configuration management
- ✅ Structured logging (replaced print statements)
- ✅ Error boundaries and graceful error handling
- ✅ Environment-based configuration
- ✅ Enhanced security (CORS, Electron settings)

### UI Improvements
- ✅ Refined loading skeletons
- ✅ Improved spacing and typography
- ✅ Better chart tooltips and padding
- ✅ Enhanced visual hierarchy

### Code Quality
- ✅ Removed unused components
- ✅ Documented service architecture
- ✅ Improved error messages
- ✅ Better code organization

## Development

### Running Tests

```bash
cd backend
pytest tests/
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

**Electron:**
```bash
cd frontend
npm run electron:build
```

## Troubleshooting

### Backend won't start
- Check if port 8000 is available
- Verify virtual environment is activated
- Check that all dependencies are installed: `pip install -r requirements.txt`

### Frontend connection errors
- Ensure backend is running on port 8000
- Check `VITE_API_BASE_URL` in frontend `.env`
- Verify CORS settings in backend `config.py`

### Kalshi API errors
- Verify API credentials in `prediction_api_key.txt`
- Check `KALSHI_API_KEY_ID` and `KALSHI_PRIVATE_KEY_PATH` in `.env`
- System will fall back to synthetic markets if API fails

## License

Private project - All rights reserved.


