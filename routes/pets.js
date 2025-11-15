const express = require('express');
const multer = require('multer');
const path = require('path');
const { statements } = require('../database/db');
const { validatePet, validateSearch, validateId } = require('../middleware/validators');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for pet image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pet-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

/**
 * POST /api/pets/register
 * Register a new pet (lost or found)
 */
router.post('/register', requireAuth, upload.single('pet_image'), validatePet, (req, res) => {
  try {
    const {
      status,
      pet_type,
      pet_name,
      pet_breed,
      pet_description,
      additional_comments,
      flag_chip,
      last_seen_location
    } = req.body;

    const user_id = req.session.userId;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Insert pet into database
    const result = statements.createPet.run(
      user_id,
      status,
      pet_type,
      pet_name || null,
      pet_breed || null,
      pet_description || null,
      additional_comments || null,
      flag_chip ? 1 : 0,
      image_url,
      last_seen_location || null
    );

    res.status(201).json({
      success: true,
      message: 'Pet registered successfully',
      pet: {
        id: result.lastInsertRowid,
        status,
        pet_type,
        pet_name,
        image_url
      }
    });

  } catch (error) {
    console.error('Pet registration error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to register pet'
    });
  }
});

/**
 * GET /api/pets/lost
 * Search for lost pets
 */
router.get('/lost', validateSearch, (req, res) => {
  try {
    const { zip, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let pets;

    if (zip && type) {
      // Search by both zip and type
      pets = statements.searchPetsByZip.all('Lost', zip, parseInt(limit), offset)
        .filter(pet => pet.pet_type === type);
    } else if (zip) {
      // Search by zip only
      pets = statements.searchPetsByZip.all('Lost', zip, parseInt(limit), offset);
    } else if (type) {
      // Search by type only
      pets = statements.searchPetsByType.all('Lost', type, parseInt(limit), offset);
    } else {
      // Get all lost pets
      pets = statements.searchLostPets.all(parseInt(limit), offset);
    }

    res.json({
      success: true,
      count: pets.length,
      pets: pets.map(pet => ({
        id: pet.id,
        pet_type: pet.pet_type,
        pet_name: pet.pet_name,
        pet_breed: pet.pet_breed,
        pet_description: pet.pet_description,
        image_url: pet.image_url,
        last_seen_location: pet.last_seen_location,
        zip_code: pet.zip_code,
        created_at: pet.created_at
      }))
    });

  } catch (error) {
    console.error('Search lost pets error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to search pets'
    });
  }
});

/**
 * GET /api/pets/found
 * Search for found pets
 */
router.get('/found', validateSearch, (req, res) => {
  try {
    const { zip, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let pets;

    if (zip && type) {
      // Search by both zip and type
      pets = statements.searchPetsByZip.all('Found', zip, parseInt(limit), offset)
        .filter(pet => pet.pet_type === type);
    } else if (zip) {
      // Search by zip only
      pets = statements.searchPetsByZip.all('Found', zip, parseInt(limit), offset);
    } else if (type) {
      // Search by type only
      pets = statements.searchPetsByType.all('Found', type, parseInt(limit), offset);
    } else {
      // Get all found pets
      pets = statements.searchFoundPets.all(parseInt(limit), offset);
    }

    res.json({
      success: true,
      count: pets.length,
      pets: pets.map(pet => ({
        id: pet.id,
        pet_type: pet.pet_type,
        pet_name: pet.pet_name,
        pet_breed: pet.pet_breed,
        pet_description: pet.pet_description,
        image_url: pet.image_url,
        last_seen_location: pet.last_seen_location,
        zip_code: pet.zip_code,
        created_at: pet.created_at
      }))
    });

  } catch (error) {
    console.error('Search found pets error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to search pets'
    });
  }
});

/**
 * GET /api/pets/:id
 * Get details for a specific pet
 */
router.get('/:id', validateId, (req, res) => {
  try {
    const pet = statements.getPetById.get(req.params.id);

    if (!pet) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Pet not found'
      });
    }

    res.json({
      success: true,
      pet: {
        id: pet.id,
        status: pet.status,
        pet_type: pet.pet_type,
        pet_name: pet.pet_name,
        pet_breed: pet.pet_breed,
        pet_description: pet.pet_description,
        additional_comments: pet.additional_comments,
        flag_chip: pet.flag_chip,
        image_url: pet.image_url,
        last_seen_location: pet.last_seen_location,
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
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to get pet details'
    });
  }
});

/**
 * PUT /api/pets/:id
 * Update a pet's information (owner only)
 */
router.put('/:id', requireAuth, validateId, upload.single('pet_image'), validatePet, (req, res) => {
  try {
    const petId = req.params.id;
    const userId = req.session.userId;

    // Verify ownership
    const existingPet = statements.getPetById.get(petId);
    if (!existingPet) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Pet not found'
      });
    }

    if (existingPet.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this pet'
      });
    }

    const {
      status,
      pet_type,
      pet_name,
      pet_breed,
      pet_description,
      additional_comments,
      flag_chip,
      last_seen_location
    } = req.body;

    const image_url = req.file ? `/uploads/${req.file.filename}` : existingPet.image_url;

    // Update pet
    statements.updatePet.run(
      status,
      pet_type,
      pet_name || null,
      pet_breed || null,
      pet_description || null,
      additional_comments || null,
      flag_chip ? 1 : 0,
      image_url,
      last_seen_location || null,
      petId,
      userId
    );

    res.json({
      success: true,
      message: 'Pet updated successfully'
    });

  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update pet'
    });
  }
});

/**
 * DELETE /api/pets/:id
 * Delete a pet (owner only)
 */
router.delete('/:id', requireAuth, validateId, (req, res) => {
  try {
    const petId = req.params.id;
    const userId = req.session.userId;

    // Verify ownership
    const existingPet = statements.getPetById.get(petId);
    if (!existingPet) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Pet not found'
      });
    }

    if (existingPet.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this pet'
      });
    }

    // Delete pet
    statements.deletePet.run(petId, userId);

    res.json({
      success: true,
      message: 'Pet deleted successfully'
    });

  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to delete pet'
    });
  }
});

module.exports = router;
