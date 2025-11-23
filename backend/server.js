/**
 * Indian Election Data API Server
 * 
 * This is the main Express.js server that provides RESTful API endpoints
 * for accessing and analyzing Indian Lok Sabha election data (1991-2019).
 * 
 * The server connects to a SQLite database and exposes endpoints for:
 * - Fetching election results with various filters
 * - Analyzing seat shares, vote shares, and turnout
 * - Gender representation trends
 * - Victory margins and closest contests
 * - Advanced analytics and correlations
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const electionsRouter = require('./routes/elections');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware - adds HTTP headers to protect against common vulnerabilities
app.use(helmet());

// CORS middleware - allows cross-origin requests from the frontend
app.use(cors());

// Logging middleware - logs HTTP requests in development mode for debugging
app.use(morgan('dev'));

// Body parsing middleware - parses JSON request bodies
app.use(express.json());

// URL encoding middleware - parses URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Mount the elections router - all election-related endpoints are under /api
app.use('/api', electionsRouter);

/**
 * Health Check Endpoint
 * 
 * Simple endpoint to verify that the server is running and responsive.
 * Useful for monitoring and load balancers to check server availability.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

/**
 * API Documentation Endpoint
 * 
 * Returns a JSON object listing all available API endpoints with their
 * query parameters. This serves as basic API documentation for developers.
 */
app.get('/api', (req, res) => {
  res.json({
    message: 'Indian Election Data API',
    version: '1.0.0',
    endpoints: {
      years: 'GET /api/years',
      states: 'GET /api/states',
      parties: 'GET /api/parties',
      elections: 'GET /api/elections?year=&state=&party=&constituency=&limit=&offset=',
      seatShare: 'GET /api/seat-share?year=',
      turnout: 'GET /api/turnout?year=',
      voteShare: 'GET /api/vote-share?year=&party=',
      genderTrend: 'GET /api/gender-trend?party=&state=',
      margins: 'GET /api/margins?year=&state=&limit=',
      search: 'GET /api/search?q=&type=(candidate|constituency|party)',
      kpis: 'GET /api/kpis?year=',
      analytics: {
        highestTurnout: 'GET /api/analytics/highest-turnout?year=',
        seatChanges: 'GET /api/analytics/seat-changes?year1=&year2=',
        womenCandidates: 'GET /api/analytics/women-candidates?year=&state=',
        closestContests: 'GET /api/analytics/closest-contests?year=',
        correlation: 'GET /api/analytics/correlation?state='
      }
    }
  });
});

/**
 * 404 Not Found Handler
 * 
 * Catches any requests to routes that don't exist and returns a 404 error.
 * This middleware must be placed before the error handler but after all routes.
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * Global Error Handler
 * 
 * This is the final middleware that catches any errors thrown by route handlers
 * or other middleware. It formats error responses consistently and logs errors
 * for debugging. Must be the last middleware in the chain.
 */
app.use(errorHandler);

// Server configuration - use PORT from environment variable or default to 5000
const PORT = process.env.PORT || 5000;

// Log startup information to help with debugging and deployment
console.log('\n🚀 Starting Election Data Backend Server...');
console.log(`   Node version: ${process.version}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Port: ${PORT}`);
console.log(`   API URL: http://localhost:${PORT}/api`);
console.log(`   Health check: http://localhost:${PORT}/health`);
console.log('');

/**
 * Start the HTTP server and listen for incoming requests
 * 
 * The server will automatically attempt to connect to the SQLite database
 * when it starts (connection is handled in connection.js module).
 */
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📚 API documentation: http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('');
  // Database connection happens automatically in connection.js
  // It will log its status when it connects
});

module.exports = app;

