# Phase 1: Backend Setup & Testing Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Starting the Server](#starting-the-server)
5. [Testing & Verification](#testing--verification)
6. [API Endpoint Testing](#api-endpoint-testing)
7. [Troubleshooting](#troubleshooting)
8. [Database Management](#database-management)

---

## Prerequisites

### System Requirements
- **Operating System**: Ubuntu Linux (or any Linux distribution)
- **Node.js**: Version 16.x or higher
- **npm**: Version 8.x or higher
- **Network Access**: Ability to access 192.168.68.0/22 subnet (for network testing)

### Check Prerequisites

```bash
# Check Node.js version (should be 16+)
node --version

# Check npm version (should be 8+)
npm --version

# Check if ports are available
sudo lsof -i :3000

# If port 3000 is in use, kill the process or change PORT in .env
```

### Installing Node.js on Ubuntu

If Node.js is not installed or version is too old:

```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

---

## Installation

### Step 1: Clone/Navigate to Repository

```bash
cd /path/to/claude_sweets
```

### Step 2: Install Dependencies

```bash
# Install all npm dependencies
npm install

# Expected output:
# - Should install ~200 packages
# - Should complete without errors
# - May show some deprecation warnings (these are safe to ignore for now)
```

**Expected packages installed:**
- express (web server)
- express-session (session management)
- bcrypt (password hashing)
- better-sqlite3 (database)
- express-validator (input validation)
- multer (file uploads)
- dotenv (environment variables)
- nodemon (development tool)

### Step 3: Verify Installation

```bash
# Check if node_modules directory exists
ls -la node_modules/

# Verify key packages are installed
ls node_modules/ | grep -E "express|bcrypt|better-sqlite3"

# Should see directories for: express, bcrypt, better-sqlite3
```

---

## Configuration

### Step 1: Create Environment File

The `.env` file should already exist. If not, create it:

```bash
# Copy from example
cp .env.example .env

# Or create manually
cat > .env << 'EOF'
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
SESSION_SECRET=finding-sweetie-dev-secret-12345
EOF
```

### Step 2: Verify Directory Structure

```bash
# Check all required directories exist
ls -la

# You should see:
# - database/
# - middleware/
# - routes/
# - public/
# - uploads/
# - server.js
# - package.json
# - .env
```

### Step 3: Check File Permissions

```bash
# Ensure uploads directory is writable
chmod 755 uploads/

# Ensure database directory is writable
chmod 755 database/
```

---

## Starting the Server

### Development Mode (with auto-restart)

```bash
# Start with nodemon (restarts on file changes)
npm run dev
```

### Production Mode

```bash
# Start normally
npm start

# Or directly
node server.js
```

### Expected Startup Output

When the server starts successfully, you should see:

```
PRAGMA foreign_keys = ON
-- Finding Sweetie Database Schema
-- SQLite3 database for managing users and pets
[... SQL schema output ...]
Database initialized successfully
🐾 Finding Sweetie server running on http://0.0.0.0:3000
   Access locally: http://localhost:3000
   Access on network: http://192.168.68.x:3000
   Environment: development
```

### Verify Server is Running

```bash
# In a new terminal, check if server is listening
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-14T...:...Z","database":"connected"}
```

---

## Testing & Verification

### 1. Health Check Test

```bash
curl -s http://localhost:3000/api/health | jq

# Expected output:
{
  "status": "ok",
  "timestamp": "2025-11-14T11:19:56.488Z",
  "database": "connected"
}
```

### 2. Database Verification

**Important**: The database file (`findingsweetie.db`) is created automatically when you first start the server with `npm start` or `node server.js`. If the database file doesn't exist yet, start the server first, then run the verification.

#### Option 1: Using Node.js Verification Script (Recommended)

```bash
# Run the comprehensive database verification script
node verify_database.js

# This script will check:
# - Database file exists
# - All tables are present (users, pets)
# - All columns are correctly defined
# - Indexes are created
# - Foreign keys are configured
# - Record counts
```

#### Option 2: Manual Verification

```bash
# Check if database file was created
ls -lh database/

# You should see at minimum:
# - findingsweetie.db (the main database file - REQUIRED)
#
# You MAY also see (these are OPTIONAL and ephemeral):
# - findingsweetie.db-shm (shared memory file)
# - findingsweetie.db-wal (write-ahead log)
#
# Note: .shm and .wal files are temporary SQLite files that only exist
# during active database operations. It's completely normal if they're
# not present. They are created when:
# - The database is actively being used
# - There are uncommitted transactions
# - WAL mode is enabled and there are pending writes
```

#### Option 3: Using sqlite3 CLI (Optional)

If you have sqlite3 installed, you can verify the schema:

```bash
# Check database schema
sqlite3 database/findingsweetie.db ".schema"

# Should show users and pets table definitions
```

If sqlite3 is not installed and you want to install it:

```bash
sudo apt install sqlite3
```

**Note**: Installing sqlite3 CLI is optional. The Node.js verification script (`verify_database.js`) provides comprehensive verification without requiring additional system packages.

### 3. Network Access Test

From another machine on the network:

```bash
# Replace X with your actual IP
curl http://192.168.68.X:3000/api/health

# Or from the server, get your IP first
hostname -I

# Then test from another machine using that IP
```

### 4. Test Static File Serving

```bash
# This will return 404 or index.html when created
curl -I http://localhost:3000/

# Expected: 200 OK (once index.html exists) or 404 (for now)
```

---

## API Endpoint Testing

### Test Suite Using curl

Create a test script `test_api.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:3000/api"
echo "🧪 Testing Finding Sweetie API"
echo "================================"

# 1. Health Check
echo -e "\n1️⃣  Testing Health Check..."
curl -s "$API_URL/health" | jq
sleep 1

# 2. Register New User
echo -e "\n2️⃣  Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "mobile_number": "5551234567",
    "zip_code": "12345",
    "flag_sms_notification": true,
    "flag_email_notification": true
  }' -c cookies.txt)
echo "$REGISTER_RESPONSE" | jq
sleep 1

# 3. Check Session
echo -e "\n3️⃣  Testing Session Check..."
curl -s "$API_URL/auth/session" -b cookies.txt | jq
sleep 1

# 4. Get User Profile
echo -e "\n4️⃣  Testing Get Profile..."
curl -s "$API_URL/user/profile" -b cookies.txt | jq
sleep 1

# 5. Register a Lost Pet
echo -e "\n5️⃣  Testing Pet Registration..."
curl -s -X POST "$API_URL/pets/register" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "Lost",
    "pet_type": "Dog",
    "pet_name": "Buddy",
    "pet_breed": "Golden Retriever",
    "pet_description": "Friendly golden retriever, 3 years old",
    "flag_chip": true,
    "last_seen_location": "Central Park"
  }' | jq
sleep 1

# 6. Search Lost Pets
echo -e "\n6️⃣  Testing Search Lost Pets..."
curl -s "$API_URL/pets/lost" -b cookies.txt | jq
sleep 1

# 7. Get User's Pets
echo -e "\n7️⃣  Testing Get User Pets..."
curl -s "$API_URL/user/pets" -b cookies.txt | jq
sleep 1

# 8. Logout
echo -e "\n8️⃣  Testing Logout..."
curl -s -X POST "$API_URL/auth/logout" -b cookies.txt | jq
sleep 1

# 9. Verify Session Cleared
echo -e "\n9️⃣  Testing Session After Logout..."
curl -s "$API_URL/auth/session" -b cookies.txt | jq

# Cleanup
rm -f cookies.txt

echo -e "\n✅ API Testing Complete!"
```

Make it executable and run:

```bash
chmod +x test_api.sh
./test_api.sh
```

### Manual API Testing with curl

#### Test User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123",
    "mobile_number": "5551234567",
    "zip_code": "90210"
  }' \
  -c cookies.txt \
  -v
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": 1,
    "email": "testuser@example.com",
    "zip_code": "90210"
  }
}
```

#### Test User Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123"
  }' \
  -c cookies.txt \
  -v
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "user": {
    "id": 1,
    "email": "testuser@example.com",
    "zip_code": "90210"
  }
}
```

#### Test Pet Registration

```bash
curl -X POST http://localhost:3000/api/pets/register \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "Lost",
    "pet_type": "Dog",
    "pet_name": "Max",
    "pet_breed": "Labrador",
    "pet_description": "Black lab with white chest",
    "flag_chip": true,
    "last_seen_location": "Main Street Park"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Pet registered successfully",
  "pet": {
    "id": 1,
    "status": "Lost",
    "pet_type": "Dog",
    "pet_name": "Max",
    "image_url": null
  }
}
```

#### Test Search Lost Pets

```bash
# Search all lost pets
curl http://localhost:3000/api/pets/lost

