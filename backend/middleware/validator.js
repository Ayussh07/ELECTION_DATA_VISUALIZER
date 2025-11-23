/**
 * Request Validation Middleware
 * 
 * This module provides validation middleware functions for API endpoints.
 * Uses express-validator to validate and sanitize request parameters.
 * 
 * All validators return 400 Bad Request with error details if validation fails.
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Validate Year Parameter
 * 
 * Validates that the 'year' query parameter is a valid integer between 1950 and 2100.
 * Year parameter is optional - if not provided, validation passes.
 * 
 * Usage: router.get('/endpoint', validateYear, handler)
 * 
 * @returns {Array} Express-validator middleware chain
 */
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

/**
 * Validate Pagination Parameters
 * 
 * Validates 'limit' and 'offset' query parameters for pagination.
 * - limit: Must be between 1 and 1000 (optional, no default)
 * - offset: Must be a non-negative integer (optional, defaults to 0)
 * 
 * Usage: router.get('/endpoint', validatePagination, handler)
 * 
 * @returns {Array} Express-validator middleware chain
 */
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

/**
 * Validate Search Query Parameters
 * 
 * Validates search endpoint parameters:
 * - q: Required search query string (1-100 characters)
 * - type: Optional search type, must be one of: 'candidate', 'constituency', 'party', 'all'
 * 
 * Usage: router.get('/search', validateSearch, handler)
 * 
 * @returns {Array} Express-validator middleware chain
 */
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

/**
 * Validate Seat Changes Parameters
 * 
 * Validates parameters for comparing seat counts between two election years.
 * Both year1 and year2 are required and must be valid integers between 1950 and 2100.
 * 
 * Usage: router.get('/analytics/seat-changes', validateSeatChanges, handler)
 * 
 * @returns {Array} Express-validator middleware chain
 */
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







