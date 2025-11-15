# Database Information - Finding Sweetie

## Overview

The Finding Sweetie application uses **SQLite3** as its database, managed through the **better-sqlite3** npm package. This document explains the database files, verification, and common questions.

---

## Database Files

### Required Files

**`findingsweetie.db`** - The main database file
- This is the ONLY required file
- Contains all your data (users, pets, etc.)
- Created automatically when you first start the server
- Located in the `database/` directory

### Optional/Temporary Files

**`findingsweetie.db-shm`** - Shared Memory file
- **Optional and ephemeral**
- Only exists during active database operations
- Part of SQLite's WAL (Write-Ahead Logging) mode
- Automatically deleted when database connection closes cleanly
- **It's completely normal if this file doesn't exist!**

**`findingsweetie.db-wal`** - Write-Ahead Log file
- **Optional and ephemeral**
- Only exists when there are uncommitted transactions
- Part of SQLite's WAL (Write-Ahead Logging) mode
- Helps with concurrent access and crash recovery
- Automatically merged back into the main .db file during checkpoints
- **It's completely normal if this file doesn't exist!**

---

## When Are .shm and .wal Files Created?

These temporary files are created when:

1. **WAL mode is enabled** (which our app does via `db.pragma('journal_mode = WAL')`)
2. **Database is actively being used** (queries are running)
3. **There are uncommitted transactions**
4. **Multiple connections are accessing the database**

### When Will They NOT Exist?

- Server is not running
- Database connection was cleanly closed
- No active transactions
- Database has been checkpointed (WAL merged into main .db file)
- Fresh installation before first server start

**Bottom line**: Don't worry if you don't see .shm or .wal files. They're temporary and not required for the database to function.

---

## Database Verification

### Quick Verification

```bash
# Start the server first (creates database if it doesn't exist)
npm start

# In a new terminal, run verification
node verify_database.js
```

### What Gets Verified?

The `verify_database.js` script checks:

✅ Database file exists and is accessible
✅ Required tables are present (users, pets)
✅ All columns are correctly defined
✅ Data types match schema
✅ Foreign key constraints are configured
✅ Indexes exist for performance
✅ Record counts

---

## Do I Need sqlite3 CLI Tool?

**No!** The sqlite3 command-line tool is **optional**.

### You DON'T need it because:
- Our app uses the **better-sqlite3** npm package (already installed)
- The `verify_database.js` script can verify everything using Node.js
- The database is fully managed by the application code

### You MIGHT want it for:
- Manual database inspection during development
- Running ad-hoc SQL queries for debugging
- Exporting database dumps
- Advanced database administration

### Installing sqlite3 CLI (Optional)

If you want to install it:

```bash
sudo apt install sqlite3
```

Then you can use commands like:

```bash
# View schema
sqlite3 database/findingsweetie.db ".schema"

# List tables
sqlite3 database/findingsweetie.db ".tables"

# Query data
sqlite3 database/findingsweetie.db "SELECT * FROM users;"

# Interactive mode
sqlite3 database/findingsweetie.db
```

---

## Common Questions

### Q: I don't see findingsweetie.db - is something wrong?

**A**: The database file is created when you first start the server. Run:

```bash
npm start
# or
node server.js
```

Once the server starts, you'll see:
```
Database initialized successfully
🐾 Finding Sweetie server running on http://0.0.0.0:3000
```

Now the database file will exist in `database/findingsweetie.db`.

### Q: Should I commit the .db files to git?

**A**:
- **findingsweetie.db** - Usually NO (should be in .gitignore for development databases)
- **findingsweetie.db-shm** - NO (temporary file, should be in .gitignore)
- **findingsweetie.db-wal** - NO (temporary file, should be in .gitignore)

The database files contain user data and should not be committed. Only commit:
- `schema.sql` - The database schema definition
- `db.js` - The database initialization code

### Q: How do I reset the database?

```bash
# Stop the server first (Ctrl+C)

# Remove all database files
rm database/findingsweetie.db*

# Restart the server (recreates database from schema)
npm start
```

### Q: How do I backup the database?

```bash
# Simple file copy
cp database/findingsweetie.db database/backup_$(date +%Y%m%d).db

# Or using sqlite3 (if installed)
sqlite3 database/findingsweetie.db ".backup database/backup.db"
sqlite3 database/findingsweetie.db ".dump" > backup.sql
```

### Q: Can I open the database while the server is running?

**Yes!** SQLite supports concurrent reads. However:
- Multiple readers: ✅ Safe
- Multiple writers: ⚠️ May cause "database locked" errors
- For writes, close other connections first

### Q: What's the difference between better-sqlite3 and sqlite3 packages?

| Feature | better-sqlite3 | sqlite3 |
|---------|---------------|---------|
| **Speed** | Much faster | Slower |
| **API** | Synchronous | Asynchronous |
| **Performance** | ~10x faster for most operations | Standard |
| **Used by** | Our app! | Other projects |
| **CLI Tool** | Not included | Not included |

Both are npm packages for Node.js. Neither includes the sqlite3 CLI tool.

---

## Database Schema

See `database/schema.sql` for the complete schema definition.

### Tables

**users**
- Stores user accounts
- Email (unique), password (hashed with bcrypt), contact info
- Notification preferences

**pets**
- Stores lost and found pet reports
- Links to users via foreign key
- Includes pet details, status, location, images

### Key Features

- ✅ Foreign key constraints (data integrity)
- ✅ Indexes for fast queries (email, zip, status, type)
- ✅ Automatic timestamps (created_at, updated_at)
- ✅ Check constraints (status must be 'Lost' or 'Found')
- ✅ Cascade deletes (deleting user deletes their pets)

---

## Troubleshooting

### Error: Cannot open database

```bash
# Check file permissions
ls -la database/

# Fix permissions
chmod 755 database/
chmod 644 database/*.db 2>/dev/null || true
```

### Error: Database is locked

```bash
# Close other connections to the database
# Stop any running servers
# Close any sqlite3 CLI sessions
# Then restart the server
```

### Error: Table already exists

This is usually harmless. The schema uses `CREATE TABLE IF NOT EXISTS`.

If you want to start fresh:

```bash
# Stop server, remove database, restart
rm database/findingsweetie.db* && npm start
```

---

## Performance Tips

1. **Indexes** - Already configured in schema.sql for common queries
2. **Prepared Statements** - Already used in db.js for security and speed
3. **WAL Mode** - Already enabled for better concurrent access
4. **Foreign Keys** - Already enabled for data integrity

No additional configuration needed! The database is optimized out of the box.

---

## Security

✅ **Passwords are hashed** with bcrypt (never stored in plaintext)
✅ **SQL injection protection** via prepared statements
✅ **Input validation** via express-validator
✅ **Foreign key constraints** prevent orphaned data

The database is secured following best practices.

---

## For More Information

- **SQLite Documentation**: https://www.sqlite.org/docs.html
- **better-sqlite3 Documentation**: https://github.com/WiseLibs/better-sqlite3
- **Database Schema**: See `database/schema.sql`
- **Database Code**: See `database/db.js`
- **Verification Script**: Run `node verify_database.js`

---

**Last Updated**: 2025-11-15
**Phase**: Phase 1 - Backend Foundation
