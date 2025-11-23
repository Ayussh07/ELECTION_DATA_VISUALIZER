-- ============================================================================
-- Indian Election Data Visualization - SQLite Database Schema
-- ============================================================================
-- 
-- This schema defines a normalized relational database structure for storing
-- and analyzing Indian Lok Sabha (Parliament) election data from 1991-2019.
-- 
-- Database Design Principles:
-- - Normalized structure to minimize data redundancy
-- - Foreign key constraints to maintain referential integrity
-- - Indexes on frequently queried columns for performance
-- - CASCADE deletes to maintain data consistency
--
-- Data Source: TCPD (Trivedi Centre for Political Data) and MyNeta datasets
-- ============================================================================

-- ============================================================================
-- States Table
-- ============================================================================
-- Stores information about Indian states and union territories.
-- Each state can have multiple constituencies (one-to-many relationship).
CREATE TABLE IF NOT EXISTS states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,           -- Unique identifier for each state
    name TEXT UNIQUE NOT NULL,                      -- State name (e.g., 'Maharashtra', 'Uttar Pradesh')
    created_at DATETIME DEFAULT (datetime('now'))   -- Timestamp when record was created
);

-- ============================================================================
-- Parties Table
-- ============================================================================
-- Stores information about political parties that participate in elections.
-- Each party can have multiple election results (one-to-many relationship).
CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,           -- Unique identifier for each party
    name TEXT UNIQUE NOT NULL,                      -- Party name (e.g., 'Bharatiya Janata Party', 'Indian National Congress')
    party_type_tcpd TEXT,                          -- Party classification: 'National', 'Regional', or 'State' (from TCPD)
    party_id TEXT,                                  -- External party identifier from TCPD dataset
    created_at DATETIME DEFAULT (datetime('now'))   -- Timestamp when record was created
);

-- ============================================================================
-- Constituencies Table
-- ============================================================================
-- Stores information about parliamentary constituencies (electoral districts).
-- Each constituency belongs to one state and can have multiple election results.
-- Constituencies are uniquely identified by the combination of state, name, and number.
CREATE TABLE IF NOT EXISTS constituencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,           -- Unique identifier for each constituency
    state_id INTEGER NOT NULL,                      -- Foreign key to states table
    name TEXT NOT NULL,                             -- Constituency name (e.g., 'Mumbai North', 'Varanasi')
    constituency_no INTEGER,                        -- Constituency number within the state
    constituency_type TEXT,                         -- Type: 'General', 'SC' (Scheduled Caste), 'ST' (Scheduled Tribe)
    sub_region TEXT,                                -- Sub-regional classification within the state
    assembly_no INTEGER,                            -- Assembly constituency number if applicable
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,  -- Cascade delete if state is deleted
    UNIQUE(state_id, name, constituency_no),        -- Ensure unique constituency per state
    created_at DATETIME DEFAULT (datetime('now'))   -- Timestamp when record was created
);

-- ============================================================================
-- Elections Table
-- ============================================================================
-- Stores information about individual election events (elections held in specific years).
-- Each election can have multiple results (one result per candidate per constituency).
-- Elections are uniquely identified by year, month, poll number, and delimitation ID.
CREATE TABLE IF NOT EXISTS elections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,           -- Unique identifier for each election
    year INTEGER NOT NULL,                          -- Election year (e.g., 2019, 2014, 2009)
    month INTEGER,                                  -- Month when election was held (1-12)
    poll_no INTEGER,                                -- Poll number for multi-phase elections
    delimid INTEGER,                                -- Delimitation ID (identifies constituency boundaries used)
    election_type TEXT,                             -- Type of election (typically 'Lok Sabha')
    created_at DATETIME DEFAULT (datetime('now')),  -- Timestamp when record was created
    UNIQUE(year, month, poll_no, delimid)           -- Ensure unique election per configuration
);

-- ============================================================================
-- Candidates Table
-- ============================================================================
-- Stores information about individual candidates who participated in elections.
-- Each candidate can participate in multiple elections (one-to-many relationship).
-- Contains demographic and professional information about candidates.
CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,           -- Unique identifier for each candidate
    name TEXT NOT NULL,                             -- Full name of the candidate
    sex TEXT,                                       -- Gender: 'M' (Male) or 'F' (Female)
    myneta_education TEXT,                          -- Educational qualification (from MyNeta dataset)
    tcpd_prof_main TEXT,                            -- Primary profession code (from TCPD dataset)
    tcpd_prof_main_desc TEXT,                       -- Description of primary profession
    tcpd_prof_second TEXT,                          -- Secondary profession code (from TCPD dataset)
    tcpd_prof_second_desc TEXT,                     -- Description of secondary profession
    pid TEXT,                                       -- Person identifier from external dataset
    created_at DATETIME DEFAULT (datetime('now'))   -- Timestamp when record was created
);

