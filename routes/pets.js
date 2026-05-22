const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../database/db');
const { validatePet, validateSearch, validateId } = require('../middleware/validators');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pet-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
});

async function searchPets(status, { zip, type, limit, offset }) {
  const conditions = ['p.status = $1', 'p.is_active = true'];
  const params = [status];

  if (zip) {
    params.push(zip);
    conditions.push(`u.zip_code = $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`p.pet_type = $${params.length}`);
  }
  params.push(parseInt(limit));
  params.push(parseInt(offset));

  const result = await query(
    `SELECT p.*, u.zip_code
     FROM pets p JOIN users u ON p.user_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
}

async function attachImages(pets) {
  return Promise.all(pets.map(async (pet) => {
    const result = await query(
      'SELECT * FROM pet_images WHERE pet_id = $1 ORDER BY is_primary DESC, display_order ASC',
      [pet.id]
    );
    return { ...pet, images: result.rows };
  }));
}

function formatPetListItem(pet) {
  return {
    id: pet.id,
    pet_type: pet.pet_type,
    pet_name: pet.pet_name,
    pet_breed: pet.pet_breed,
    pet_description: pet.pet_description,
    image_url: pet.image_url,
    images: pet.images,
    last_seen_location: pet.last_seen_location,
    zip_code: pet.zip_code,
    created_at: pet.created_at
  };
}

router.post('/register', requireAuth, upload.array('pet_images', 5), validatePet, async (req, res) => {
  try {
    const {
      status, pet_type, pet_name, pet_breed, pet_description,
      additional_comments, flag_chip, last_seen_location
    } = req.body;

    const user_id = req.session.userId;
    const image_url = req.files && req.files.length > 0 ? `/uploads/${req.files[0].filename}` : null;

    const result = await query(
      `INSERT INTO pets (user_id, status, pet_type, pet_name, pet_breed, pet_description,
        additional_comments, flag_chip, image_url, last_seen_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [user_id, status, pet_type, pet_name || null, pet_breed || null,
       pet_description || null, additional_comments || null, !!flag_chip,
       image_url, last_seen_location || null]
    );

    const petId = result.rows[0].id;

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        await query(
          'INSERT INTO pet_images (pet_id, image_url, is_primary, display_order) VALUES ($1, $2, $3, $4)',
          [petId, `/uploads/${req.files[i].filename}`, i === 0, i]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Pet registered successfully',
      pet: { id: petId, status, pet_type, pet_name, image_url, image_count: req.files ? req.files.length : 0 }
    });
  } catch (error) {
    console.error('Pet registration error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to register pet' });
  }
});

router.get('/lost', validateSearch, async (req, res) => {
  try {
    const { zip, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const pets = await searchPets('Lost', { zip, type, limit, offset });
    const petsWithImages = await attachImages(pets);
    res.json({ success: true, count: petsWithImages.length, pets: petsWithImages.map(formatPetListItem) });
  } catch (error) {
    console.error('Search lost pets error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to search pets' });
  }
});

router.get('/found', validateSearch, async (req, res) => {
  try {
    const { zip, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const pets = await searchPets('Found', { zip, type, limit, offset });
    const petsWithImages = await attachImages(pets);
    res.json({ success: true, count: petsWithImages.length, pets: petsWithImages.map(formatPetListItem) });
  } catch (error) {
    console.error('Search found pets error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to search pets' });
  }
});

router.get('/:id', validateId, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, u.email, u.mobile_number, u.zip_code, u.flag_sms_notification, u.flag_email_notification
       FROM pets p JOIN users u ON p.user_id = u.id WHERE p.id = $1`,
      [req.params.id]
    );
    const pet = result.rows[0];

    if (!pet) {
      return res.status(404).json({ error: 'Not Found', message: 'Pet not found' });
    }

    const imagesResult = await query(
      'SELECT * FROM pet_images WHERE pet_id = $1 ORDER BY is_primary DESC, display_order ASC',
      [pet.id]
    );

    res.json({
      success: true,
      pet: {
        id: pet.id, status: pet.status, pet_type: pet.pet_type,
        pet_name: pet.pet_name, pet_breed: pet.pet_breed,
        pet_description: pet.pet_description, additional_comments: pet.additional_comments,
        flag_chip: pet.flag_chip, image_url: pet.image_url,
        images: imagesResult.rows, last_seen_location: pet.last_seen_location,
        created_at: pet.created_at,
        contact: {
          email: pet.flag_email_notification ? pet.email : null,
          mobile: pet.flag_sms_notification ? pet.mobile_number : null,
          zip_code: pet.zip_code
        }
      }
    });
  } catch (error) {
    console.error('Get pet error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to get pet details' });
  }
});

router.put('/:id', requireAuth, validateId, upload.array('pet_images', 5), validatePet, async (req, res) => {
  try {
    const petId = req.params.id;
    const userId = req.session.userId;

    const existingResult = await query(
      'SELECT * FROM pets WHERE id = $1',
      [petId]
    );
    const existingPet = existingResult.rows[0];

    if (!existingPet) {
      return res.status(404).json({ error: 'Not Found', message: 'Pet not found' });
    }
    if (existingPet.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to update this pet' });
    }

    const {
      status, pet_type, pet_name, pet_breed, pet_description,
      additional_comments, flag_chip, last_seen_location
    } = req.body;

    const image_url = req.files && req.files.length > 0
      ? `/uploads/${req.files[0].filename}`
      : existingPet.image_url;

    await query(
      `UPDATE pets SET status = $1, pet_type = $2, pet_name = $3, pet_breed = $4,
       pet_description = $5, additional_comments = $6, flag_chip = $7,
       image_url = $8, last_seen_location = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11`,
      [status, pet_type, pet_name || null, pet_breed || null, pet_description || null,
       additional_comments || null, !!flag_chip, image_url, last_seen_location || null,
       petId, userId]
    );

    if (req.files && req.files.length > 0) {
      const existingImages = await query('SELECT COUNT(*) FROM pet_images WHERE pet_id = $1', [petId]);
      const startOrder = parseInt(existingImages.rows[0].count);
      for (let i = 0; i < req.files.length; i++) {
        const isPrimary = startOrder === 0 && i === 0;
        await query(
          'INSERT INTO pet_images (pet_id, image_url, is_primary, display_order) VALUES ($1, $2, $3, $4)',
          [petId, `/uploads/${req.files[i].filename}`, isPrimary, startOrder + i]
        );
      }
    }

    res.json({ success: true, message: 'Pet updated successfully' });
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to update pet' });
  }
});

router.patch('/:id/status', requireAuth, validateId, async (req, res) => {
  try {
    const petId = req.params.id;
    const userId = req.session.userId;
    const { status, is_active } = req.body;

    const existingResult = await query('SELECT * FROM pets WHERE id = $1', [petId]);
    const existingPet = existingResult.rows[0];

    if (!existingPet) {
      return res.status(404).json({ error: 'Not Found', message: 'Pet not found' });
    }
    if (existingPet.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to update this pet' });
    }

    const validStatuses = ['Lost', 'Found', 'Reunited'];
    const newStatus = status || existingPet.status;
    const newIsActive = is_active !== undefined ? !!is_active : existingPet.is_active;

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid status. Must be Lost, Found, or Reunited' });
    }

    await query(
      'UPDATE pets SET status = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4',
      [newStatus, newIsActive, petId, userId]
    );

    res.json({ success: true, message: 'Pet status updated successfully', pet: { id: petId, status: newStatus, is_active: newIsActive } });
  } catch (error) {
    console.error('Update pet status error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to update pet status' });
  }
});

