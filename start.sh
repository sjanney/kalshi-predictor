#!/bin/bash

# Function to cleanup background processes on exit
cleanup() {
    echo "Shutting down..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    # Also try to kill any lingering vite/electron processes
    pkill -f "vite"
    pkill -f "electron"
    exit
}

trap cleanup SIGINT SIGTERM

# Pre-flight check: Kill existing processes on ports
echo "Checking for conflicting processes..."
if lsof -ti:8000 >/dev/null; then
    echo "Killing process on port 8000..."
    lsof -ti:8000 | xargs kill -9
fi
if lsof -ti:5173 >/dev/null; then
    echo "Killing process on port 5173..."
    lsof -ti:5173 | xargs kill -9
fi

# Start Backend
echo "Starting Backend..."
cd backend
# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing backend dependencies..."
pip install -r requirements.txt

echo "Starting FastAPI server..."
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
max_retries=30
count=0
while ! curl -s http://localhost:8000/health > /dev/null; do
    sleep 1
    count=$((count+1))
    if [ $count -ge $max_retries ]; then
        echo "Backend failed to start within $max_retries seconds."
        cleanup
    fi
done
echo "Backend is ready!"

cd ..

# Start Frontend (Electron)
echo "Starting Frontend (Electron)..."
cd frontend
echo "Installing frontend dependencies..."
npm install
echo "Launching Electron app..."
# Using --force to ensure it restarts if hung
npm run electron:dev &
FRONTEND_PID=$!
cd ..

echo "Backend running on http://localhost:8000"
echo "Frontend running in Electron"

wait