-- ============================================================================
-- Results Table (Main Fact Table)
-- ============================================================================
-- This is the central fact table that connects all dimensions (elections, 
-- constituencies, candidates, parties) and stores all vote counts and 
-- calculated metrics. Each row represents one candidate's result in one 
-- constituency in one election.
--
-- Key Metrics Stored:
-- - Vote counts and vote share percentages
-- - Voter turnout percentages
-- - Victory margins (absolute and percentage)
-- - Candidate position/ranking
-- - Historical context (previous elections, incumbency, party switches)
-- ============================================================================
CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Foreign Keys: Connect to dimension tables
    election_id INTEGER NOT NULL,                   -- Which election this result belongs to
    constituency_id INTEGER NOT NULL,               -- Which constituency this result is from
    candidate_id INTEGER NOT NULL,                  -- Which candidate received these votes
    party_id INTEGER NOT NULL,                     -- Which party the candidate represented
    
    -- Core Election Results
    position INTEGER,                              -- Ranking: 1 = winner, 2 = runner-up, etc.
    votes REAL,                                    -- Total votes received by candidate
    candidate_type TEXT,                           -- Type: 'INCUMBENT', 'CHALLENGER', etc.
    
    -- Constituency-Level Metrics
    valid_votes REAL,                              -- Total valid votes cast in constituency
    electors REAL,                                 -- Total registered voters (electors)
    n_cand INTEGER,                                -- Number of candidates who contested
    
    -- Calculated Percentages
    turnout_percentage REAL,                       -- Voter turnout: (valid_votes / electors) * 100
    vote_share_percentage REAL,                    -- Vote share: (votes / valid_votes) * 100
    vote_share_pct REAL,                           -- Alternative vote share field
    
    -- Victory Metrics
    deposit_lost TEXT,                            -- Whether candidate lost security deposit ('Yes'/'No')
    margin REAL,                                   -- Absolute margin: winner_votes - runner_up_votes
    margin_percentage REAL,                        -- Margin as %: (margin / valid_votes) * 100
    margin_pct REAL,                               -- Alternative margin percentage field
    
    -- Political Analysis Metrics
    enop REAL,                                     -- Effective Number of Parties (fragmentation measure)
    last_poll INTEGER,                             -- Year of previous election
    contested INTEGER,                              -- Number of times candidate has contested
    
    -- Historical Context (from previous election)
    last_party TEXT,                               -- Party candidate represented in previous election
    last_party_id TEXT,                            -- ID of previous party
    last_constituency_name TEXT,                   -- Constituency name from previous election
    same_constituency INTEGER,                     -- Flag: 1 if same constituency as previous, 0 otherwise
    same_party INTEGER,                            -- Flag: 1 if same party as previous, 0 otherwise
    no_terms REAL,                                 -- Number of terms candidate has served
    turncoat INTEGER,                               -- Flag: 1 if candidate switched parties, 0 otherwise
    incumbent INTEGER,                              -- Flag: 1 if candidate was sitting MP, 0 otherwise
    recontest INTEGER,                              -- Flag: 1 if candidate is recontesting, 0 otherwise
    
    created_at DATETIME DEFAULT (datetime('now')),  -- Timestamp when record was created
    
    -- Foreign Key Constraints (CASCADE ensures data consistency)
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (constituency_id) REFERENCES constituencies(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
);

-- ============================================================================
-- Performance Indexes
-- ============================================================================
-- Indexes are created on frequently queried columns to improve query performance.
-- They allow the database to quickly find rows without scanning entire tables.

-- Indexes on foreign keys (for JOIN operations)
CREATE INDEX IF NOT EXISTS idx_results_election_id ON results(election_id);
CREATE INDEX IF NOT EXISTS idx_results_constituency_id ON results(constituency_id);
CREATE INDEX IF NOT EXISTS idx_results_party_id ON results(party_id);
CREATE INDEX IF NOT EXISTS idx_results_candidate_id ON results(candidate_id);

-- Indexes on dimension table foreign keys
CREATE INDEX IF NOT EXISTS idx_elections_year ON elections(year);              -- Filter by election year
CREATE INDEX IF NOT EXISTS idx_constituencies_state_id ON constituencies(state_id);  -- Filter by state

-- Indexes on frequently filtered/sorted columns
CREATE INDEX IF NOT EXISTS idx_results_position ON results(position);           -- Find winners (position = 1)
CREATE INDEX IF NOT EXISTS idx_results_turnout ON results(turnout_percentage);   -- Sort by turnout
CREATE INDEX IF NOT EXISTS idx_results_vote_share ON results(vote_share_percentage);  -- Sort by vote share
CREATE INDEX IF NOT EXISTS idx_results_margin ON results(margin_percentage);     -- Find closest contests
