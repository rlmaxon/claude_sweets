const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'findingsweetie.db');

// Initialize database
const db = new Database(dbPath, {
  verbose: console.log // Log SQL queries in development
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema
  db.exec(schema);

  console.log('Database initialized successfully');
}

// Run database migrations
function runMigrations() {
  try {
    // Check current database state
    const petsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pets'").get();
    const petsOldTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pets_old'").get();

    console.log('Database state check:');
    console.log('- pets table exists:', !!petsTableExists);
    console.log('- pets_old table exists:', !!petsOldTableExists);

    // Handle different states
    if (petsOldTableExists && !petsTableExists) {
      // Case 1: Only pets_old exists (failed migration state)
      console.log('Recovering from failed migration: restoring pets_old to pets');
      db.prepare('ALTER TABLE pets_old RENAME TO pets').run();
      console.log('Restored pets table from pets_old');
    } else if (petsOldTableExists && petsTableExists) {
      // Case 2: Both tables exist (migration in progress)
      console.log('Cleaning up leftover pets_old table from previous migration attempt');
      db.prepare('DROP TABLE pets_old').run();
      console.log('Cleanup complete');
    }

    // Now check if we need to update the CHECK constraint for Reunited status
    let needsConstraintUpdate = false;

    const testQuery = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='pets'").get();
    if (testQuery && testQuery.sql) {
      // Check if 'Reunited' is in the CHECK constraint
      needsConstraintUpdate = !testQuery.sql.includes("'Reunited'");
      if (needsConstraintUpdate) {
        console.log('Current constraint needs update');
        console.log('Current SQL:', testQuery.sql.substring(0, 200) + '...');
      }
    }

    if (needsConstraintUpdate) {
      console.log('Running migration: Adding is_active column and updating CHECK constraint');

      // Disable foreign keys temporarily
      db.pragma('foreign_keys = OFF');

      // Step 1: Rename old table
      db.prepare('ALTER TABLE pets RENAME TO pets_old').run();
      console.log('✓ Renamed pets to pets_old');

      // Step 2: Create new table with updated constraint
      db.exec(`
        CREATE TABLE pets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('Lost', 'Found', 'Reunited')),
          pet_type TEXT NOT NULL,
          pet_name TEXT,
          pet_breed TEXT,
          pet_description TEXT,
          additional_comments TEXT,
          flag_chip BOOLEAN DEFAULT 0,
          image_url TEXT,
          last_seen_location TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created new pets table');

      // Step 3: Copy data from old table to new table
      const copyResult = db.prepare(`
        INSERT INTO pets (id, user_id, status, pet_type, pet_name, pet_breed,
                         pet_description, additional_comments, flag_chip, image_url,
                         last_seen_location, is_active, created_at, updated_at)
        SELECT id, user_id, status, pet_type, pet_name, pet_breed,
               pet_description, additional_comments, flag_chip, image_url,
               last_seen_location, COALESCE(is_active, 1), created_at, updated_at
        FROM pets_old
      `).run();
      console.log(`✓ Copied ${copyResult.changes} pets from old table`);

      // Step 4: Drop old table
      db.prepare('DROP TABLE pets_old').run();
      console.log('✓ Dropped pets_old table');

      // Step 5: Recreate indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
        CREATE INDEX IF NOT EXISTS idx_pets_status ON pets(status);
        CREATE INDEX IF NOT EXISTS idx_pets_type ON pets(pet_type);
        CREATE INDEX IF NOT EXISTS idx_pets_location ON pets(last_seen_location);
        CREATE INDEX IF NOT EXISTS idx_pets_created ON pets(created_at DESC);
      `);
      console.log('✓ Recreated indexes');

      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');

      console.log('✅ Migration complete: Updated pets table with is_active column and Reunited status');
    } else {
      console.log('✅ Database schema is up to date');
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);

    // Try to restore if migration fails
    try {
      const oldTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pets_old'").get();
      if (oldTableExists) {
        console.log('Attempting to restore from pets_old...');
        db.prepare('DROP TABLE IF EXISTS pets').run();
        db.prepare('ALTER TABLE pets_old RENAME TO pets').run();
        console.log('✓ Restored old pets table after migration failure');
      }
    } catch (restoreError) {
      console.error('❌ Failed to restore old table:', restoreError);
    }
    throw error; // Re-throw to prevent server from starting with broken DB
  }
}

// Call initialization and migrations
initializeDatabase();
runMigrations();

// Prepared statements for better performance and security
const statements = {
  // User queries
  createUser: db.prepare(`
    INSERT INTO users (email, hashed_password, mobile_number, zip_code, flag_sms_notification, flag_email_notification)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getUserByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),

  getUserById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),

  updateUser: db.prepare(`
    UPDATE users
    SET email = ?, mobile_number = ?, zip_code = ?,
        flag_sms_notification = ?, flag_email_notification = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // Pet queries
  createPet: db.prepare(`
    INSERT INTO pets (user_id, status, pet_type, pet_name, pet_breed, pet_description,
                      additional_comments, flag_chip, image_url, last_seen_location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getPetById: db.prepare(`
    SELECT p.*, u.email, u.mobile_number, u.zip_code, u.flag_sms_notification, u.flag_email_notification
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `),

  getPetsByUserId: db.prepare(`
    SELECT * FROM pets WHERE user_id = ? ORDER BY created_at DESC
  `),

  updatePet: db.prepare(`
    UPDATE pets
    SET status = ?, pet_type = ?, pet_name = ?, pet_breed = ?,
        pet_description = ?, additional_comments = ?, flag_chip = ?,
        image_url = ?, last_seen_location = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `),

  updatePetStatus: db.prepare(`
    UPDATE pets
    SET status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `),

  deletePet: db.prepare(`
    DELETE FROM pets WHERE id = ? AND user_id = ?
  `),

  // Pet image queries
  createPetImage: db.prepare(`
    INSERT INTO pet_images (pet_id, image_url, is_primary, display_order)
    VALUES (?, ?, ?, ?)
  `),

  getPetImages: db.prepare(`
    SELECT * FROM pet_images
    WHERE pet_id = ?
    ORDER BY is_primary DESC, display_order ASC
  `),

  getPrimaryImage: db.prepare(`
    SELECT * FROM pet_images
    WHERE pet_id = ? AND is_primary = 1
    LIMIT 1
  `),

  deletePetImage: db.prepare(`
    DELETE FROM pet_images WHERE id = ?
  `),

  deleteAllPetImages: db.prepare(`
    DELETE FROM pet_images WHERE pet_id = ?
  `),

  updatePetImagePrimary: db.prepare(`
    UPDATE pet_images
    SET is_primary = ?
    WHERE id = ?
  `),

  // Search queries (only show active pets)
  searchLostPets: db.prepare(`
    SELECT p.*, u.zip_code
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'Lost' AND p.is_active = 1
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `),

  searchFoundPets: db.prepare(`
    SELECT p.*, u.zip_code
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'Found' AND p.is_active = 1
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `),

  searchPetsByType: db.prepare(`
    SELECT p.*, u.zip_code
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = ? AND p.pet_type = ? AND p.is_active = 1
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `),

  searchPetsByZip: db.prepare(`
    SELECT p.*, u.zip_code
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = ? AND u.zip_code = ? AND p.is_active = 1
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `)
};

// Export database and prepared statements
module.exports = {
  db,
  statements
};
