// Request validation middleware
const { body, query, param, validationResult } = require('express-validator');

// Validate year parameter
const validateYear = [
  query('year')
    .optional()
    .isInt({ min: 1950, max: 2100 })
    .withMessage('Year must be between 1950 and 2100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validate pagination parameters
const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validate search query
const validateSearch = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('type')
    .optional()
    .isIn(['candidate', 'constituency', 'party', 'all'])
    .withMessage('Type must be one of: candidate, constituency, party, all'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validate seat changes parameters
const validateSeatChanges = [
  query('year1')
    .notEmpty()
    .withMessage('year1 is required')
    .isInt({ min: 1950, max: 2100 })
    .withMessage('year1 must be between 1950 and 2100'),
  query('year2')
    .notEmpty()
    .withMessage('year2 is required')
    .isInt({ min: 1950, max: 2100 })
    .withMessage('year2 must be between 1950 and 2100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateYear,
  validatePagination,
  validateSearch,
  validateSeatChanges
};





