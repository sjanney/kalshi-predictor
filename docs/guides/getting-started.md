# Getting Started with Kalshi Predictor

This guide will walk you through setting up and running Kalshi Predictor for the first time.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **Python** 3.10 or higher ([Download](https://www.python.org/downloads/))
- **Git** ([Download](https://git-scm.com/downloads))

### Optional
- **Kalshi API Account** (for live market data)
- **Code Editor** (VS Code, Cursor, etc.)

### Verify Installation

```bash
# Check Node.js version
node --version  # Should be v18+

# Check Python version
python3 --version  # Should be 3.10+

# Check npm version
npm --version  # Should be 8+

# Check Git version
git --version
```

---

## Installation

### Step 1: Clone or Navigate to Project

If you already have the project:
```bash
cd "/Users/shanejanney/Desktop/kalshi predictor"
```

If cloning from a repository:
```bash
git clone <repository-url>
cd kalshi-predictor
```

### Step 2: Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create a Python virtual environment**:
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment**:
   
   On macOS/Linux:
   ```bash
   source venv/bin/activate
   ```
   
   On Windows:
   ```bash
   venv\Scripts\activate
   ```
   
   You should see `(venv)` in your terminal prompt.

4. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   
   This will install:
   - FastAPI (web framework)
   - Uvicorn (ASGI server)
   - scikit-learn (ML models)
   - pandas (data processing)
   - And other dependencies

5. **Configure environment variables**:
   ```bash
   cp env_example .env
   ```
   
   Edit `.env` with your preferred text editor:
   ```bash
   nano .env  # or use your preferred editor
   ```
   
   Basic configuration:
   ```env
   API_PORT=8000
   CORS_ORIGINS=*
   LOG_LEVEL=INFO
   ENVIRONMENT=development
   ```
   
   If you have Kalshi API credentials:
   ```env
   KALSHI_API_BASE_URL=https://api.elections.kalshi.com
   KALSHI_API_KEY_ID=your_key_id_here
   KALSHI_PRIVATE_KEY_PATH=prediction_api_key.txt
   ```

### Step 3: Generate License (Required)

The application uses an offline licensing system for security.

1. **Generate RSA key pair** (one-time setup):
   ```bash
   python scripts/generate_keys.py
   ```
   
   This creates:
   - `private_key.pem` (keep this secret!)
   - `public_key.pem` (ships with the app)

2. **Generate a license for yourself**:
   ```bash
   python scripts/generate_license.py --name "Your Name" --email "your@email.com"
   ```
   
   Example output:
   ```
   License generated successfully!
   
   License Key:
   eyJ1c2VyX25hbWUiOiJZb3VyIE5hbWUiLCJlbWFpbCI6InlvdXJAZW1haWwuY29tIiwiaXNzdWVkX2F0IjoiMjAyNS0xMS0yN1QwMDowMDowMFoifQ==.MEUCIQDexample...
   
   Save this to 'license.key' in the backend directory.
   ```

3. **Save the license key**:
   ```bash
   echo "your_license_key_here" > license.key
   ```

### Step 4: Frontend Setup

1. **Open a new terminal** (keep the backend terminal open)

2. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

3. **Install Node.js dependencies**:
   ```bash
   npm install
   ```
   
   This will install:
   - React (UI framework)
   - Vite (build tool)
   - Electron (desktop app)
   - TailwindCSS (styling)
   - And other dependencies

4. **Configure environment** (optional):
   ```bash
   cp env_example .env
   ```
   
   Edit `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   VITE_APP_VERSION=3.0.0
   ```

---

## Running the Application

### Option 1: Quick Start Script (Recommended)

From the project root directory:

```bash
./start.sh
```

This script will:
1. Start the backend server on port 8000
2. Start the frontend dev server on port 5173
3. Launch the Electron desktop app

### Option 2: Manual Start

**Terminal 1 - Backend**:
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
🚀 Starting application...
✅ Database initialized
✅ Valid license found.
✅ WebSocket service started
INFO:     Application startup complete.
```

**Terminal 2 - Frontend (Web)**:
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v7.2.4  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Terminal 3 - Frontend (Electron)**:
```bash
cd frontend
npm run electron:dev
```

The Electron app window should open automatically.

---

## Verifying Installation

### 1. Check Backend Health

Open your browser and navigate to:
```
http://localhost:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "environment": "development"
}
```

### 2. Check API Documentation

Navigate to:
```
http://localhost:8000/docs
```

You should see the interactive FastAPI documentation (Swagger UI).

### 3. Check Frontend

Navigate to:
```
http://localhost:5173
```

You should see the Kalshi Predictor dashboard with game cards.

### 4. Test API Connection

In the frontend, you should see:
- Game cards loading
- Predictions displayed
- No connection errors in the browser console

---

## First Steps

### 1. Explore the Dashboard

The main dashboard shows:
- **Game Cards**: Each card displays a game with predictions
- **Insights Panel**: Top betting opportunities
- **Accuracy Panel**: Model performance metrics
- **Filters**: Filter by league (NBA/NFL)

### 2. View Game Details

Click on any game card to open the analytics modal:
- **Overview**: Prediction summary and key metrics
- **Analytics**: Elo ratings, form analysis, head-to-head
- **Context**: Injuries, weather, news
- **Market**: Market data and charts

### 3. Use the Strategy Lab

Click "Strategy Lab" in the toolbar to:
- Evaluate custom game scenarios
- Input your own probabilities
- Calculate Kelly fractions
- Test betting strategies

### 4. Portfolio Kelly Calculator

Click "Portfolio Kelly" to:
- Select multiple games
- See aggregate statistics
- Get portfolio recommendations
- Optimize bet sizing

---

## Configuration

### Backend Configuration

Edit `backend/.env`:

```env
# API Settings
API_PORT=8000
CORS_ORIGINS=*
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
ENVIRONMENT=development  # development, production

# Kalshi API (optional)
KALSHI_API_BASE_URL=https://api.elections.kalshi.com
KALSHI_API_KEY_ID=your_key_id
KALSHI_PRIVATE_KEY_PATH=prediction_api_key.txt

# Features
USE_MOCK_DATA=false  # Set to true to use mock data instead of real APIs
```

### Frontend Configuration

Edit `frontend/.env`:

```env
# API Connection
VITE_API_BASE_URL=http://localhost:8000

# App Metadata
VITE_APP_VERSION=3.0.0
```

---

## Troubleshooting

### Backend Issues

**Problem**: `uvicorn: command not found`

**Solution**:
```bash
# Make sure virtual environment is activated
source backend/venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

---

**Problem**: `License invalid or missing`

**Solution**:
```bash
# Generate a new license
cd backend
python scripts/generate_license.py --name "Your Name" --email "your@email.com"

# Save to license.key
echo "license_key_here" > license.key

# Restart backend
```

---

**Problem**: Port 8000 already in use

**Solution**:
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

### Frontend Issues

**Problem**: `Cannot connect to backend`

**Solution**:
1. Ensure backend is running on port 8000
2. Check `VITE_API_BASE_URL` in `frontend/.env`
3. Verify CORS settings in `backend/app/config.py`

---

**Problem**: Electron app shows white screen

**Solution**:
```bash
# Clear cache and rebuild
cd frontend
rm -rf .vite dist node_modules
npm install
npm run electron:dev
```

---

**Problem**: `Module not found` errors

**Solution**:
```bash
# Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

Now that you have Kalshi Predictor running:

1. **Read the [User Guide](user-guide.md)** to learn how to use all features
2. **Check the [API Documentation](../api/endpoints.md)** to understand the API
3. **Explore the [Developer Guide](developer-guide.md)** if you want to contribute
4. **Review the [Architecture Documentation](../architecture/system-overview.md)** to understand how it works

---

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](../troubleshooting/common-issues.md)
2. Review the [FAQ](../troubleshooting/faq.md)
3. Check the conversation history in `.cursor/`
4. Review application logs in `backend/logs/app.log`

---

**Welcome to Kalshi Predictor! 🚀**
