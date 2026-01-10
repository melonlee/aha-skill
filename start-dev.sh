#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to kill all child processes on exit
cleanup() {
    echo -e "\n${RED}Stopping all services...${NC}"
    # Kill all child processes in the current process group
    trap '' SIGINT SIGTERM # Ignore signals during cleanup
    kill 0
    wait
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}Starting Aha-Skill Platform in development mode...${NC}"

# Check if node_modules exists, if not, install dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing NPM dependencies...${NC}"
    npm install
fi

# 1. Start Python Service
echo -e "${BLUE}Starting Python Service (Port 8002)...${NC}"
(
    cd apps/python-service
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    else
        source venv/bin/activate
    fi
    # Use exec to ensure the process receives signals
    exec uvicorn app.main:app --port 8002 --reload --log-level warning
) &

# Wait a bit for python service to init (optional)
sleep 2

# 2. Start Node Service
echo -e "${BLUE}Starting Node Service (Port 8001)...${NC}"
npm run dev -w apps/node-service &

# 3. Start Gateway
echo -e "${BLUE}Starting Gateway (Port 8000)...${NC}"
npm run dev -w apps/gateway &

# 4. Start Web
echo -e "${BLUE}Starting Web Frontend (Port 3000)...${NC}"
npm run dev -w apps/web &

echo -e "${GREEN}All services started!${NC}"
echo -e "   - Web:            http://localhost:3000"
echo -e "   - Gateway:        http://localhost:8000"
echo -e "   - Node Service:   http://localhost:8001"
echo -e "   - Python Service: http://localhost:8002"
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"

# Wait for any process to exit
wait
