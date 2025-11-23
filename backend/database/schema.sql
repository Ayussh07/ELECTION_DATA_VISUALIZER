-- Indian Election Data Visualization - SQLite Schema
-- Normalized relational schema for election data

-- States table
CREATE TABLE IF NOT EXISTS states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Parties table
CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    party_type_tcpd TEXT,
    party_id TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Constituencies table
CREATE TABLE IF NOT EXISTS constituencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    constituency_no INTEGER,
    constituency_type TEXT,
    sub_region TEXT,
    assembly_no INTEGER,
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
    UNIQUE(state_id, name, constituency_no),
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Elections table
CREATE TABLE IF NOT EXISTS elections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER,
    poll_no INTEGER,
    delimid INTEGER,
    election_type TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    UNIQUE(year, month, poll_no, delimid)
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sex TEXT,
    myneta_education TEXT,
    tcpd_prof_main TEXT,
    tcpd_prof_main_desc TEXT,
    tcpd_prof_second TEXT,
    tcpd_prof_second_desc TEXT,
    pid TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Results table (main fact table)
CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    election_id INTEGER NOT NULL,
    constituency_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,
    party_id INTEGER NOT NULL,
    position INTEGER,
    votes REAL,
    candidate_type TEXT,
    valid_votes REAL,
    electors REAL,
    n_cand INTEGER,
    turnout_percentage REAL,
    vote_share_percentage REAL,
    vote_share_pct REAL,
    deposit_lost TEXT,
    margin REAL,
    margin_percentage REAL,
    margin_pct REAL,
    enop REAL,
    last_poll INTEGER,
    contested INTEGER,
    last_party TEXT,
    last_party_id TEXT,
    last_constituency_name TEXT,
    same_constituency INTEGER,
    same_party INTEGER,
    no_terms REAL,
    turncoat INTEGER,
    incumbent INTEGER,
    recontest INTEGER,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (constituency_id) REFERENCES constituencies(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_election_id ON results(election_id);
CREATE INDEX IF NOT EXISTS idx_results_constituency_id ON results(constituency_id);
CREATE INDEX IF NOT EXISTS idx_results_party_id ON results(party_id);
CREATE INDEX IF NOT EXISTS idx_results_candidate_id ON results(candidate_id);
CREATE INDEX IF NOT EXISTS idx_elections_year ON elections(year);
CREATE INDEX IF NOT EXISTS idx_constituencies_state_id ON constituencies(state_id);
CREATE INDEX IF NOT EXISTS idx_results_position ON results(position);
CREATE INDEX IF NOT EXISTS idx_results_turnout ON results(turnout_percentage);
CREATE INDEX IF NOT EXISTS idx_results_vote_share ON results(vote_share_percentage);
CREATE INDEX IF NOT EXISTS idx_results_margin ON results(margin_percentage);
