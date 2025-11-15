const express = require('express');
const bcrypt = require('bcrypt');
const { statements } = require('../database/db');
const { validateRegistration, validateLogin } = require('../middleware/validators');
const { requireGuest, requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', requireGuest, validateRegistration, async (req, res) => {
  try {
    const {
      email,
      password,
      mobile_number,
      zip_code,
      flag_sms_notification,
      flag_email_notification
    } = req.body;

    // Check if user already exists
    const existingUser = statements.getUserByEmail.get(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email already exists'
      });
    }

    // Hash password using bcrypt
    const hashed_password = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user into database
    const result = statements.createUser.run(
      email,
      hashed_password,
      mobile_number || null,
      zip_code,
      flag_sms_notification ? 1 : 0,
      flag_email_notification !== false ? 1 : 0
    );

    // Create session for the new user
    req.session.userId = result.lastInsertRowid;
    req.session.email = email;

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.lastInsertRowid,
        email: email,
        zip_code: zip_code
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to create account'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
router.post('/login', requireGuest, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user from database
    const user = statements.getUserByEmail.get(email);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Compare password with hashed password using bcrypt
    const passwordMatch = await bcrypt.compare(password, user.hashed_password);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Create session
    req.session.userId = user.id;
    req.session.email = user.email;

    res.json({
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        zip_code: user.zip_code
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to log in'
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroy user session
 */
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to log out'
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * GET /api/auth/session
 * Get current session information
 */
router.get('/session', (req, res) => {
  if (req.session && req.session.userId) {
    const user = statements.getUserById.get(req.session.userId);
    if (user) {
      return res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          zip_code: user.zip_code
        }
      });
    }
  }

  res.json({
    authenticated: false
  });
});

module.exports = router;