# Search by zip code
curl "http://localhost:3000/api/pets/lost?zip=90210"

# Search by pet type
curl "http://localhost:3000/api/pets/lost?type=Dog"

# Search with pagination
curl "http://localhost:3000/api/pets/lost?page=1&limit=10"
```

#### Test Pet Details

```bash
# Get pet by ID (replace 1 with actual pet ID)
curl http://localhost:3000/api/pets/1
```

---

## Troubleshooting

### Issue 1: Server Won't Start

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process (replace PID)
kill -9 PID

# Or change the port in .env
echo "PORT=3001" >> .env
```

---

### Issue 2: Database Error

**Symptom:**
```
Error: Cannot open database
```

**Solution:**
```bash
# Check database directory permissions
ls -la database/

# Fix permissions
chmod 755 database/
chmod 644 database/*.db 2>/dev/null || true

# Remove corrupted database and restart
rm -f database/findingsweetie.db*
node server.js
```

---

### Issue 3: Module Not Found

**Symptom:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# If still failing, check Node.js version
node --version  # Should be 16+
```

---

### Issue 4: bcrypt Installation Fails

**Symptom:**
```
gyp ERR! build error
Error: `make` failed with exit code: 2
```

**Solution:**
```bash
# Install build tools
sudo apt-get update
sudo apt-get install -y build-essential python3

