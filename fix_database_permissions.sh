#!/bin/bash

# Finding Sweetie - Fix Database Permissions Script
# Fixes the "SQLITE_READONLY" error by setting proper permissions

echo "🔧 Fixing Database Permissions for Finding Sweetie"
echo "=================================================="

# Find the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Working directory: $SCRIPT_DIR"

# Check if database directory exists
if [ ! -d "$SCRIPT_DIR/database" ]; then
    echo "❌ Error: database/ directory not found in $SCRIPT_DIR"
    exit 1
fi

# Fix directory permissions (need write access for SQLite WAL files)
echo "Setting database directory permissions..."
chmod 775 "$SCRIPT_DIR/database"

# Fix database file permissions
if [ -f "$SCRIPT_DIR/database/findingsweetie.db" ]; then
    echo "Setting database file permissions..."
    chmod 664 "$SCRIPT_DIR/database/findingsweetie.db"
fi

# Fix any existing WAL/SHM files
if [ -f "$SCRIPT_DIR/database/findingsweetie.db-wal" ]; then
    chmod 664 "$SCRIPT_DIR/database/findingsweetie.db-wal"
fi

if [ -f "$SCRIPT_DIR/database/findingsweetie.db-shm" ]; then
    chmod 664 "$SCRIPT_DIR/database/findingsweetie.db-shm"
fi

echo ""
echo "✅ Permissions fixed!"
echo ""
echo "Current permissions:"
ls -la "$SCRIPT_DIR/database/"

echo ""
echo "You can now restart your server and try registering again."
