import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const getYears = () => api.get('/years');
export const getStates = () => api.get('/states');
export const getParties = () => api.get('/parties');
export const getConstituencies = (state) => api.get('/constituencies', { params: { state } });
export const getConstituenciesList = (state, district) => api.get('/constituencies-list', { params: { state, district } });
export const getElections = (params) => api.get('/elections', { params });
export const getSeatShare = (year, state, party, gender, district, constituency) => api.get('/seat-share', { params: { year, state, party, gender, district, constituency } });
export const getTurnout = (year, state) => api.get('/turnout', { params: { year, state } });
export const getVoteShare = (year, party, aggregate, state, gender, district, constituency) => api.get('/vote-share', { params: { year, party, aggregate, state, gender, district, constituency } });
export const getGenderTrend = (party, state, gender, district, constituency) => api.get('/gender-trend', { params: { party, state, gender, district, constituency } });
export const getMargins = (year, state, limit = 10, district, constituency) => api.get('/margins', { params: { year, state, limit, district, constituency } });
export const search = (q, type) => api.get('/search', { params: { q, type } });
export const getKPIs = (year, state, gender, district, constituency) => api.get('/kpis', { params: { year, state, gender, district, constituency } });
export const getHighestTurnout = (year) => api.get('/analytics/highest-turnout', { params: { year } });
export const getSeatChanges = (year1, year2) => api.get('/analytics/seat-changes', { params: { year1, year2 } });
export const getWomenCandidates = (year = null, state = null) => {
  const params = {};
  if (year) params.year = year;
  if (state) params.state = state;
  return api.get('/analytics/women-candidates', { params });
};
export const getClosestContests = (year) => api.get('/analytics/closest-contests', { params: { year } });
export const getCorrelation = (state) => api.get('/analytics/correlation', { params: { state } });
export const getNationalVsRegionalVoteShare = () => api.get('/analytics/national-vs-regional');
export const getEducationCorrelation = () => api.get('/analytics/education-correlation');

export default api;


