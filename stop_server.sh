#!/bin/bash
# Stop the Finding Sweetie server

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🐾 Stopping Finding Sweetie server..."

# Check if PM2 is managing the process
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "finding-sweetie"; then
        echo -e "${YELLOW}Stopping PM2 process...${NC}"
        pm2 stop finding-sweetie
        echo -e "${GREEN}✓ PM2 process stopped${NC}"
        echo ""
        echo "To completely remove from PM2:"
        echo "  pm2 delete finding-sweetie"
        exit 0
    fi
fi

# Check if systemd service is running
if systemctl is-active --quiet finding-sweetie 2>/dev/null; then
    echo -e "${YELLOW}Stopping systemd service...${NC}"
    sudo systemctl stop finding-sweetie
    echo -e "${GREEN}✓ Systemd service stopped${NC}"
    exit 0
fi

# Check if running on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Finding process on port 3000...${NC}"
    PID=$(lsof -ti :3000)
    echo "Process ID: $PID"
    read -p "Kill this process? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        kill $PID
        echo -e "${GREEN}✓ Process stopped${NC}"
    else
        echo "Cancelled."
    fi
    exit 0
fi

echo -e "${YELLOW}No running server found on port 3000${NC}"
