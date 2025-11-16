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
    // Check if is_active column exists in pets table
    const tableInfo = db.prepare("PRAGMA table_info(pets)").all();
    const hasIsActive = tableInfo.some(col => col.name === 'is_active');

    if (!hasIsActive) {
      console.log('Running migration: Adding is_active column and updating CHECK constraint');

      // Step 1: Rename old table
      db.prepare('ALTER TABLE pets RENAME TO pets_old').run();

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

      // Step 3: Copy data from old table to new table
      db.exec(`
        INSERT INTO pets (id, user_id, status, pet_type, pet_name, pet_breed,
                         pet_description, additional_comments, flag_chip, image_url,
                         last_seen_location, is_active, created_at, updated_at)
        SELECT id, user_id, status, pet_type, pet_name, pet_breed,
               pet_description, additional_comments, flag_chip, image_url,
               last_seen_location, 1, created_at, updated_at
        FROM pets_old
      `);

      // Step 4: Drop old table
      db.prepare('DROP TABLE pets_old').run();

      // Step 5: Recreate indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
        CREATE INDEX IF NOT EXISTS idx_pets_status ON pets(status);
        CREATE INDEX IF NOT EXISTS idx_pets_type ON pets(pet_type);
        CREATE INDEX IF NOT EXISTS idx_pets_location ON pets(last_seen_location);
        CREATE INDEX IF NOT EXISTS idx_pets_created ON pets(created_at DESC);
      `);

      console.log('Migration complete: Updated pets table with is_active column and Reunited status');
    }
  } catch (error) {
    console.error('Migration error:', error);
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
