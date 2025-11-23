/**
 * Election Data Controller
 * 
 * This controller contains all the business logic for handling election data API requests.
 * It provides functions to query the database and return formatted JSON responses for:
 * - Basic data retrieval (years, states, parties, constituencies, elections)
 * - Analytics and aggregations (seat share, vote share, turnout)
 * - Trend analysis (gender trends, vote share over time)
 * - Advanced analytics (correlations, closest contests, education analysis)
 * 
 * All functions use the queryWithCheck helper which handles database connection
 * and converts PostgreSQL-style queries to SQLite syntax.
 */

const { queryWithCheck } = require('../database/connection');
const { calculateCorrelation } = require('../database/sqlite-helpers');

/**
 * SQL Filter for Valid Years
 * 
 * This filter ensures we only include election years that have sufficient data
 * (at least 1000 result records). This excludes incomplete or invalid years
 * from the dataset, ensuring data quality in all queries.
 */
const validYearsFilter = `AND e.year IN (
  SELECT e2.year
  FROM elections e2
  JOIN results r2 ON e2.id = r2.election_id
  WHERE e2.year IS NOT NULL
  GROUP BY e2.year
  HAVING COUNT(r2.id) >= 1000
)`;

/**
 * Get All Available Election Years
 * 
 * Returns a list of all election years that have sufficient data in the database.
 * Only includes years with at least 1000 result records to ensure data completeness.
 * 
 * @route GET /api/years
 * @returns {number[]} Array of election years (e.g., [2019, 2014, 2009, ...])
 */
const getYears = async (req, res) => {
  const result = await queryWithCheck(`
    SELECT e.year, COUNT(r.id) as record_count
    FROM elections e
    JOIN results r ON e.id = r.election_id
    WHERE e.year IS NOT NULL
    GROUP BY e.year
    HAVING COUNT(r.id) >= 1000
    ORDER BY e.year DESC
  `);
  const years = result.rows
    .map(row => row.year)
    .filter(year => year != null && !isNaN(year) && year > 0);
  res.json(years);
};

/**
 * Get All States
 * 
 * Returns a list of all Indian states and union territories in the database.
 * Used for populating state filter dropdowns in the frontend.
 * 
 * @route GET /api/states
 * @returns {Array<{id: number, name: string}>} Array of state objects
 */
const getStates = async (req, res) => {
  const result = await queryWithCheck('SELECT id, name FROM states ORDER BY name');
  res.json(result.rows);
};

/**
 * Get All Political Parties
 * 
 * Returns a list of all political parties that have participated in elections.
 * Includes party type classification (National/Regional) when available.
 * 
 * @route GET /api/parties
 * @returns {Array<{id: number, name: string, party_type_tcpd: string}>} Array of party objects
 */
const getParties = async (req, res) => {
  const result = await queryWithCheck('SELECT id, name, party_type_tcpd FROM parties ORDER BY name');
  res.json(result.rows);
};

/**
 * Get Constituencies by State (Grouped by Name)
 * 
 * Returns unique constituency names, optionally filtered by state.
 * Groups constituencies with the same name together (useful when multiple
 * constituencies share a name across different states or election years).
 * 
 * @route GET /api/constituencies
 * @param {number} [state] - Optional state ID to filter constituencies
 * @returns {Array<{id: number, name: string}>} Array of unique constituency names
 */
const getConstituencies = async (req, res) => {
  const { state } = req.query;
  
  // Get unique constituency names and pick the first ID for each name
  let query = `
    SELECT 
      MIN(c.id) as id,
      c.name
    FROM constituencies c
  `;
  const params = [];
  
  if (state) {
    query += ' WHERE c.state_id = $1';
    params.push(parseInt(state));
  }
  
  query += ' GROUP BY c.name ORDER BY c.name';
  
  const result = await queryWithCheck(query, params);
  res.json(result.rows);
};

/**
 * Get Individual Constituencies List
 * 
 * Returns all individual constituency records (not grouped by name).
 * Useful when you need to distinguish between constituencies with the same name
 * but different numbers or types. Can be filtered by state and/or district.
 * 
 * @route GET /api/constituencies-list
 * @param {number} [state] - Optional state ID to filter constituencies
 * @param {number} [district] - Optional district ID to filter constituencies
 * @returns {Array<{id: number, name: string, constituency_no: number, constituency_type: string}>} Array of constituency objects
 */
const getConstituenciesList = async (req, res) => {
  const { state, district } = req.query;
  
  let query = `
    SELECT 
      c.id,
      c.name,
      c.constituency_no,
      c.constituency_type
    FROM constituencies c
  `;
  const params = [];
  let paramCount = 1;
  let whereClause = '';
  
  if (state) {
    whereClause += ` WHERE c.state_id = $${paramCount}`;
    params.push(parseInt(state));
    paramCount++;
  }
  
  if (district) {
    // If district is provided, get the district name first
    const districtQuery = await queryWithCheck('SELECT name FROM constituencies WHERE id = $1', [parseInt(district)]);
    if (districtQuery.rows.length > 0) {
      const districtName = districtQuery.rows[0].name;
      if (whereClause) {
        whereClause += ` AND c.name = $${paramCount}`;
      } else {
        whereClause += ` WHERE c.name = $${paramCount}`;
      }
      params.push(districtName);
      paramCount++;
    }
  }
  
  query += whereClause + ' ORDER BY c.name, c.constituency_no';
  
  const result = await queryWithCheck(query, params);
  res.json(result.rows);
};

