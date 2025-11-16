#!/bin/bash

echo "🔍 Finding Sweetie - Registration Diagnostic Tool"
echo "================================================="
echo ""

cd /home/user/claude_sweets

# Step 1: Check permissions
echo "1️⃣  Checking database permissions..."
ls -la database/findingsweetie.db
PERMS=$(stat -c "%a" database/findingsweetie.db)
if [ "$PERMS" -ge "664" ]; then
    echo "✓ File permissions OK ($PERMS)"
else
    echo "✗ File permissions insufficient ($PERMS)"
    echo "  Fixing..."
    chmod 664 database/findingsweetie.db
fi

DIR_PERMS=$(stat -c "%a" database/)
if [ "$DIR_PERMS" -ge "775" ]; then
    echo "✓ Directory permissions OK ($DIR_PERMS)"
else
    echo "✗ Directory permissions insufficient ($DIR_PERMS)"
    echo "  Fixing..."
    chmod 775 database/
fi

echo ""

# Step 2: Test direct database write
echo "2️⃣  Testing direct database write..."
node -e "
const Database = require('better-sqlite3');
const db = new Database('database/findingsweetie.db');
try {
  db.prepare('SELECT COUNT(*) FROM users').get();
  console.log('✓ Database connection OK');
  db.close();
} catch (error) {
  console.log('✗ Database error:', error.message);
  process.exit(1);
}
"

echo ""

# Step 3: Start server in background
echo "3️⃣  Starting server..."
PORT=3000
node server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

# Wait for server to start
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo "✓ Server started successfully"
else
    echo "✗ Server failed to start"
    echo "   Check /tmp/server.log for errors"
    cat /tmp/server.log
    exit 1
fi

echo ""

# Step 4: Test registration
echo "4️⃣  Testing user registration..."
RANDOM_EMAIL="test$(date +%s)@example.com"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:$PORT/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$RANDOM_EMAIL\",
    \"password\": \"TestPass123\",
    \"zip_code\": \"12345\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "   HTTP Status: $HTTP_CODE"
echo "   Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "201" ]; then
    echo ""
    echo "✅ SUCCESS! Registration works correctly."
elif echo "$BODY" | grep -q "SQLITE_READONLY"; then
    echo ""
    echo "❌ SQLITE_READONLY ERROR DETECTED!"
    echo ""
    echo "Checking server logs:"
    tail -20 /tmp/server.log
else
    echo ""
    echo "⚠️  Registration failed (but not SQLITE_READONLY)"
    echo ""
    echo "Checking server logs:"
    tail -20 /tmp/server.log
fi

echo ""
echo "5️⃣  Cleanup..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "   Server stopped"

echo ""
echo "=== Diagnostic Complete ==="
echo "Full server log available at: /tmp/server.log"
