/**
 * Async Handler Middleware
 * 
 * Wraps async route handlers to automatically catch and forward errors to the
 * Express error handler. Without this wrapper, unhandled promise rejections
 * in async route handlers would crash the server.
 * 
 * Usage:
 *   router.get('/endpoint', asyncHandler(async (req, res) => {
 *     // async code here
 *   }));
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    // Wrap the async function in a Promise and catch any errors
    // Errors are passed to Express's error handling middleware via next()
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;







