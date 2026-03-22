# Finding Sweetie - Ubuntu Setup Guide

Complete guide to install and run Finding Sweetie on Ubuntu Server/Desktop.

## Quick Setup (Recommended)

Run the automated setup script:

```bash
cd /home/user/claude_sweets
./setup_ubuntu.sh
```

The script will:
1. Check/install Node.js and npm
2. Install build essentials
3. Install project dependencies
4. Create `.env` configuration
5. Configure firewall (optional)
6. Start the application (choose your method)

## Manual Setup

If you prefer to set up manually:

### 1. Install Requirements

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y build-essential git

# Verify installation
node --version  # Should be v18+ or v20+
npm --version
```

### 2. Install Project Dependencies

```bash
cd /home/user/claude_sweets
npm install
```

### 3. Configure Environment

```bash
# Create environment file
cp .env.example .env

# Edit if needed
nano .env
```

### 4. Configure Firewall

```bash
# Allow port 3000
sudo ufw allow 3000/tcp
sudo ufw status
```

## Running the Application

### Option 1: Manual Start (Testing/Development)

**Using the start script:**
```bash
./start_server.sh
```

**Or directly:**
```bash
npm start
```

**For development with auto-reload:**
```bash
npm run dev
```

### Option 2: PM2 Process Manager (Recommended)

PM2 keeps your app running, auto-restarts on crashes, and provides monitoring.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
pm2 start server.js --name "finding-sweetie"

# Enable auto-start on boot
pm2 startup
pm2 save

# Useful commands
pm2 status                    # Check status
pm2 logs finding-sweetie      # View logs
pm2 restart finding-sweetie   # Restart
pm2 stop finding-sweetie      # Stop
pm2 delete finding-sweetie    # Remove from PM2
```

### Option 3: Systemd Service (Production)

For production environments, run as a system service:

```bash
# Create service file
sudo nano /etc/systemd/system/finding-sweetie.service
```

Add this content:
```ini
[Unit]
Description=Finding Sweetie Pet Finder App
After=network.target

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/claude_sweets
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable finding-sweetie
sudo systemctl start finding-sweetie

# Useful commands
sudo systemctl status finding-sweetie
sudo systemctl restart finding-sweetie
sudo systemctl stop finding-sweetie
sudo journalctl -u finding-sweetie -f  # View logs
```

## Network Configuration

### Access from Local Machine

Once running, access at:
- http://localhost:3000
- http://127.0.0.1:3000

### Access from Network (Other Devices)

Find your IP address:
```bash
hostname -I
# or
ip addr show | grep "inet "
```

Access from other devices at:
- http://YOUR_IP:3000
- Example: http://192.168.68.72:3000

### Set Static IP (192.168.68.72)

If you need a fixed IP address:

```bash
# Find network interface
ip link show

# Edit netplan configuration
sudo nano /etc/netplan/50-cloud-init.yaml
```

Add/modify:
```yaml
network:
  version: 2
  ethernets:
    eth0:  # Replace with your interface name
      dhcp4: no
      addresses:
        - 192.168.68.72/24
      gateway4: 192.168.68.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

Apply changes:
```bash
sudo netplan apply
```

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or change port in .env file
nano .env
# Change: PORT=3001
```

### Can't Access from Network

1. Check firewall:
```bash
sudo ufw status
sudo ufw allow 3000/tcp
```

2. Verify server is listening on all interfaces:
```bash
netstat -tln | grep 3000
# Should show 0.0.0.0:3000, not 127.0.0.1:3000
```

3. Check `.env` configuration:
```bash
# Should have:
HOST=0.0.0.0
PORT=3000
```

### Database Errors

The app uses SQLite. If you have database issues:

```bash
# Check database
./verify_database.js

# Fix permissions
./fix_database_permissions.sh

# Database is at: ./database/findingsweetie.db
```

### Build Errors During npm install

If you see errors about node-gyp or bcrypt:

```bash
# Install build tools
sudo apt install -y build-essential python3

# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Updating the Application

```bash
# Pull latest changes
git pull

# Install any new dependencies
npm install

# Restart the application
# For PM2:
pm2 restart finding-sweetie

# For systemd:
sudo systemctl restart finding-sweetie

# For manual:
# Stop with Ctrl+C and restart with ./start_server.sh
```

## Maintenance

### View Logs

**PM2:**
```bash
pm2 logs finding-sweetie
pm2 logs finding-sweetie --lines 100
```

**Systemd:**
```bash
sudo journalctl -u finding-sweetie -f
sudo journalctl -u finding-sweetie --since "1 hour ago"
```

**Manual (if running in terminal):**
Logs appear in the terminal where you started the app.

### Backup Database

```bash
# Backup SQLite database
cp database/findingsweetie.db database/findingsweetie.db.backup

# Or create timestamped backup
cp database/findingsweetie.db database/findingsweetie_$(date +%Y%m%d_%H%M%S).db
```

### Monitor System Resources

```bash
# With PM2
pm2 monit

# System resources
htop
```

## Security Notes

1. **Change SESSION_SECRET** in `.env` for production
2. **Use HTTPS** in production (set up nginx reverse proxy)
3. **Keep system updated**: `sudo apt update && sudo apt upgrade`
4. **Firewall**: Only open necessary ports
5. **Database backups**: Regularly backup `database/findingsweetie.db`

## Support

For issues or questions, check:
- Project documentation in repo
- Logs for error messages
- Network connectivity and firewall settings
