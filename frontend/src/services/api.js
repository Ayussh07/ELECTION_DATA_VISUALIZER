/**
 * API Service Module
 * 
 * This module provides a centralized API client for making HTTP requests to the backend.
 * Uses Axios for HTTP requests with a configured base URL and default headers.
 * 
 * All API functions return Axios promises that can be used with async/await or .then().
 * The API_URL is configurable via environment variable (VITE_API_URL) for different
 * deployment environments (development, staging, production).
 */

import axios from 'axios';

// API base URL - can be configured via VITE_API_URL environment variable
// Defaults to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create Axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Basic Data Endpoints
// ============================================================================

/**
 * Get all available election years
 * @returns {Promise} Axios promise resolving to array of years
 */
export const getYears = () => api.get('/years');

/**
 * Get all states
 * @returns {Promise} Axios promise resolving to array of state objects
 */
export const getStates = () => api.get('/states');

/**
 * Get all political parties
 * @returns {Promise} Axios promise resolving to array of party objects
 */
export const getParties = () => api.get('/parties');

/**
 * Get constituencies (grouped by name)
 * @param {number} state - Optional state ID to filter constituencies
 * @returns {Promise} Axios promise resolving to array of constituency objects
 */
export const getConstituencies = (state) => api.get('/constituencies', { params: { state } });

/**
 * Get individual constituencies list
 * @param {number} state - Optional state ID filter
 * @param {number} district - Optional district ID filter
 * @returns {Promise} Axios promise resolving to array of constituency objects
 */
export const getConstituenciesList = (state, district) => api.get('/constituencies-list', { params: { state, district } });

/**
 * Get election results with filters
 * @param {Object} params - Query parameters (year, state, party, constituency, limit, offset)
 * @returns {Promise} Axios promise resolving to array of election result objects
 */
export const getElections = (params) => api.get('/elections', { params });

// ============================================================================
// Analytics Endpoints
// ============================================================================

/**
 * Get seat share by party for a given year
 * @param {number} year - Election year
 * @param {number} state - Optional state ID filter
 * @param {number} party - Optional party ID filter
 * @param {string} gender - Optional gender filter ('M' or 'F')
 * @param {number} district - Optional district ID filter
 * @param {number} constituency - Optional constituency ID filter
 * @returns {Promise} Axios promise resolving to array of seat share data
 */
export const getSeatShare = (year, state, party, gender, district, constituency) => api.get('/seat-share', { params: { year, state, party, gender, district, constituency } });

/**
 * Get voter turnout by state
 * @param {number} year - Election year
 * @param {number} state - Optional state ID filter
 * @returns {Promise} Axios promise resolving to array of turnout data
 */
export const getTurnout = (year, state) => api.get('/turnout', { params: { year, state } });

/**
 * Get vote share by party
 * @param {number} year - Election year
 * @param {number} party - Optional party ID filter
 * @param {boolean} aggregate - If true, returns aggregated vote share by party only
 * @param {number} state - Optional state ID filter
 * @param {string} gender - Optional gender filter
 * @param {number} district - Optional district ID filter
 * @param {number} constituency - Optional constituency ID filter
 * @returns {Promise} Axios promise resolving to vote share data
 */
export const getVoteShare = (year, party, aggregate, state, gender, district, constituency) => api.get('/vote-share', { params: { year, party, aggregate, state, gender, district, constituency } });

/**
 * Get gender representation trends over time
 * @param {number} party - Optional party ID filter
 * @param {number} state - Optional state ID filter
 * @param {string} gender - Optional gender filter
 * @param {number} district - Optional district ID filter
 * @param {number} constituency - Optional constituency ID filter
 * @returns {Promise} Axios promise resolving to gender trend data
 */
export const getGenderTrend = (party, state, gender, district, constituency) => api.get('/gender-trend', { params: { party, state, gender, district, constituency } });

/**
 * Get closest election contests (narrowest victories)
 * @param {number} year - Optional election year filter
 * @param {number} state - Optional state ID filter
 * @param {number} limit - Maximum number of results (default: 10)
 * @param {number} district - Optional district ID filter
 * @param {number} constituency - Optional constituency ID filter
 * @returns {Promise} Axios promise resolving to array of margin data
 */
export const getMargins = (year, state, limit = 10, district, constituency) => api.get('/margins', { params: { year, state, limit, district, constituency } });

/**
 * Search candidates, constituencies, or parties
 * @param {string} q - Search query string
 * @param {string} type - Search type: 'candidate', 'constituency', 'party', or 'all'
 * @returns {Promise} Axios promise resolving to search results object
 */
export const search = (q, type) => api.get('/search', { params: { q, type } });

/**
 * Get key performance indicators
 * @param {number} year - Election year
 * @param {number} state - Optional state ID filter
 * @param {string} gender - Optional gender filter
 * @param {number} district - Optional district ID filter
 * @param {number} constituency - Optional constituency ID filter
 * @returns {Promise} Axios promise resolving to KPI object
 */
export const getKPIs = (year, state, gender, district, constituency) => api.get('/kpis', { params: { year, state, gender, district, constituency } });

// ============================================================================
// Advanced Analytics Endpoints
// ============================================================================

/**
 * Get state with highest voter turnout
 * @param {number} year - Election year
 * @returns {Promise} Axios promise resolving to highest turnout state data
 */
export const getHighestTurnout = (year) => api.get('/analytics/highest-turnout', { params: { year } });

/**
 * Get seat changes between two election years
 * @param {number} year1 - First election year
 * @param {number} year2 - Second election year
 * @returns {Promise} Axios promise resolving to seat change data
 */
export const getSeatChanges = (year1, year2) => api.get('/analytics/seat-changes', { params: { year1, year2 } });

/**
 * Get women candidates percentage over time
 * @param {number} year - Optional election year filter
 * @param {number} state - Optional state ID filter
 * @returns {Promise} Axios promise resolving to women candidates statistics
 */
export const getWomenCandidates = (year = null, state = null) => {
  const params = {};
  if (year) params.year = year;
  if (state) params.state = state;
  return api.get('/analytics/women-candidates', { params });
};

/**
 * Get closest election contests for a given year
 * @param {number} year - Election year
 * @returns {Promise} Axios promise resolving to closest contests data
 */
export const getClosestContests = (year) => api.get('/analytics/closest-contests', { params: { year } });

/**
 * Get correlation between voter turnout and victory margins
 * @param {number} state - Optional state ID filter
 * @returns {Promise} Axios promise resolving to correlation data
 */
export const getCorrelation = (state) => api.get('/analytics/correlation', { params: { state } });

/**
 * Get national vs regional parties vote share over time
 * @returns {Promise} Axios promise resolving to vote share by party type over time
 */
export const getNationalVsRegionalVoteShare = () => api.get('/analytics/national-vs-regional');

/**
 * Get education level correlation with winning chances
 * @returns {Promise} Axios promise resolving to education statistics
 */
export const getEducationCorrelation = () => api.get('/analytics/education-correlation');

export default api;


