#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Kalshi Predictor - Installer v1.0     ${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check prerequisites
echo -e "\n${BLUE}[1/5] Checking prerequisites...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Prerequisites found.${NC}"

# Backend Setup
echo -e "\n${BLUE}[2/5] Setting up Backend...${NC}"
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "Installing Python dependencies..."
pip install -r backend/requirements.txt
echo -e "${GREEN}✓ Backend dependencies installed.${NC}"

# Frontend Setup
echo -e "\n${BLUE}[3/5] Setting up Frontend...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing Node modules..."
    npm install
else
    echo "Node modules already installed."
fi
echo -e "${GREEN}✓ Frontend dependencies installed.${NC}"

# Build Frontend
echo -e "\n${BLUE}[4/5] Building Frontend...${NC}"
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built.${NC}"

# Create Launcher
echo -e "\n${BLUE}[5/5] Creating Launcher...${NC}"
cat > run_app.sh << EOL
#!/bin/bash
source venv/bin/activate

# Start Backend in background
echo "Starting Backend..."
uvicorn backend.app.main:app --reload --port 8000 &
BACKEND_PID=\$!

# Serve Frontend (Simple serve for demo, or use a proper server)
# For this setup, we'll assume the user wants to run the dev server for full features
# or serve the build. Let's run the dev server for now as it's easier for this context.
echo "Starting Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=\$!

echo "App running! Press Ctrl+C to stop."
wait \$BACKEND_PID \$FRONTEND_PID
EOL

chmod +x run_app.sh
echo -e "${GREEN}✓ Launcher created: ./run_app.sh${NC}"

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}   Installation Complete!                ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "To start the application, run: ./run_app.sh"