# Reinstall bcrypt
npm install bcrypt --build-from-source

# If still failing, try node-gyp
npm install -g node-gyp
npm rebuild bcrypt
```

---

### Issue 5: Session Not Persisting

**Symptom:**
- Login succeeds but subsequent requests are unauthorized

**Solution:**
```bash
# Ensure cookies are being saved and sent
# When using curl, use -c to save cookies and -b to send them
curl ... -c cookies.txt  # Save cookies
curl ... -b cookies.txt  # Send cookies

# Check session secret is set
cat .env | grep SESSION_SECRET

# If missing, add it
echo "SESSION_SECRET=your-secret-key" >> .env
```

---

### Issue 6: File Upload Fails

**Symptom:**
```
Error: ENOENT: no such file or directory, open 'uploads/...'
```

**Solution:**
```bash
# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Test with file upload
curl -X POST http://localhost:3000/api/pets/register \
  -b cookies.txt \
  -F "status=Lost" \
  -F "pet_type=Dog" \
  -F "pet_name=Test" \
  -F "pet_image=@/path/to/image.jpg"
```

---

### Issue 7: Network Access Denied

**Symptom:**
- Server works on localhost but not on network IP

**Solution:**
```bash
# Check HOST in .env (should be 0.0.0.0)
cat .env | grep HOST

# If it's localhost or 127.0.0.1, change it
sed -i 's/HOST=.*/HOST=0.0.0.0/' .env

# Check firewall
sudo ufw status
sudo ufw allow 3000/tcp

# Restart server
```

---

### Issue 8: Validation Errors

**Symptom:**
```json
{
  "error": "Validation Error",
  "details": [...]
}
```

**Solution:**
- Check request body matches validation rules:
  - Email: Must be valid email format
  - Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
  - Mobile: Exactly 10 digits
  - Zip Code: Exactly 5 digits
  - Status: Must be "Lost" or "Found"
  - Pet Type: Must be Dog, Cat, Bird, Rabbit, or Other

---

## Database Management

### View Database Contents

```bash
# Open database
sqlite3 database/findingsweetie.db

