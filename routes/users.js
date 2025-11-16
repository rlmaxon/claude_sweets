const express = require('express');
const bcrypt = require('bcrypt');
const { statements } = require('../database/db');
const { validateUserUpdate } = require('../middleware/validators');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * GET /api/user/profile
 * Get current user's profile information
 */
router.get('/profile', requireAuth, (req, res) => {
  try {
    const user = statements.getUserById.get(req.session.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        mobile_number: user.mobile_number,
        zip_code: user.zip_code,
        flag_sms_notification: user.flag_sms_notification,
        flag_email_notification: user.flag_email_notification,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to get profile'
    });
  }
});

/**
 * PUT /api/user/profile
 * Update current user's profile
 */
router.put('/profile', requireAuth, validateUserUpdate, (req, res) => {
  try {
    const userId = req.session.userId;
    const user = statements.getUserById.get(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const {
      email,
      mobile_number,
      zip_code,
      flag_sms_notification,
      flag_email_notification
    } = req.body;

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = statements.getUserByEmail.get(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This email is already in use'
        });
      }
    }

    // Update user profile
    statements.updateUser.run(
      email !== undefined ? email : user.email,
      mobile_number !== undefined ? mobile_number : user.mobile_number,
      zip_code !== undefined ? zip_code : user.zip_code,
      flag_sms_notification !== undefined ? (flag_sms_notification ? 1 : 0) : user.flag_sms_notification,
      flag_email_notification !== undefined ? (flag_email_notification ? 1 : 0) : user.flag_email_notification,
      userId
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update profile'
    });
  }
});

/**
 * POST /api/user/change-password
 * Change user's password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password and new password are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password must be at least 8 characters long'
      });
    }

    const user = statements.getUserById.get(req.session.userId);

    // Verify current password
    const passwordMatch = await bcrypt.compare(current_password, user.hashed_password);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashed_password = await bcrypt.hash(new_password, SALT_ROUNDS);

    // Update password (need to add this prepared statement to db.js)
    const updatePasswordStmt = require('../database/db').db.prepare(
      'UPDATE users SET hashed_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    updatePasswordStmt.run(hashed_password, user.id);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to change password'
    });
  }
});

/**
 * GET /api/user/pets
 * Get all pets registered by the current user with their images
 */
router.get('/pets', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const pets = statements.getPetsByUserId.all(userId);

    // Fetch images for each pet
    const petsWithImages = pets.map(pet => {
      const images = statements.getPetImages.all(pet.id);
      return {
        ...pet,
        images: images // Add images array to each pet
      };
    });

    res.json({
      success: true,
      count: petsWithImages.length,
      pets: petsWithImages
    });

  } catch (error) {
    console.error('Get user pets error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to get pets'
    });
  }
});

module.exports = router;
