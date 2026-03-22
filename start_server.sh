#!/bin/bash
# Quick start script for Finding Sweetie
# Use this to quickly start the server after initial setup

set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🐾 Starting Finding Sweetie..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${RED}Error: Dependencies not installed. Run ./setup_ubuntu.sh first.${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env not found. Creating from .env.example...${NC}"
    cp .env.example .env
fi

# Check if already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 3000 is already in use${NC}"
    echo "Another instance may be running. Stop it first or use PM2 to manage processes."
    exit 1
fi

echo -e "${GREEN}Starting server...${NC}"
echo ""

# Get IP address
IP_ADDR=$(hostname -I | awk '{print $1}')

echo "Server will be accessible at:"
echo -e "${GREEN}  http://$IP_ADDR:3000${NC}"
echo -e "${GREEN}  http://localhost:3000${NC}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
