const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../database/db');
const { validateRegistration, validateLogin } = require('../middleware/validators');
const { requireGuest, requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

router.post('/register', requireGuest, validateRegistration, async (req, res) => {
  try {
    const { email, password, mobile_number, zip_code, flag_sms_notification, flag_email_notification } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists' });
    }

    const hashed_password = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (email, hashed_password, mobile_number, zip_code, flag_sms_notification, flag_email_notification)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [email, hashed_password, mobile_number || null, zip_code, !!flag_sms_notification, flag_email_notification !== false]
    );

    const userId = result.rows[0].id;
    req.session.userId = userId;
    req.session.email = email;

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: { id: userId, email, zip_code }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to create account' });
  }
});

router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.hashed_password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    req.session.email = user.email;

    res.json({
      success: true,
      message: 'Logged in successfully',
      user: { id: user.id, email: user.email, zip_code: user.zip_code }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to log in' });
  }
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Server Error', message: 'Failed to log out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

router.get('/session', async (req, res) => {
  if (req.session && req.session.userId) {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
      const user = result.rows[0];
      if (user) {
        return res.json({
          authenticated: true,
          user: { id: user.id, email: user.email, zip_code: user.zip_code }
        });
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  }
  res.json({ authenticated: false });
});

module.exports = router;
