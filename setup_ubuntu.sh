#!/bin/bash
# Setup script for Finding Sweetie on Ubuntu
# This script installs requirements and starts the Node.js application

set -e  # Exit on any error

echo "🐾 Finding Sweetie - Ubuntu Setup Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}Step 1: Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${GREEN}✓ Node.js $(node --version) is installed${NC}"
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install npm.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ npm $(npm --version) is installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Installing build essentials...${NC}"
if ! dpkg -l | grep -q build-essential; then
    sudo apt update
    sudo apt install -y build-essential
    echo -e "${GREEN}✓ Build essentials installed${NC}"
else
    echo -e "${GREEN}✓ Build essentials already installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Installing project dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ node_modules already exists${NC}"
    read -p "Reinstall dependencies? (y/N): " reinstall
    if [[ $reinstall =~ ^[Yy]$ ]]; then
        npm install
        echo -e "${GREEN}✓ Dependencies reinstalled${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}Step 4: Setting up environment configuration...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file from .env.example${NC}"
    echo -e "${YELLOW}  Note: Edit .env to customize settings${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""
echo -e "${YELLOW}Step 5: Making scripts executable...${NC}"
chmod +x *.sh 2>/dev/null || true
echo -e "${GREEN}✓ Scripts are executable${NC}"

echo ""
echo -e "${YELLOW}Step 6: Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "3000.*ALLOW"; then
        echo -e "${GREEN}✓ Port 3000 already allowed in firewall${NC}"
    else
        read -p "Allow port 3000 through firewall? (Y/n): " allow_firewall
        if [[ ! $allow_firewall =~ ^[Nn]$ ]]; then
            sudo ufw allow 3000/tcp
            echo -e "${GREEN}✓ Port 3000 allowed in firewall${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ UFW not found, skipping firewall configuration${NC}"
fi

echo ""
echo -e "${YELLOW}Step 7: Choose startup method...${NC}"
echo "1) Run manually (npm start)"
echo "2) Run with PM2 (recommended - auto-restart, logs, monitoring)"
echo "3) Create systemd service (production - runs as system service)"
echo "4) Skip (setup only)"
read -p "Select option (1-4): " startup_option

case $startup_option in
    1)
        echo ""
        echo -e "${GREEN}Starting application with npm start...${NC}"
        npm start
        ;;
    2)
        echo ""
        echo -e "${YELLOW}Installing PM2...${NC}"
        if ! command -v pm2 &> /dev/null; then
            sudo npm install -g pm2
            echo -e "${GREEN}✓ PM2 installed${NC}"
        else
            echo -e "${GREEN}✓ PM2 already installed${NC}"
        fi

        echo -e "${YELLOW}Starting application with PM2...${NC}"
        pm2 delete finding-sweetie 2>/dev/null || true
        pm2 start server.js --name "finding-sweetie"

        read -p "Enable PM2 to start on boot? (Y/n): " enable_boot
        if [[ ! $enable_boot =~ ^[Nn]$ ]]; then
            pm2 startup | grep "sudo" | bash || true
            pm2 save
            echo -e "${GREEN}✓ PM2 configured to start on boot${NC}"
        fi

        echo ""
        echo -e "${GREEN}✓ Application started with PM2${NC}"
        echo ""
        echo "Useful PM2 commands:"
        echo "  pm2 status              - Check status"
        echo "  pm2 logs finding-sweetie - View logs"
        echo "  pm2 restart finding-sweetie - Restart app"
        echo "  pm2 stop finding-sweetie - Stop app"
        ;;
    3)
        echo ""
        echo -e "${YELLOW}Creating systemd service...${NC}"

        SERVICE_FILE="/etc/systemd/system/finding-sweetie.service"

        sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=Finding Sweetie Pet Finder App
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
Environment=NODE_ENV=production
ExecStart=$(which node) server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

        sudo systemctl daemon-reload
        sudo systemctl enable finding-sweetie
        sudo systemctl start finding-sweetie

        echo -e "${GREEN}✓ Systemd service created and started${NC}"
        echo ""
        echo "Useful systemd commands:"
        echo "  sudo systemctl status finding-sweetie  - Check status"
        echo "  sudo systemctl restart finding-sweetie - Restart app"
        echo "  sudo systemctl stop finding-sweetie    - Stop app"
        echo "  sudo journalctl -u finding-sweetie -f  - View logs"
        ;;
    4)
        echo -e "${GREEN}Setup complete. Run 'npm start' to start the application.${NC}"
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Access your site at:"
IP_ADDR=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}  http://$IP_ADDR:3000${NC}"
echo -e "${GREEN}  http://localhost:3000${NC}"
echo ""
echo "For network access from other devices:"
echo -e "${GREEN}  http://192.168.68.72:3000${NC} (if IP is configured)"
echo ""
