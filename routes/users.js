const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../database/db');
const { validateUserUpdate } = require('../middleware/validators');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
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
    res.status(500).json({ error: 'Server Error', message: 'Failed to get profile' });
  }
});

router.put('/profile', requireAuth, validateUserUpdate, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const { email, mobile_number, zip_code, flag_sms_notification, flag_email_notification } = req.body;

    if (email && email !== user.email) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Conflict', message: 'This email is already in use' });
      }
    }

    await query(
      `UPDATE users SET email = $1, mobile_number = $2, zip_code = $3,
       flag_sms_notification = $4, flag_email_notification = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        email !== undefined ? email : user.email,
        mobile_number !== undefined ? mobile_number : user.mobile_number,
        zip_code !== undefined ? zip_code : user.zip_code,
        flag_sms_notification !== undefined ? !!flag_sms_notification : user.flag_sms_notification,
        flag_email_notification !== undefined ? !!flag_email_notification : user.flag_email_notification,
        userId
      ]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to update profile' });
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Current password and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Validation Error', message: 'New password must be at least 8 characters long' });
    }

    const result = await query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(current_password, user.hashed_password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Current password is incorrect' });
    }

    const hashed_password = await bcrypt.hash(new_password, SALT_ROUNDS);
    await query(
      'UPDATE users SET hashed_password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashed_password, user.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to change password' });
  }
});

router.get('/pets', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const petsResult = await query(
      'SELECT * FROM pets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const petsWithImages = await Promise.all(petsResult.rows.map(async (pet) => {
      const imagesResult = await query(
        'SELECT * FROM pet_images WHERE pet_id = $1 ORDER BY is_primary DESC, display_order ASC',
        [pet.id]
      );
      return { ...pet, images: imagesResult.rows };
    }));

    res.json({ success: true, count: petsWithImages.length, pets: petsWithImages });
  } catch (error) {
    console.error('Get user pets error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to get pets' });
  }
});

module.exports = router;
