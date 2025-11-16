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

// Call initialization
initializeDatabase();

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

  // Search queries
  searchLostPets: db.prepare(`
    SELECT p.*, u.zip_code
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'Lost'
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `),

  searchFoundPets: db.prepare(`
    SELECT p.*, u.zip_code
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'Found'
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `),

  searchPetsByType: db.prepare(`
    SELECT p.*, u.zip_code
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = ? AND p.pet_type = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `),

  searchPetsByZip: db.prepare(`
    SELECT p.*, u.zip_code
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = ? AND u.zip_code = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `)
};

// Export database and prepared statements
module.exports = {
  db,
  statements
};
