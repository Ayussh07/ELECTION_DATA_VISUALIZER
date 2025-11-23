const { queryWithCheck } = require('../database/connection');
const { calculateCorrelation } = require('../database/sqlite-helpers');

// Get all available years
const getYears = async (req, res) => {
  const result = await queryWithCheck('SELECT DISTINCT year FROM elections ORDER BY year DESC');
  const years = result.rows.map(row => row.year);
  res.json(years);
};

// Get all states
const getStates = async (req, res) => {
  const result = await queryWithCheck('SELECT id, name FROM states ORDER BY name');
  res.json(result.rows);
};

// Get all parties
const getParties = async (req, res) => {
  const result = await queryWithCheck('SELECT id, name, party_type_tcpd FROM parties ORDER BY name');
  res.json(result.rows);
};

// Get election results with filters
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
    WHERE 1=1
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

// Get seat share by party for a year
const getSeatShare = async (req, res) => {
  const { year, state, party, gender } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
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
    WHERE e.year = $1 AND r.position = 1
  `;
  
  const params = [parseInt(year)];
  let paramCount = 2;
  
  if (state) {
    query += ` AND c.state_id = $${paramCount}`;
    params.push(parseInt(state));
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
  res.json(result.rows);
};

// Get turnout by state for a year
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
    WHERE e.year = $1 AND r.turnout_percentage IS NOT NULL
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

// Get vote share by party and state
const getVoteShare = async (req, res) => {
  const { year, party, aggregate } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  // If aggregate=true, return vote share by party only (for charts)
  if (aggregate === 'true' || aggregate === '1') {
    const { state: stateFilter, gender: genderFilter } = req.query;
    
    // Build WHERE clause
    let whereClause = `WHERE e.year = $1 AND r.votes IS NOT NULL`;
    const params = [parseInt(year)];
    let paramCount = 2;
    
    if (stateFilter) {
      whereClause += ` AND c.state_id = $${paramCount}`;
      params.push(parseInt(stateFilter));
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
    WHERE e.year = $1
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
     WHERE e.year = $1 AND r.votes IS NOT NULL`,
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
    WHERE e.year = $1 AND r.votes IS NOT NULL
    GROUP BY p.name
    ORDER BY total_votes DESC`,
    [totalVotes, parseInt(year)]
  );

  res.json(result.rows);
};

// Get gender representation trends
const getGenderTrend = async (req, res) => {
  const { party, state, gender } = req.query;
  
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
    WHERE cand.sex IS NOT NULL
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

// Get narrowest victories
const getMargins = async (req, res) => {
  const { year, state, limit = 10 } = req.query;
  
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
    WHERE r1.position = 1 AND r2.position = 2
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

  query += ` ORDER BY r1.margin_percentage ASC LIMIT $${paramCount}`;
  params.push(parseInt(limit));

  const result = await queryWithCheck(query, params);
  res.json(result.rows);
};

// Search candidates, constituencies, or parties
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

// Get key performance indicators
const getKPIs = async (req, res) => {
  const { year, state, gender } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  // Build WHERE clause for state and gender filter
  let whereClause = `WHERE e.year = $1`;
  const baseParams = [parseInt(year)];
  let paramCount = 2;
  
  if (state) {
    whereClause += ` AND c.state_id = $${paramCount}`;
    baseParams.push(parseInt(state));
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

// Analytics: Highest turnout state
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
    WHERE e.year = $1 AND r.turnout_percentage IS NOT NULL
    GROUP BY s.name
    ORDER BY avg_turnout DESC
    LIMIT 1`,
    [parseInt(year)]
  );

  res.json(result.rows[0] || null);
};

// Analytics: Seat changes between years
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
      WHERE e.year = $1 AND r.position = 1
      GROUP BY p.name
    ) y1
    LEFT JOIN (
      SELECT p.name as party, COUNT(*) as seats
      FROM results r
      JOIN elections e ON r.election_id = e.id
      JOIN parties p ON r.party_id = p.id
      WHERE e.year = $2 AND r.position = 1
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
      WHERE e.year = $2 AND r.position = 1
      GROUP BY p.name
    ) y2
    LEFT JOIN (
      SELECT p.name as party
      FROM results r
      JOIN elections e ON r.election_id = e.id
      JOIN parties p ON r.party_id = p.id
      WHERE e.year = $1 AND r.position = 1
      GROUP BY p.name
    ) y1 ON y2.party = y1.party
    WHERE y1.party IS NULL
    ORDER BY change DESC`,
    [parseInt(year1), parseInt(year2)]
  );

  res.json(result.rows);
};

// Analytics: Women candidates percentage
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
    WHERE cand.sex IS NOT NULL AND e.year >= 1991 AND e.year <= 2019
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

// Analytics: Closest contests
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
    WHERE r1.position = 1 AND r2.position = 2 AND r1.margin_percentage IS NOT NULL
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

// Analytics: Turnout-margin correlation
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

// Analytics: National vs Regional parties vote share over time
const getNationalVsRegionalVoteShare = async (req, res) => {
  // First, get total votes per year for all parties (filtered to 1991-2019)
  const totalVotesQuery = `
    SELECT 
      e.year,
      SUM(r.votes) as total_votes
    FROM results r
    JOIN elections e ON r.election_id = e.id
    WHERE r.votes IS NOT NULL AND e.year >= 1991 AND e.year <= 2019
    GROUP BY e.year
  `;
  
  const totalVotesResult = await queryWithCheck(totalVotesQuery);
  const yearTotals = {};
  totalVotesResult.rows.forEach(row => {
    yearTotals[row.year] = parseFloat(row.total_votes) || 0;
  });

  // Then get votes by party type (filtered to 1991-2019)
  const query = `
    SELECT 
      e.year,
      CASE 
        WHEN p.party_type_tcpd LIKE '%National%' OR UPPER(p.party_type_tcpd) LIKE '%NATIONAL%' THEN 'National'
        WHEN p.party_type_tcpd LIKE '%Regional%' OR UPPER(p.party_type_tcpd) LIKE '%REGIONAL%' THEN 'Regional'
        ELSE 'Other'
      END as party_type,
      SUM(r.votes) as total_votes
    FROM results r
    JOIN elections e ON r.election_id = e.id
    JOIN parties p ON r.party_id = p.id
    WHERE r.votes IS NOT NULL AND e.year >= 1991 AND e.year <= 2019
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

  res.json(rowsWithPercentage);
};

// Analytics: Education level correlation with winning chances
const getEducationCorrelation = async (req, res) => {
  // Get all candidates with education and position data (filtered to 1991-2019)
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
      AND r.position IS NOT NULL
      AND e.year >= 1991 AND e.year <= 2019
  `;

  const result = await queryWithCheck(query);
  
  // Group by education level
  const educationStats = {};
  result.rows.forEach(row => {
    const education = row.education || 'Unknown';
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
  const statsArray = Object.values(educationStats).map(stat => ({
    ...stat,
    win_rate: stat.total_candidates > 0 
      ? (stat.winners * 100.0 / stat.total_candidates) 
      : 0
  }));

  // Sort by win rate descending
  statsArray.sort((a, b) => b.win_rate - a.win_rate);

  res.json(statsArray);
};

module.exports = {
  getYears,
  getStates,
  getParties,
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

