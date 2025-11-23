/**
 * Global Error Handler Middleware
 * 
 * This is the final error handling middleware that catches all errors thrown
 * by route handlers or other middleware. It provides consistent error responses
 * and detailed logging for debugging.
 * 
 * Error types handled:
 * - Database connection errors (503 Service Unavailable)
 * - SQLite database errors (500 Internal Server Error)
 * - Validation errors (400 Bad Request)
 * - Generic errors (500 Internal Server Error or custom status)
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error details for debugging (in production, consider using a logging service)
  console.error('\n❌ Unhandled Server Error:');
  console.error(`   Path: ${req.method} ${req.path}`);
  console.error(`   Error code: ${err.code || 'UNKNOWN'}`);
  console.error(`   Error message: ${err.message}`);
  console.error(`   Stack trace:`);
  console.error(err.stack);
  console.error('');
  
  // Handle database connection errors - return 503 Service Unavailable
  if (err.code === 'DB_NOT_CONNECTED' || err.message.includes('not connected')) {
    return res.status(503).json({ 
      error: 'Database not available', 
      message: 'Please check database file permissions and ensure the database is initialized.',
      code: err.code 
    });
  }
  
  // Handle SQLite-specific errors - return 500 Internal Server Error
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      error: 'Database error',
      message: err.message,
      code: err.code
    });
  }
  
  // Handle validation errors - return 400 Bad Request
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: err.details
    });
  }
  
  // Default error handler - return 500 or custom status code
  res.status(err.status || 500).json({ 
    error: 'Something went wrong!', 
    message: err.message,
    code: err.code,
    path: req.path
  });
};

module.exports = errorHandler;




