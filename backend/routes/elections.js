/**
 * Election Data API Routes
 * 
 * This router defines all the API endpoints for accessing election data.
 * Routes are organized into:
 * - Basic data endpoints: years, states, parties, constituencies, elections
 * - Analytics endpoints: seat share, vote share, turnout, gender trends, margins
 * - Advanced analytics: correlations, comparisons, trend analysis
 * 
 * All routes use the asyncHandler middleware to properly catch and handle
 * asynchronous errors. Validation middleware is applied where appropriate
 * to ensure request parameters are valid before processing.
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { validateYear, validatePagination, validateSearch, validateSeatChanges } = require('../middleware/validator');
const {
  getYears,
  getStates,
  getParties,
  getConstituencies,
  getConstituenciesList,
  getElections,
  getSeatShare,
  getTurnout,
  getVoteShare,
  getGenderTrend,
  getMargins,
  search,
  getKPIs,
  getHighestTurnout,
  getSeatChanges,
  getWomenCandidates,
  getClosestContests,
  getCorrelation,
  getNationalVsRegionalVoteShare,
  getEducationCorrelation
} = require('../controllers/electionController');

// ============================================================================
// Basic Data Endpoints
// ============================================================================
// These endpoints return raw data lists and filtered election results

router.get('/years', asyncHandler(getYears));
router.get('/states', asyncHandler(getStates));
router.get('/parties', asyncHandler(getParties));
router.get('/constituencies', asyncHandler(getConstituencies));
router.get('/constituencies-list', asyncHandler(getConstituenciesList));
router.get('/elections', validatePagination, asyncHandler(getElections));

// ============================================================================
// Analytics Endpoints
// ============================================================================
// These endpoints return aggregated and calculated statistics

router.get('/seat-share', validateYear, asyncHandler(getSeatShare));
router.get('/turnout', validateYear, asyncHandler(getTurnout));
router.get('/vote-share', validateYear, asyncHandler(getVoteShare));
router.get('/gender-trend', asyncHandler(getGenderTrend));
router.get('/margins', validateYear, validatePagination, asyncHandler(getMargins));
router.get('/search', validateSearch, asyncHandler(search));
router.get('/kpis', validateYear, asyncHandler(getKPIs));

// ============================================================================
// Advanced Analytics Endpoints
// ============================================================================
// These endpoints provide deeper insights and correlations

router.get('/analytics/highest-turnout', validateYear, asyncHandler(getHighestTurnout));
router.get('/analytics/seat-changes', validateSeatChanges, asyncHandler(getSeatChanges));
router.get('/analytics/women-candidates', asyncHandler(getWomenCandidates)); // Year is optional
router.get('/analytics/closest-contests', validateYear, asyncHandler(getClosestContests));
router.get('/analytics/correlation', asyncHandler(getCorrelation));
router.get('/analytics/national-vs-regional', asyncHandler(getNationalVsRegionalVoteShare));
router.get('/analytics/education-correlation', asyncHandler(getEducationCorrelation));

module.exports = router;
