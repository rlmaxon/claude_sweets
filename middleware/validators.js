const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation error handler
 * Returns validation errors if any exist
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
}

/**
 * User registration validation rules
 */
const validateRegistration = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),

  body('mobile_number')
    .optional({ checkFalsy: true })
    .matches(/^\d{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),

  body('zip_code')
    .trim()
    .matches(/^\d{5}$/)
    .withMessage('Zip code must be exactly 5 digits'),

  body('flag_sms_notification')
    .optional()
    .isBoolean()
    .withMessage('SMS notification flag must be boolean'),

  body('flag_email_notification')
    .optional()
    .isBoolean()
    .withMessage('Email notification flag must be boolean'),

  handleValidationErrors
];

/**
 * User login validation rules
 */
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

/**
 * Pet registration validation rules
 */
const validatePet = [
  body('status')
    .trim()
    .isIn(['Lost', 'Found', 'Reunited'])
    .withMessage('Status must be Lost, Found, or Reunited'),

  body('pet_type')
    .trim()
    .isIn(['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'])
    .withMessage('Pet type must be Dog, Cat, Bird, Rabbit, or Other'),

  body('pet_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Pet name must be 1-100 characters'),

  body('pet_breed')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Pet breed must not exceed 100 characters'),

  body('pet_description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Pet description must not exceed 1000 characters'),

  body('additional_comments')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Additional comments must not exceed 1000 characters'),

  body('flag_chip')
    .optional()
    .isBoolean()
    .withMessage('Chip flag must be boolean'),

  body('last_seen_location')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Last seen location must not exceed 200 characters'),

  handleValidationErrors
];

/**
 * User profile update validation rules
 */
const validateUserUpdate = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('mobile_number')
    .optional({ checkFalsy: true })
    .matches(/^\d{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),

  body('zip_code')
    .optional()
    .trim()
    .matches(/^\d{5}$/)
    .withMessage('Zip code must be exactly 5 digits'),

  body('flag_sms_notification')
    .optional()
    .isBoolean()
    .withMessage('SMS notification flag must be boolean'),

  body('flag_email_notification')
    .optional()
    .isBoolean()
    .withMessage('Email notification flag must be boolean'),

  handleValidationErrors
];

/**
 * Search query validation
 */
const validateSearch = [
  query('zip')
    .optional()
    .trim()
    .matches(/^\d{5}$/)
    .withMessage('Zip code must be exactly 5 digits'),

  query('type')
    .optional()
    .trim()
    .isIn(['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'])
    .withMessage('Pet type must be Dog, Cat, Bird, Rabbit, or Other'),

  query('status')
    .optional()
    .trim()
    .isIn(['Lost', 'Found'])
    .withMessage('Status must be either "Lost" or "Found"'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),

  handleValidationErrors
];

/**
 * ID parameter validation
 */
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),

  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePet,
  validateUserUpdate,
  validateSearch,
  validateId
};
