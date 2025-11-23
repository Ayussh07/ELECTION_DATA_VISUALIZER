require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const electionsRouter = require('./routes/elections');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', electionsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API documentation endpoint
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Log environment info
console.log('\n🚀 Starting Election Data Backend Server...');
console.log(`   Node version: ${process.version}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Port: ${PORT}`);
console.log(`   API URL: http://localhost:${PORT}/api`);
console.log(`   Health check: http://localhost:${PORT}/health`);
console.log('');

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📚 API documentation: http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('');
  // Database connection happens automatically in connection.js
  // It will log its status when it connects
});

module.exports = app;