router.delete('/:id', requireAuth, validateId, async (req, res) => {
  try {
    const petId = req.params.id;
    const userId = req.session.userId;

    const existingResult = await query('SELECT * FROM pets WHERE id = $1', [petId]);
    const existingPet = existingResult.rows[0];

    if (!existingPet) {
      return res.status(404).json({ error: 'Not Found', message: 'Pet not found' });
    }
    if (existingPet.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to delete this pet' });
    }

    await query('DELETE FROM pets WHERE id = $1 AND user_id = $2', [petId, userId]);
    res.json({ success: true, message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to delete pet' });
  }
});

router.delete('/:petId/images/:imageId', requireAuth, async (req, res) => {
  try {
    const { petId, imageId } = req.params;
    const userId = req.session.userId;

    const petResult = await query('SELECT * FROM pets WHERE id = $1', [petId]);
    const pet = petResult.rows[0];

    if (!pet) {
      return res.status(404).json({ error: 'Not Found', message: 'Pet not found' });
    }
    if (pet.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to modify this pet' });
    }

    const imageResult = await query('SELECT * FROM pet_images WHERE id = $1 AND pet_id = $2', [imageId, petId]);
    const imageToDelete = imageResult.rows[0];

    if (!imageToDelete) {
      return res.status(404).json({ error: 'Not Found', message: 'Image not found' });
    }

    await query('DELETE FROM pet_images WHERE id = $1', [imageId]);

    if (imageToDelete.is_primary) {
      const remaining = await query(
        'SELECT * FROM pet_images WHERE pet_id = $1 ORDER BY display_order ASC LIMIT 1',
        [petId]
      );
      if (remaining.rows.length > 0) {
        await query('UPDATE pet_images SET is_primary = true WHERE id = $1', [remaining.rows[0].id]);
      }
    }

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to delete image' });
  }
});

module.exports = router;