# In SQLite shell:
.tables                  # List tables
.schema users            # View users table schema
.schema pets             # View pets table schema

SELECT * FROM users;     # View all users
SELECT * FROM pets;      # View all pets

# Pretty print
.mode column
.headers on
SELECT * FROM users;

# Exit
.quit
```

### Reset Database

```bash
# Stop server first (Ctrl+C)

# Remove database files
rm -f database/findingsweetie.db*

# Restart server (database will be recreated)
node server.js
```

### Backup Database

```bash
# Create backup
cp database/findingsweetie.db database/backup_$(date +%Y%m%d).db

# Or use SQLite dump
sqlite3 database/findingsweetie.db .dump > backup.sql
```

### Restore Database

```bash
# From backup file
cp database/backup_20251114.db database/findingsweetie.db

# From SQL dump
sqlite3 database/findingsweetie.db < backup.sql
```

---

## Performance Testing

### Load Testing with Apache Bench

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test health endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:3000/api/health

# Expected results:
# - Requests per second: > 1000
# - Time per request: < 10ms
```

### Memory Usage

```bash
# Monitor server memory usage
ps aux | grep "node server.js"

# Or use top
top -p $(pgrep -f "node server.js")

# Expected memory usage: 50-100MB for basic operations
```

---

## Security Verification

### Check Password Hashing

```bash
# View hashed password in database
sqlite3 database/findingsweetie.db "SELECT email, hashed_password FROM users LIMIT 1;"

# Password should look like: $2b$10$...
# If it's plaintext, bcrypt is not working!
```

### Check Session Security

```bash
# Login and check cookie flags
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}' \
  2>&1 | grep -i "set-cookie"

# Cookie should have:
# - HttpOnly flag
# - Path=/
# - Max-Age or Expires
```

### Test SQL Injection Protection

```bash
# Try SQL injection in login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com'\'' OR 1=1--",
    "password": "anything"
  }'

# Expected: Validation error or unauthorized (NOT a SQL error!)
```

---

## Logs and Debugging

### Enable Verbose Logging

```bash
# In database/db.js, verbose option logs all SQL
# Already enabled in development mode

# View real-time logs
tail -f logs/app.log  # If using a logger
# Or just watch console output
```

### Debug Mode

```bash
# Start with Node.js inspector
node --inspect server.js

# Then open Chrome and navigate to:
chrome://inspect

# Click "inspect" under Remote Target
```

---

## Success Checklist

Before moving to Phase 2, verify:

- [ ] Server starts without errors
- [ ] Health check returns `{"status":"ok"}`
- [ ] Database file created in `database/`
- [ ] Can register a new user
- [ ] Can login with correct credentials
- [ ] Login fails with wrong password
- [ ] Can register a lost pet
- [ ] Can register a found pet
- [ ] Can search lost pets
- [ ] Can search found pets
- [ ] Can get pet details by ID
- [ ] Can update own pet
- [ ] Cannot update another user's pet
- [ ] Can logout successfully
- [ ] Session expires after 5 minutes
- [ ] Server accessible on network (192.168.68.x)
- [ ] Passwords are hashed in database
- [ ] File uploads work
- [ ] All validation rules work

---

## Quick Reference Commands

```bash
# Start server
npm start

# Start in dev mode
npm run dev

# Stop server
Ctrl+C

# Reset database
rm database/*.db && node server.js

# Test API
curl http://localhost:3000/api/health

# View logs
tail -f console output

# Check database
sqlite3 database/findingsweetie.db "SELECT COUNT(*) FROM users;"
```

---

## Getting Help

If you encounter issues not covered here:

1. Check server console output for error messages
2. Verify all prerequisites are met
3. Ensure all files are present (check git status)
4. Try resetting the database
5. Check Node.js and npm versions
6. Review firewall and network settings
7. Consult the error messages in the troubleshooting section

---

## Next Steps

Once Phase 1 is verified and working:
- Proceed to **Phase 2: Frontend Development**
- Build HTML pages with Tailwind CSS
- Integrate frontend with backend APIs
- Implement PWA features (manifest, service worker)

**Phase 1 is now complete and tested!** 🎉
