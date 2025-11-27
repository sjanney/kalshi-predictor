#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Kalshi Predictor - Auto Setup & Run   ${NC}"
echo -e "${BLUE}=========================================${NC}"

# 1. Check Python
echo -e "\n${GREEN}[1/4] Checking Python environment...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed.${NC}"
    echo "Please install Python 3 from https://python.org or use Homebrew: brew install python"
    exit 1
fi

# Setup Virtual Environment
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "Installing backend dependencies..."
pip install -r requirements.txt > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Backend dependencies installed."
else
    echo -e "${RED}Failed to install backend dependencies.${NC}"
    exit 1
fi

# 2. Check Node.js
echo -e "\n${GREEN}[2/4] Checking Node.js environment...${NC}"
cd ../frontend
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install > /dev/null 2>&1
fi

# 3. Start Backend
echo -e "\n${GREEN}[3/4] Starting Backend Server...${NC}"
cd ../backend
# Kill any existing process on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null
nohup uvicorn app.main:app --reload --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend running (PID: $BACKEND_PID)"

# Wait for backend health
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "Backend is healthy!"
        break
    fi
    sleep 1
done

# 4. Start Frontend
echo -e "\n${GREEN}[4/4] Starting Frontend...${NC}"
cd ../frontend
# Kill any existing process on port 5173
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo -e "${BLUE}Launching Application...${NC}"
npm run electron:dev

# Cleanup on exit
kill $BACKEND_PID