/**
 * Get Election Results with Filters
 * 
 * Returns detailed election results with support for multiple filters.
 * This is the main endpoint for querying election data. Results include
 * candidate information, vote counts, vote shares, turnout, and margins.
 * 
 * @route GET /api/elections
 * @param {number} [year] - Filter by election year
 * @param {number} [state] - Filter by state ID
 * @param {number} [party] - Filter by party ID
 * @param {string} [constituency] - Filter by constituency name (partial match)
 * @param {number} [limit=100] - Maximum number of results to return (pagination)
 * @param {number} [offset=0] - Number of results to skip (pagination)
 * @returns {Array} Array of election result objects with candidate, party, and vote information
 */
const getElections = async (req, res) => {
  const { year, state, party, constituency, limit = 100, offset = 0 } = req.query;
  
  let query = `
    SELECT 
      e.year,
      s.name as state_name,
      c.name as constituency_name,
      p.name as party_name,
      cand.name as candidate_name,
      cand.sex as gender,
      r.votes,
      r.vote_share_percentage,
      r.turnout_percentage,
      r.margin_percentage,
      r.position
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN constituencies c ON r.constituency_id = c.id
    JOIN states s ON c.state_id = s.id
    JOIN parties p ON r.party_id = p.id
    JOIN candidates cand ON r.candidate_id = cand.id
    WHERE 1=1 ${validYearsFilter}
  `;
  
  const params = [];
  let paramCount = 1;

  if (year) {
    query += ` AND e.year = $${paramCount}`;
    params.push(parseInt(year));
    paramCount++;
  }

  if (state) {
    query += ` AND s.id = $${paramCount}`;
    params.push(parseInt(state));
    paramCount++;
  }

  if (party) {
    query += ` AND p.id = $${paramCount}`;
    params.push(parseInt(party));
    paramCount++;
  }

  if (constituency) {
    query += ` AND c.name ILIKE $${paramCount}`;
    params.push(`%${constituency}%`);
    paramCount++;
  }

  query += ` ORDER BY e.year DESC, r.votes DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await queryWithCheck(query, params);
  res.json(result.rows);
};

/**
 * Get Seat Share by Party
 * 
 * Calculates the number of seats won by each party in a given election year.
 * Only counts winners (position = 1). Supports filtering by state, party, gender,
 * district, or specific constituency. Also includes winner names grouped by district.
 * 
 * @route GET /api/seat-share
 * @param {number} year - Election year (required)
 * @param {number} [state] - Optional state ID filter
 * @param {number} [party] - Optional party ID filter
 * @param {string} [gender] - Optional gender filter ('M' or 'F')
 * @param {number} [district] - Optional district ID filter
 * @param {number} [constituency] - Optional constituency ID filter
 * @returns {Array<{party: string, seats: number, winnersByDistrict: Array}>} Array of party seat counts with winner details
 */
const getSeatShare = async (req, res) => {
  const { year, state, party, gender, district, constituency } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  // If district is provided, get the district name first
  let districtName = null;
  if (district) {
    const districtQuery = await queryWithCheck('SELECT name FROM constituencies WHERE id = $1', [parseInt(district)]);
    if (districtQuery.rows.length > 0) {
      districtName = districtQuery.rows[0].name;
    }
  }

  let query = `
    SELECT 
      p.name as party,
      COUNT(*) as seats
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN parties p ON r.party_id = p.id
    JOIN constituencies c ON r.constituency_id = c.id
    JOIN candidates cand ON r.candidate_id = cand.id
    WHERE e.year = $1 ${validYearsFilter} AND r.position = 1
  `;
  
  const params = [parseInt(year)];
  let paramCount = 2;
  
  if (state) {
    query += ` AND c.state_id = $${paramCount}`;
    params.push(parseInt(state));
    paramCount++;
  }
  
  if (districtName) {
    // Filter by district name to include all constituencies with that name
    query += ` AND c.name = $${paramCount}`;
    params.push(districtName);
    paramCount++;
  }
  
  if (constituency) {
    // Filter by specific constituency ID
    query += ` AND c.id = $${paramCount}`;
    params.push(parseInt(constituency));
    paramCount++;
  }
  
  if (party) {
    query += ` AND p.id = $${paramCount}`;
    params.push(parseInt(party));
    paramCount++;
  }
  
  if (gender) {
    query += ` AND cand.sex = $${paramCount}`;
    params.push(gender);
    paramCount++;
  }

  query += ` GROUP BY p.name ORDER BY seats DESC`;

  const result = await queryWithCheck(query, params);
  
  // Get winner names grouped by district for each party
  const rowsWithWinners = await Promise.all(
    result.rows.map(async (row) => {
      let winnerQuery = `
        SELECT 
          c.id as constituency_id,
          c.name as district_name,
          c.constituency_no,
          cand.name as winner_name,
          cand.id as candidate_id
        FROM results r
        JOIN elections e ON r.election_id = e.id
        JOIN parties p ON r.party_id = p.id
        JOIN constituencies c ON r.constituency_id = c.id
        JOIN candidates cand ON r.candidate_id = cand.id
        WHERE e.year = $1 ${validYearsFilter} AND r.position = 1 AND p.name = $2
      `;
      const winnerParams = [parseInt(year), row.party];
      let winnerParamCount = 3;
      
      if (state) {
        winnerQuery += ` AND c.state_id = $${winnerParamCount}`;
        winnerParams.push(parseInt(state));
        winnerParamCount++;
      }
      
      if (districtName) {
        winnerQuery += ` AND c.name = $${winnerParamCount}`;
        winnerParams.push(districtName);
        winnerParamCount++;
      }
      
      if (constituency) {
        winnerQuery += ` AND c.id = $${winnerParamCount}`;
        winnerParams.push(parseInt(constituency));
        winnerParamCount++;
      }
      
      winnerQuery += ` ORDER BY c.name, c.constituency_no, cand.name`;
      
      const winnerResult = await queryWithCheck(winnerQuery, winnerParams);
      
      // Group winners by district name, but include all winners from all constituencies with that name
      // Use a Set with unique keys to avoid true duplicates (same constituency + same candidate)
      // but allow all winners from different constituencies even if they have the same name
      const districtMap = {};
      const seenWinners = new Set(); // Track unique constituency_id + candidate_id combinations
      
      winnerResult.rows.forEach(w => {
        const districtKey = w.district_name;
        const uniqueKey = `${w.constituency_id}_${w.candidate_id}`;
        
        // Only skip if we've seen this exact winner from this exact constituency
        if (seenWinners.has(uniqueKey)) {
          return;
        }
        seenWinners.add(uniqueKey);
        
        if (!districtMap[districtKey]) {
          districtMap[districtKey] = [];
        }
        
        // Add all winners - don't filter by name alone since different constituencies can have winners with same name
        districtMap[districtKey].push(w.winner_name);
      });
      
      // Format winners grouped by district - include all winners
      const winnersByDistrict = Object.keys(districtMap).map(districtName => ({
        district: districtName,
        winners: districtMap[districtName] // Already an array of names
      }));
      
      return {
        ...row,
        winnersByDistrict: winnersByDistrict
      };
    })
  );
  
  res.json(rowsWithWinners);
};

/**
 * Get Voter Turnout by State
 * 
 * Calculates the average voter turnout percentage for each state in a given election year.
 * Turnout is calculated as (valid_votes / electors) * 100. Results are sorted by
 * turnout percentage in descending order.
 * 
 * @route GET /api/turnout
 * @param {number} year - Election year (required)
 * @param {number} [state] - Optional state ID to filter to a single state
 * @returns {Array<{state: string, turnout_pct: number}>} Array of state turnout percentages
 */
const getTurnout = async (req, res) => {
  const { year, state } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  let query = `
    SELECT 
      s.name as state,
      AVG(r.turnout_percentage) as turnout_pct
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN constituencies c ON r.constituency_id = c.id
    JOIN states s ON c.state_id = s.id
    WHERE e.year = $1 ${validYearsFilter} AND r.turnout_percentage IS NOT NULL
  `;
  
  const params = [parseInt(year)];
  
  if (state) {
    query += ` AND s.id = $2`;
    params.push(parseInt(state));
  }
  
  query += ` GROUP BY s.name ORDER BY turnout_pct DESC`;

  const result = await queryWithCheck(query, params);
  res.json(result.rows);
};

/**
 * Get Vote Share by Party
 * 
 * Calculates the percentage of total votes received by each party in a given election year.
 * Can return aggregated results (by party only) or detailed results (by state and party).
 * Supports filtering by state, gender, district, and constituency.
 * 
 * @route GET /api/vote-share
 * @param {number} year - Election year (required)
 * @param {number} [party] - Optional party ID filter (only used when aggregate=false)
 * @param {boolean} [aggregate=true] - If true, returns vote share by party only. If false, returns by state and party.
 * @param {number} [state] - Optional state ID filter
 * @param {string} [gender] - Optional gender filter
 * @param {number} [district] - Optional district ID filter
 * @param {number} [constituency] - Optional constituency ID filter
 * @returns {Array} Array of vote share data (format depends on aggregate parameter)
 */
const getVoteShare = async (req, res) => {
  const { year, party, aggregate } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  // If aggregate=true, return vote share by party only (for charts)
  if (aggregate === 'true' || aggregate === '1') {
    const { state: stateFilter, gender: genderFilter, district: districtFilter, constituency: constituencyFilter } = req.query;
    
    // If district is provided, get the district name first
    let districtName = null;
    if (districtFilter) {
      const districtQuery = await queryWithCheck('SELECT name FROM constituencies WHERE id = $1', [parseInt(districtFilter)]);
      if (districtQuery.rows.length > 0) {
        districtName = districtQuery.rows[0].name;
      }
    }
    
    // Build WHERE clause
    let whereClause = `WHERE e.year = $1 ${validYearsFilter} AND r.votes IS NOT NULL`;
    const params = [parseInt(year)];
    let paramCount = 2;
    
    if (stateFilter) {
      whereClause += ` AND c.state_id = $${paramCount}`;
      params.push(parseInt(stateFilter));
      paramCount++;
    }
    
    if (districtName) {
      whereClause += ` AND c.name = $${paramCount}`;
      params.push(districtName);
      paramCount++;
    }
    
    if (constituencyFilter) {
      whereClause += ` AND c.id = $${paramCount}`;
      params.push(parseInt(constituencyFilter));
      paramCount++;
    }
    
    if (genderFilter) {
      whereClause += ` AND cand.sex = $${paramCount}`;
      params.push(genderFilter);
      paramCount++;
    }
    
    // Calculate total votes for the filtered year/state/gender
    const totalVotesQuery = `
      SELECT SUM(r.votes) as total_votes
      FROM results r
      JOIN elections e ON r.election_id = e.id
      JOIN constituencies c ON r.constituency_id = c.id
      JOIN candidates cand ON r.candidate_id = cand.id
      ${whereClause}
    `;
    
    const totalVotesResult = await queryWithCheck(totalVotesQuery, params);
    const totalVotes = totalVotesResult.rows[0]?.total_votes || 1;

    // Get vote share by party - calculate percentage in application code
    const resultQuery = `
      SELECT 
        p.name as party,
        SUM(r.votes) as total_votes
      FROM results r
      JOIN elections e ON r.election_id = e.id
      JOIN parties p ON r.party_id = p.id
      JOIN constituencies c ON r.constituency_id = c.id
      JOIN candidates cand ON r.candidate_id = cand.id
      ${whereClause}
      GROUP BY p.name
      ORDER BY total_votes DESC
    `;
    
    const result = await queryWithCheck(resultQuery, params);

    // Calculate vote share percentage
    const rowsWithPercentage = result.rows.map(row => ({
      party: row.party,
      total_votes: row.total_votes,
      vote_share_pct: (row.total_votes * 100.0 / totalVotes)
    }));

    res.json(rowsWithPercentage);
    return;
  }

  // Otherwise, return vote share by state and party
  let query = `
    SELECT 
      s.name as state,
      p.name as party,
      SUM(r.votes) as total_votes,
      AVG(r.vote_share_percentage) as avg_vote_share
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN constituencies c ON r.constituency_id = c.id
    JOIN states s ON c.state_id = s.id
    JOIN parties p ON r.party_id = p.id
    WHERE e.year = $1 ${validYearsFilter}
  `;
  
  const params = [parseInt(year)];
  
  if (party) {
    query += ` AND p.id = $2`;
    params.push(parseInt(party));
  }

  query += ` GROUP BY s.name, p.name ORDER BY s.name, total_votes DESC`;

  const result = await queryWithCheck(query, params);
  res.json(result.rows);
};

// Get vote share by party (aggregated, for charts)
const getVoteShareByParty = async (req, res) => {
  const { year } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  // Calculate total votes for the year first
  const totalVotesResult = await queryWithCheck(
    `SELECT SUM(r.votes) as total_votes
     FROM results r
     JOIN elections e ON r.election_id = e.id
     WHERE e.year = $1 ${validYearsFilter} AND r.votes IS NOT NULL`,
    [parseInt(year)]
  );
  
  const totalVotes = totalVotesResult.rows[0]?.total_votes || 1;

  // Get vote share by party
  const result = await queryWithCheck(
    `SELECT 
      p.name as party,
      SUM(r.votes) as total_votes,
      (SUM(r.votes) * 100.0 / ?) as vote_share_pct
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN parties p ON r.party_id = p.id
    WHERE e.year = $1 ${validYearsFilter} AND r.votes IS NOT NULL
    GROUP BY p.name
    ORDER BY total_votes DESC`,
    [totalVotes, parseInt(year)]
  );

  res.json(result.rows);
};

/**
 * Get Gender Representation Trends
 * 
 * Analyzes gender representation in elections over time. Returns the count and
 * percentage of candidates by gender for each election year. Supports filtering
 * by party, state, gender, and district to analyze specific subsets of data.
 * 
 * @route GET /api/gender-trend
 * @param {number} [party] - Optional party ID filter
 * @param {number} [state] - Optional state ID filter
 * @param {string} [gender] - Optional gender filter ('M' or 'F')
 * @param {number} [district] - Optional district ID filter
 * @returns {Array<{year: number, gender: string, count: number, percentage: number}>} Array of gender statistics by year
 */
const getGenderTrend = async (req, res) => {
  const { party, state, gender, district } = req.query;
  
  // First get counts by year and gender
  let query = `
    SELECT 
      e.year,
      cand.sex as gender,
      COUNT(*) as count
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN candidates cand ON r.candidate_id = cand.id
    JOIN constituencies c ON r.constituency_id = c.id
    JOIN states s ON c.state_id = s.id
    JOIN parties p ON r.party_id = p.id
    WHERE cand.sex IS NOT NULL ${validYearsFilter}
  `;
  
  const params = [];
  let paramCount = 1;

  if (party) {
    query += ` AND p.id = $${paramCount}`;
    params.push(parseInt(party));
    paramCount++;
  }

  if (state) {
    query += ` AND s.id = $${paramCount}`;
    params.push(parseInt(state));
    paramCount++;
  }
  
  if (district) {
    // Filter by district name (since we group by name in the dropdown)
    // First get the district name from the ID
    const districtQuery = await queryWithCheck('SELECT name FROM constituencies WHERE id = $1', [parseInt(district)]);
    if (districtQuery.rows.length > 0) {
      const districtName = districtQuery.rows[0].name;
      query += ` AND c.name = $${paramCount}`;
      params.push(districtName);
      paramCount++;
    }
  }
  
  if (gender) {
    query += ` AND cand.sex = $${paramCount}`;
    params.push(gender);
    paramCount++;
  }

  query += ` GROUP BY e.year, cand.sex ORDER BY e.year, cand.sex`;

  const result = await queryWithCheck(query, params);
  
  // Calculate percentages manually (SQLite doesn't support window functions well)
  const yearTotals = {};
  result.rows.forEach(row => {
    if (!yearTotals[row.year]) {
      yearTotals[row.year] = 0;
    }
    yearTotals[row.year] += row.count;
  });
  
  // Add percentage to each row
  const rowsWithPercentage = result.rows.map(row => ({
    year: row.year,
    gender: row.gender,
    count: row.count,
    percentage: yearTotals[row.year] > 0 ? (row.count * 100.0 / yearTotals[row.year]) : 0
  }));
  
  res.json(rowsWithPercentage);
};

/**
 * Get Narrowest Victories (Closest Contests)
 * 
 * Returns the closest election contests (smallest victory margins) for analysis.
 * Shows winner and runner-up information along with vote margins. Useful for
 * identifying competitive constituencies and analyzing election dynamics.
 * 
 * @route GET /api/margins
 * @param {number} [year] - Optional election year filter
 * @param {number} [state] - Optional state ID filter
 * @param {number} [limit=10] - Maximum number of results to return
 * @param {number} [district] - Optional district ID filter
 * @param {number} [constituency] - Optional constituency ID filter
 * @returns {Array<{year, state_name, constituency_name, winner_party, winner, winner_votes, runner_up_party, runner_up, runner_up_votes, margin, margin_percentage}>} Array of closest contest details
 */
const getMargins = async (req, res) => {
  const { year, state, limit = 10, district, constituency } = req.query;
  
  // If district is provided, get the district name first
  let districtName = null;
  if (district) {
    const districtQuery = await queryWithCheck('SELECT name FROM constituencies WHERE id = $1', [parseInt(district)]);
    if (districtQuery.rows.length > 0) {
      districtName = districtQuery.rows[0].name;
    }
  }
  
  let query = `
    SELECT 
      e.year,
      s.name as state_name,
      c.name as constituency_name,
      p1.name as winner_party,
      cand1.name as winner,
      r1.votes as winner_votes,
      p2.name as runner_up_party,
      cand2.name as runner_up,
      r2.votes as runner_up_votes,
      (r1.votes - r2.votes) as margin,
      r1.margin_percentage
    FROM results r1
    JOIN elections e ON r1.election_id = e.id
    JOIN constituencies c ON r1.constituency_id = c.id
    JOIN states s ON c.state_id = s.id
    JOIN parties p1 ON r1.party_id = p1.id
    JOIN candidates cand1 ON r1.candidate_id = cand1.id
    JOIN results r2 ON r1.constituency_id = r2.constituency_id AND r1.election_id = r2.election_id
    JOIN parties p2 ON r2.party_id = p2.id
    JOIN candidates cand2 ON r2.candidate_id = cand2.id
    WHERE r1.position = 1 AND r2.position = 2 ${validYearsFilter}
  `;
  
  const params = [];
  let paramCount = 1;

  if (year) {
    query += ` AND e.year = $${paramCount}`;
    params.push(parseInt(year));
    paramCount++;
  }

  if (state) {
    query += ` AND s.id = $${paramCount}`;
    params.push(parseInt(state));
    paramCount++;
  }
  
  if (districtName) {
    query += ` AND c.name = $${paramCount}`;
    params.push(districtName);
    paramCount++;
  }
  
  if (constituency) {
    query += ` AND c.id = $${paramCount}`;
    params.push(parseInt(constituency));
    paramCount++;
  }
  
  query += ` ORDER BY r1.margin_percentage ASC LIMIT $${paramCount}`;
  params.push(parseInt(limit));

  const result = await queryWithCheck(query, params);
  res.json(result.rows);
};

/**
 * Search Candidates, Constituencies, or Parties
 * 
 * Provides a unified search endpoint that can search across candidates,
 * constituencies, and parties. Uses case-insensitive partial matching.
 * Useful for implementing autocomplete or search functionality in the frontend.
 * 
 * @route GET /api/search
 * @param {string} q - Search query string (required)
 * @param {string} [type='all'] - Type of search: 'candidate', 'constituency', 'party', or 'all'
 * @returns {Object} Object containing search results for each requested type
 */
const search = async (req, res) => {
  const { q, type = 'all' } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const results = {};

  if (type === 'all' || type === 'candidate') {
    const candidateResult = await queryWithCheck(
      `SELECT DISTINCT name, sex FROM candidates WHERE name ILIKE $1 LIMIT 20`,
      [`%${q}%`]
    );
    results.candidates = candidateResult.rows;
  }

  if (type === 'all' || type === 'constituency') {
    const constituencyResult = await queryWithCheck(
      `SELECT DISTINCT c.name, s.name as state_name 
       FROM constituencies c
       JOIN states s ON c.state_id = s.id
       WHERE c.name ILIKE $1 LIMIT 20`,
      [`%${q}%`]
    );
    results.constituencies = constituencyResult.rows;
  }

  if (type === 'all' || type === 'party') {
    const partyResult = await queryWithCheck(
      `SELECT id, name FROM parties WHERE name ILIKE $1 LIMIT 20`,
      [`%${q}%`]
    );
    results.parties = partyResult.rows;
  }

  res.json(results);
};

/**
 * Get Key Performance Indicators (KPIs)
 * 
 * Calculates high-level statistics for a given election year:
 * - Total seats contested
 * - Overall voter turnout percentage
 * - Percentage of women candidates
 * 
 * Supports filtering by state, gender, district, and constituency to get
 * KPIs for specific subsets of data.
 * 
 * @route GET /api/kpis
 * @param {number} year - Election year (required)
 * @param {number} [state] - Optional state ID filter
 * @param {string} [gender] - Optional gender filter
 * @param {number} [district] - Optional district ID filter
 * @param {number} [constituency] - Optional constituency ID filter
 * @returns {Object<{total_seats: number, overall_turnout: number, women_candidates_pct: number}>} KPI metrics object
 */
const getKPIs = async (req, res) => {
  const { year, state, gender, district, constituency } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  // If district is provided, get the district name first
  let districtName = null;
  if (district) {
    const districtQuery = await queryWithCheck('SELECT name FROM constituencies WHERE id = $1', [parseInt(district)]);
    if (districtQuery.rows.length > 0) {
      districtName = districtQuery.rows[0].name;
    }
  }

  // Build WHERE clause for state and gender filter
  let whereClause = `WHERE e.year = $1 ${validYearsFilter}`;
  const baseParams = [parseInt(year)];
  let paramCount = 2;
  
  if (state) {
    whereClause += ` AND c.state_id = $${paramCount}`;
    baseParams.push(parseInt(state));
    paramCount++;
  }
  
  if (districtName) {
    whereClause += ` AND c.name = $${paramCount}`;
    baseParams.push(districtName);
    paramCount++;
  }
  
  if (constituency) {
    whereClause += ` AND c.id = $${paramCount}`;
    baseParams.push(parseInt(constituency));
    paramCount++;
  }
  
  if (gender) {
    whereClause += ` AND cand.sex = $${paramCount}`;
    baseParams.push(gender);
    paramCount++;
  }

  const kpis = await Promise.all([
    // Total seats
    queryWithCheck(
      `SELECT COUNT(DISTINCT c.id) as total_seats
       FROM results r
       JOIN elections e ON r.election_id = e.id
       JOIN constituencies c ON r.constituency_id = c.id
       JOIN candidates cand ON r.candidate_id = cand.id
       ${whereClause} AND r.position = 1`,
      baseParams
    ),
    // Overall turnout
    queryWithCheck(
      `SELECT AVG(r.turnout_percentage) as overall_turnout
       FROM results r
       JOIN elections e ON r.election_id = e.id
       JOIN constituencies c ON r.constituency_id = c.id
       JOIN candidates cand ON r.candidate_id = cand.id
       ${whereClause} AND r.turnout_percentage IS NOT NULL`,
      baseParams
    ),
    // Women candidates percentage
    queryWithCheck(
      `SELECT 
        SUM(CASE WHEN cand.sex = 'F' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as women_pct
       FROM results r
       JOIN elections e ON r.election_id = e.id
       JOIN candidates cand ON r.candidate_id = cand.id
       JOIN constituencies c ON r.constituency_id = c.id
       ${whereClause} AND cand.sex IS NOT NULL`,
      baseParams
    )
  ]);

  res.json({
    total_seats: parseInt(kpis[0].rows[0]?.total_seats || 0),
    overall_turnout: parseFloat(kpis[1].rows[0]?.overall_turnout || 0),
    women_candidates_pct: parseFloat(kpis[2].rows[0]?.women_pct || 0)
  });
};

/**
 * Analytics: Get State with Highest Turnout
 * 
 * Identifies the state with the highest average voter turnout for a given election year.
 * Useful for understanding regional voting patterns and civic engagement.
 * 
 * @route GET /api/analytics/highest-turnout
 * @param {number} year - Election year (required)
 * @returns {Object<{state: string, avg_turnout: number}>} State with highest turnout
 */
const getHighestTurnout = async (req, res) => {
  const { year } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  const result = await queryWithCheck(
    `SELECT 
      s.name as state,
      AVG(r.turnout_percentage) as avg_turnout
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN constituencies c ON r.constituency_id = c.id
    JOIN states s ON c.state_id = s.id
    WHERE e.year = $1 ${validYearsFilter} AND r.turnout_percentage IS NOT NULL
    GROUP BY s.name
    ORDER BY avg_turnout DESC
    LIMIT 1`,
    [parseInt(year)]
  );

  res.json(result.rows[0] || null);
};

/**
 * Analytics: Get Seat Changes Between Two Election Years
 * 
 * Compares seat counts for each party between two election years and calculates
 * the change (gain or loss). Shows which parties gained or lost seats over time.
 * Useful for analyzing political shifts and party performance trends.
 * 
 * @route GET /api/analytics/seat-changes
 * @param {number} year1 - First election year (required)
 * @param {number} year2 - Second election year (required)
 * @returns {Array<{party: string, year1_seats: number, year2_seats: number, change: number}>} Array of party seat changes
 */
const getSeatChanges = async (req, res) => {
  const { year1, year2 } = req.query;
  if (!year1 || !year2) {
    return res.status(400).json({ error: 'Both year1 and year2 parameters are required' });
  }

  // SQLite doesn't support FULL OUTER JOIN, use UNION of LEFT JOINs
  const result = await queryWithCheck(
    `SELECT 
      COALESCE(y1.party, y2.party) as party,
      COALESCE(y1.seats, 0) as year1_seats,
      COALESCE(y2.seats, 0) as year2_seats,
      COALESCE(y2.seats, 0) - COALESCE(y1.seats, 0) as change
    FROM (
      SELECT p.name as party, COUNT(*) as seats
      FROM results r
      JOIN elections e ON r.election_id = e.id
      JOIN parties p ON r.party_id = p.id
      WHERE e.year = $1 ${validYearsFilter} AND r.position = 1
      GROUP BY p.name
    ) y1
    LEFT JOIN (
      SELECT p.name as party, COUNT(*) as seats
      FROM results r
      JOIN elections e ON r.election_id = e.id
      JOIN parties p ON r.party_id = p.id
      WHERE e.year = $2 ${validYearsFilter} AND r.position = 1
      GROUP BY p.name
    ) y2 ON y1.party = y2.party
    UNION
    SELECT 
      y2.party,
      0 as year1_seats,
      y2.seats as year2_seats,
      y2.seats as change
    FROM (
      SELECT p.name as party, COUNT(*) as seats
      FROM results r
      JOIN elections e ON r.election_id = e.id
      JOIN parties p ON r.party_id = p.id
      WHERE e.year = $2 ${validYearsFilter} AND r.position = 1
      GROUP BY p.name
    ) y2
    LEFT JOIN (
      SELECT p.name as party
      FROM results r
      JOIN elections e ON r.election_id = e.id
      JOIN parties p ON r.party_id = p.id
      WHERE e.year = $1 ${validYearsFilter} AND r.position = 1
      GROUP BY p.name
    ) y1 ON y2.party = y1.party
    WHERE y1.party IS NULL
    ORDER BY change DESC`,
    [parseInt(year1), parseInt(year2)]
  );

  res.json(result.rows);
};

/**
 * Analytics: Women Candidates Percentage
 * 
 * Analyzes the percentage of women candidates over time, optionally filtered by state.
 * Returns year-by-year statistics showing gender representation trends in candidate pools.
 * 
 * @route GET /api/analytics/women-candidates
 * @param {number} [year] - Optional election year filter
 * @param {number} [state] - Optional state ID filter
 * @returns {Array<{year: number, state: string, women_count: number, total_count: number, percentage: number}>} Array of women candidate statistics
 */
const getWomenCandidates = async (req, res) => {
  const { year, state } = req.query;
  
  let query = `
    SELECT 
      e.year,
      s.name as state,
      SUM(CASE WHEN cand.sex = 'F' THEN 1 ELSE 0 END) as women_count,
      COUNT(*) as total_count,
      SUM(CASE WHEN cand.sex = 'F' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as percentage
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN candidates cand ON r.candidate_id = cand.id
    JOIN constituencies c ON r.constituency_id = c.id
    JOIN states s ON c.state_id = s.id
    WHERE cand.sex IS NOT NULL ${validYearsFilter}
  `;
  
  const params = [];
  let paramCount = 1;

  if (year) {
    query += ` AND e.year = $${paramCount}`;
    params.push(parseInt(year));
    paramCount++;
  }

  if (state) {
    query += ` AND s.id = $${paramCount}`;
    params.push(parseInt(state));
    paramCount++;
  }

  query += ` GROUP BY e.year, s.name ORDER BY e.year, s.name`;

  const result = await queryWithCheck(query, params);
  res.json(result.rows);
};

/**
 * Analytics: Get Closest Election Contests
 * 
 * Returns the 10 closest election contests (smallest victory margins) for a given year.
 * Similar to getMargins but specifically for analytics, showing the most competitive races.
 * 
 * @route GET /api/analytics/closest-contests
 * @param {number} [year] - Optional election year filter
 * @returns {Array} Array of closest contest details with winner and runner-up information
 */
const getClosestContests = async (req, res) => {
  const { year } = req.query;
  
  let query = `
    SELECT 
      e.year,
      s.name as state_name,
      c.name as constituency_name,
      p1.name as winner_party,
      cand1.name as winner,
      r1.votes as winner_votes,
      p2.name as runner_up_party,
      cand2.name as runner_up,
      r2.votes as runner_up_votes,
      (r1.votes - r2.votes) as margin,
      r1.margin_percentage
    FROM results r1
    JOIN elections e ON r1.election_id = e.id
    JOIN constituencies c ON r1.constituency_id = c.id
    JOIN states s ON c.state_id = s.id
    JOIN parties p1 ON r1.party_id = p1.id
    JOIN candidates cand1 ON r1.candidate_id = cand1.id
    JOIN results r2 ON r1.constituency_id = r2.constituency_id AND r1.election_id = r2.election_id
    JOIN parties p2 ON r2.party_id = p2.id
    JOIN candidates cand2 ON r2.candidate_id = cand2.id
    WHERE r1.position = 1 AND r2.position = 2 AND r1.margin_percentage IS NOT NULL ${validYearsFilter}
  `;
  
  const params = [];
  let paramCount = 1;

  if (year) {
    query += ` AND e.year = $${paramCount}`;
    params.push(parseInt(year));
    paramCount++;
  }

  query += ` ORDER BY r1.margin_percentage ASC LIMIT 10`;

  const result = await queryWithCheck(query, params);
  res.json(result.rows);
};

/**
 * Analytics: Turnout-Margin Correlation
 * 
 * Calculates the correlation between voter turnout and victory margins for each state.
 * Uses Pearson correlation coefficient to measure the relationship. Higher correlation
 * suggests that higher turnout is associated with larger victory margins (or vice versa).
 * 
 * @route GET /api/analytics/correlation
 * @param {number} [state] - Optional state ID filter (if not provided, returns all states)
 * @returns {Array<{state: string, avg_turnout: number, avg_margin: number, data_points: number, correlation: number}>} Array of correlation statistics by state
 */
const getCorrelation = async (req, res) => {
  const { state } = req.query;
  
  let query = `
    SELECT 
      s.name as state,
      AVG(r.turnout_percentage) as avg_turnout,
      AVG(r.margin_percentage) as avg_margin,
      COUNT(*) as data_points
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN constituencies c ON r.constituency_id = c.id
    JOIN states s ON c.state_id = s.id
    WHERE r.turnout_percentage IS NOT NULL AND r.margin_percentage IS NOT NULL
  `;
  
  const params = [];
  let paramCount = 1;

  if (state) {
    query += ` AND s.id = $${paramCount}`;
    params.push(parseInt(state));
    paramCount++;
  }

  query += ` GROUP BY s.name ORDER BY s.name`;

  const result = await queryWithCheck(query, params);
  
  // Calculate Pearson correlation for each state (SQLite doesn't have CORR function)
  const correlations = await Promise.all(
    result.rows.map(async (row) => {
      const corrQuery = `
        SELECT 
          r.turnout_percentage,
          r.margin_percentage
        FROM results r
        JOIN elections e ON r.election_id = e.id
        JOIN constituencies c ON r.constituency_id = c.id
        JOIN states s ON c.state_id = s.id
        WHERE s.name = $1 AND r.turnout_percentage IS NOT NULL AND r.margin_percentage IS NOT NULL
      `;
      const corrResult = await queryWithCheck(corrQuery, [row.state]);
      const xValues = corrResult.rows.map(r => r.turnout_percentage);
      const yValues = corrResult.rows.map(r => r.margin_percentage);
      const correlation = calculateCorrelation(xValues, yValues);
      return {
        ...row,
        correlation: correlation
      };
    })
  );

  res.json(correlations);
};

/**
 * Analytics: National vs Regional Parties Vote Share Over Time
 * 
 * Analyzes the vote share trends of National parties versus Regional parties over time.
 * Classifies parties based on their party_type_tcpd field and calculates vote share
 * percentages for each category across all election years.
 * 
 * @route GET /api/analytics/national-vs-regional
 * @returns {Array<{year: number, party_type: string, total_votes: number, vote_share_pct: number}>} Array of vote share by party type over time
 */
const getNationalVsRegionalVoteShare = async (req, res) => {
  // First, get total votes per year for all parties
  const totalVotesQuery = `
    SELECT 
      e.year,
      SUM(r.votes) as total_votes
    FROM results r
    JOIN elections e ON r.election_id = e.id
    WHERE r.votes IS NOT NULL AND r.votes > 0 ${validYearsFilter}
    GROUP BY e.year
  `;
  
  const totalVotesResult = await queryWithCheck(totalVotesQuery);
  const yearTotals = {};
  totalVotesResult.rows.forEach(row => {
    yearTotals[row.year] = parseFloat(row.total_votes) || 0;
  });

  // Then get votes by party type - only include parties with valid party_type_tcpd
  const query = `
    SELECT 
      e.year,
      CASE 
        WHEN p.party_type_tcpd IS NOT NULL AND (p.party_type_tcpd LIKE '%National%' OR UPPER(p.party_type_tcpd) LIKE '%NATIONAL%') THEN 'National'
        WHEN p.party_type_tcpd IS NOT NULL AND (p.party_type_tcpd LIKE '%Regional%' OR UPPER(p.party_type_tcpd) LIKE '%REGIONAL%') THEN 'Regional'
        ELSE 'Other'
      END as party_type,
      SUM(r.votes) as total_votes
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN parties p ON r.party_id = p.id
    WHERE r.votes IS NOT NULL AND r.votes > 0 ${validYearsFilter}
    GROUP BY e.year, party_type
    ORDER BY e.year, party_type
  `;

  const result = await queryWithCheck(query);
  
  // Calculate vote share percentage for each year
  const rowsWithPercentage = result.rows.map(row => ({
    year: row.year,
    party_type: row.party_type,
    total_votes: parseFloat(row.total_votes) || 0,
    vote_share_pct: yearTotals[row.year] > 0 
      ? ((parseFloat(row.total_votes) || 0) * 100.0 / yearTotals[row.year]) 
      : 0
  }));

  // Debug logging
  if (rowsWithPercentage.length === 0) {
    console.log('⚠️  getNationalVsRegionalVoteShare: No data returned');
    console.log('   Total votes query returned:', totalVotesResult.rows.length, 'years');
    console.log('   Party type query returned:', result.rows.length, 'rows');
  }

  res.json(rowsWithPercentage);
};

/**
 * Analytics: Education Level Correlation with Winning Chances
 * 
 * Analyzes the relationship between candidate education levels and their likelihood
 * of winning elections. Calculates win rates (percentage of candidates who won)
 * for each education level. Sorted by win rate to show which education levels
 * are most associated with electoral success.
 * 
 * @route GET /api/analytics/education-correlation
 * @returns {Array<{education: string, total_candidates: number, winners: number, win_rate: number}>} Array of education level statistics sorted by win rate
 */
const getEducationCorrelation = async (req, res) => {
  // Get all candidates with education and position data
  const query = `
    SELECT 
      cand.myneta_education as education,
      r.position,
      CASE WHEN r.position = 1 THEN 1 ELSE 0 END as won
    FROM results r
    JOIN candidates cand ON r.candidate_id = cand.id
    JOIN elections e ON r.election_id = e.id
    WHERE cand.myneta_education IS NOT NULL 
      AND cand.myneta_education != ''
      AND TRIM(cand.myneta_education) != ''
      AND r.position IS NOT NULL
      ${validYearsFilter}
  `;

  const result = await queryWithCheck(query);
  
  // Group by education level
  const educationStats = {};
  result.rows.forEach(row => {
    const education = (row.education || 'Unknown').trim();
    if (!education || education === '') return; // Skip empty education
    
    if (!educationStats[education]) {
      educationStats[education] = {
        education: education,
        total_candidates: 0,
        winners: 0,
        win_rate: 0
      };
    }
    educationStats[education].total_candidates++;
    if (row.won === 1) {
      educationStats[education].winners++;
    }
  });

  // Calculate win rates
  const statsArray = Object.values(educationStats)
    .filter(stat => stat.total_candidates > 0) // Only include education levels with candidates
    .map(stat => ({
      ...stat,
      win_rate: stat.total_candidates > 0 
        ? (stat.winners * 100.0 / stat.total_candidates) 
        : 0
    }));

  // Sort by win rate descending
  statsArray.sort((a, b) => b.win_rate - a.win_rate);

  // Debug logging
  if (statsArray.length === 0) {
    console.log('⚠️  getEducationCorrelation: No data returned');
    console.log('   Query returned:', result.rows.length, 'rows');
  } else {
    console.log(`✅ getEducationCorrelation: Found ${statsArray.length} education levels`);
  }

  res.json(statsArray);
};

module.exports = {
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
};

