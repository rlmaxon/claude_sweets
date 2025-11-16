-- Finding Sweetie Database Schema
-- SQLite3 database for managing users and pets

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    mobile_number TEXT,
    zip_code TEXT NOT NULL,
    flag_sms_notification BOOLEAN DEFAULT 0,
    flag_email_notification BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Lost', 'Found')),
    pet_type TEXT NOT NULL,
    pet_name TEXT,
    pet_breed TEXT,
    pet_description TEXT,
    additional_comments TEXT,
    flag_chip BOOLEAN DEFAULT 0,
    image_url TEXT,
    last_seen_location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Pet images table (for multiple images per pet)
CREATE TABLE IF NOT EXISTS pet_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_zip ON users(zip_code);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_status ON pets(status);
CREATE INDEX IF NOT EXISTS idx_pets_type ON pets(pet_type);
CREATE INDEX IF NOT EXISTS idx_pets_location ON pets(last_seen_location);
CREATE INDEX IF NOT EXISTS idx_pets_created ON pets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_images_pet_id ON pet_images(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_images_primary ON pet_images(pet_id, is_primary);
