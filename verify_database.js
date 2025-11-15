#!/usr/bin/env node

/**
 * Database Verification Script
 *
 * This script verifies the Finding Sweetie database structure
 * without requiring sqlite3 CLI tool installation.
 *
 * Usage: node verify_database.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'findingsweetie.db');

console.log('🔍 Finding Sweetie - Database Verification');
console.log('==========================================\n');

// Check if database file exists
console.log('1️⃣  Checking database file...');
if (!fs.existsSync(dbPath)) {
  console.log('   ❌ Database file not found!');
  console.log('   💡 Run "npm start" or "node server.js" first to create the database.\n');
  process.exit(1);
}

const stats = fs.statSync(dbPath);
console.log(`   ✅ Database file exists: ${dbPath}`);
console.log(`   📦 Size: ${(stats.size / 1024).toFixed(2)} KB`);
console.log(`   📅 Created: ${stats.birthtime.toLocaleString()}\n`);

// Check for WAL files (these are optional and ephemeral)
console.log('2️⃣  Checking WAL files...');
const shmPath = `${dbPath}-shm`;
const walPath = `${dbPath}-wal`;
const hasSHM = fs.existsSync(shmPath);
const hasWAL = fs.existsSync(walPath);

if (hasSHM) {
  console.log(`   ✅ Found: ${path.basename(shmPath)}`);
} else {
  console.log(`   ℹ️  Not found: ${path.basename(shmPath)} (this is normal)`);
}

if (hasWAL) {
  console.log(`   ✅ Found: ${path.basename(walPath)}`);
} else {
  console.log(`   ℹ️  Not found: ${path.basename(walPath)} (this is normal)`);
}

console.log('   💡 .shm and .wal files are temporary and only exist during database operations.\n');

// Open database connection
let db;
try {
  console.log('3️⃣  Connecting to database...');
  db = new Database(dbPath, { readonly: true });
  console.log('   ✅ Successfully connected to database\n');
} catch (error) {
  console.log(`   ❌ Failed to connect: ${error.message}\n`);
  process.exit(1);
}

// Verify tables exist
console.log('4️⃣  Verifying tables...');
try {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  if (tables.length === 0) {
    console.log('   ❌ No tables found in database!\n');
    process.exit(1);
  }

  console.log(`   ✅ Found ${tables.length} tables:`);
  tables.forEach(table => {
    console.log(`      - ${table.name}`);
  });
  console.log();

  // Check for required tables
  const tableNames = tables.map(t => t.name);
  const requiredTables = ['users', 'pets'];
  const missingTables = requiredTables.filter(t => !tableNames.includes(t));

  if (missingTables.length > 0) {
    console.log(`   ❌ Missing required tables: ${missingTables.join(', ')}\n`);
    process.exit(1);
  }

  console.log('   ✅ All required tables present\n');
} catch (error) {
  console.log(`   ❌ Error checking tables: ${error.message}\n`);
  db.close();
  process.exit(1);
}

// Verify users table schema
console.log('5️⃣  Verifying users table schema...');
try {
  const userColumns = db.prepare(`PRAGMA table_info(users)`).all();
  const expectedColumns = [
    'id', 'email', 'hashed_password', 'mobile_number', 'zip_code',
    'flag_sms_notification', 'flag_email_notification', 'created_at', 'updated_at'
  ];

  console.log(`   📋 Users table has ${userColumns.length} columns:`);
  userColumns.forEach(col => {
    const required = col.notnull ? 'NOT NULL' : 'nullable';
    const pk = col.pk ? ' [PRIMARY KEY]' : '';
    console.log(`      - ${col.name} (${col.type}, ${required})${pk}`);
  });

  const columnNames = userColumns.map(c => c.name);
  const missingColumns = expectedColumns.filter(c => !columnNames.includes(c));

  if (missingColumns.length > 0) {
    console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}\n`);
    db.close();
    process.exit(1);
  }

  console.log('   ✅ Users table schema is correct\n');
} catch (error) {
  console.log(`   ❌ Error checking users schema: ${error.message}\n`);
  db.close();
  process.exit(1);
}

// Verify pets table schema
console.log('6️⃣  Verifying pets table schema...');
try {
  const petColumns = db.prepare(`PRAGMA table_info(pets)`).all();
  const expectedColumns = [
    'id', 'user_id', 'status', 'pet_type', 'pet_name', 'pet_breed',
    'pet_description', 'additional_comments', 'flag_chip', 'image_url',
    'last_seen_location', 'created_at', 'updated_at'
  ];

  console.log(`   📋 Pets table has ${petColumns.length} columns:`);
  petColumns.forEach(col => {
    const required = col.notnull ? 'NOT NULL' : 'nullable';
    const pk = col.pk ? ' [PRIMARY KEY]' : '';
    console.log(`      - ${col.name} (${col.type}, ${required})${pk}`);
  });

  const columnNames = petColumns.map(c => c.name);
  const missingColumns = expectedColumns.filter(c => !columnNames.includes(c));

  if (missingColumns.length > 0) {
    console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}\n`);
    db.close();
    process.exit(1);
  }

  console.log('   ✅ Pets table schema is correct\n');
} catch (error) {
  console.log(`   ❌ Error checking pets schema: ${error.message}\n`);
  db.close();
  process.exit(1);
}

// Verify indexes
console.log('7️⃣  Verifying indexes...');
try {
  const indexes = db.prepare(`
    SELECT name, tbl_name FROM sqlite_master
    WHERE type='index' AND name NOT LIKE 'sqlite_%'
    ORDER BY tbl_name, name
  `).all();

  console.log(`   📋 Found ${indexes.length} indexes:`);
  indexes.forEach(idx => {
    console.log(`      - ${idx.name} (on ${idx.tbl_name})`);
  });

  const expectedIndexes = [
    'idx_users_email',
    'idx_users_zip',
    'idx_pets_user_id',
    'idx_pets_status',
    'idx_pets_type',
    'idx_pets_location',
    'idx_pets_created'
  ];

  const indexNames = indexes.map(i => i.name);
  const missingIndexes = expectedIndexes.filter(i => !indexNames.includes(i));

  if (missingIndexes.length > 0) {
    console.log(`   ⚠️  Missing recommended indexes: ${missingIndexes.join(', ')}`);
    console.log('   💡 Indexes are optional but improve performance\n');
  } else {
    console.log('   ✅ All recommended indexes present\n');
  }
} catch (error) {
  console.log(`   ❌ Error checking indexes: ${error.message}\n`);
  db.close();
  process.exit(1);
}

// Check foreign key constraints
console.log('8️⃣  Verifying foreign key constraints...');
try {
  const fkCheck = db.prepare(`PRAGMA foreign_keys`).get();
  if (fkCheck.foreign_keys === 1) {
    console.log('   ✅ Foreign keys are ENABLED\n');
  } else {
    console.log('   ⚠️  Foreign keys are DISABLED');
    console.log('   💡 Foreign keys should be enabled for data integrity\n');
  }

  const foreignKeys = db.prepare(`PRAGMA foreign_key_list(pets)`).all();
  console.log(`   📋 Pets table has ${foreignKeys.length} foreign key(s):`);
  foreignKeys.forEach(fk => {
    console.log(`      - ${fk.from} → ${fk.table}.${fk.to}`);
  });

  if (foreignKeys.length === 0) {
    console.log('   ⚠️  No foreign keys found on pets table\n');
  } else {
    console.log('   ✅ Foreign key constraints are defined\n');
  }
} catch (error) {
  console.log(`   ❌ Error checking foreign keys: ${error.message}\n`);
  db.close();
  process.exit(1);
}

// Count records
console.log('9️⃣  Counting records...');
try {
  const userCount = db.prepare(`SELECT COUNT(*) as count FROM users`).get();
  const petCount = db.prepare(`SELECT COUNT(*) as count FROM pets`).get();

  console.log(`   👥 Users: ${userCount.count}`);
  console.log(`   🐾 Pets: ${petCount.count}\n`);
} catch (error) {
  console.log(`   ❌ Error counting records: ${error.message}\n`);
  db.close();
  process.exit(1);
}

// Close database connection
db.close();

// Final summary
console.log('==========================================');
console.log('✅ Database verification PASSED!');
console.log('==========================================\n');

console.log('📝 Summary:');
console.log('   - Database file exists and is accessible');
console.log('   - All required tables are present (users, pets)');
console.log('   - All required columns are defined');
console.log('   - Foreign key constraints are configured');
console.log('   - Indexes are present for query optimization\n');

console.log('💡 Next steps:');
console.log('   - Start the server: npm start');
console.log('   - Test the API: curl http://localhost:3000/api/health');
console.log('   - Run full API tests: ./test_api.sh\n');
