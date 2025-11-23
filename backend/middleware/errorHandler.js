// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('\n❌ Unhandled Server Error:');
  console.error(`   Path: ${req.method} ${req.path}`);
  console.error(`   Error code: ${err.code || 'UNKNOWN'}`);
  console.error(`   Error message: ${err.message}`);
  console.error(`   Stack trace:`);
  console.error(err.stack);
  console.error('');
  
  // Database connection errors
  if (err.code === 'DB_NOT_CONNECTED' || err.message.includes('not connected')) {
    return res.status(503).json({ 
      error: 'Database not available', 
      message: 'Please check database file permissions and ensure the database is initialized.',
      code: err.code 
    });
  }
  
  // SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      error: 'Database error',
      message: err.message,
      code: err.code
    });
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: err.details
    });
  }
  
  // Default error
  res.status(err.status || 500).json({ 
    error: 'Something went wrong!', 
    message: err.message,
    code: err.code,
    path: req.path
  });
};

module.exports = errorHandler;


