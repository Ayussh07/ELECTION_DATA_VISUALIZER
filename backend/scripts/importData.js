const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../election_data.db');

function importCSV(filePath) {
  console.log('📖 Reading CSV file...');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    cast: (value, context) => {
      if (context.column === 'votes' || context.column === 'valid_votes' || 
          context.column === 'electors' || context.column === 'margin') {
        return value === '' ? null : parseFloat(value);
      }
      if (context.column === 'year' || context.column === 'month' || 
          context.column === 'poll_no' || context.column === 'delimid' ||
          context.column === 'position' || context.column === 'n_cand' ||
          context.column === 'assembly_no' || context.column === 'constituency_no') {
        return value === '' ? null : parseInt(value);
      }
      if (context.column === 'turnout_percentage' || context.column === 'vote_share_percentage' ||
          context.column === 'margin_percentage' || context.column === 'vote_share_pct' ||
          context.column === 'margin_pct' || context.column === 'enop' ||
          context.column === 'no_terms') {
        if (value === '' || value === 'inf' || value === 'Inf' || value === 'INF') return null;
        return parseFloat(value);
      }
      if (context.column === 'contested' || context.column === 'same_constituency' ||
          context.column === 'same_party' || context.column === 'turncoat' ||
          context.column === 'incumbent' || context.column === 'recontest') {
        return value === 'True' || value === 'true' || value === '1' ? 1 : 0;
      }
      return value === '' ? null : value;
    }
  });

  console.log(`📊 Processing ${records.length} records...\n`);

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  // Prepare statements
  const insertState = db.prepare('INSERT OR IGNORE INTO states (name) VALUES (?)');
  const getState = db.prepare('SELECT id FROM states WHERE name = ?');
  
  const insertParty = db.prepare('INSERT OR IGNORE INTO parties (name, party_type_tcpd, party_id) VALUES (?, ?, ?)');
  const getParty = db.prepare('SELECT id FROM parties WHERE name = ?');
  
  const insertConstituency = db.prepare(`
    INSERT OR IGNORE INTO constituencies (state_id, name, constituency_no, constituency_type, sub_region, assembly_no) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const getConstituency = db.prepare(`
    SELECT id FROM constituencies WHERE state_id = ? AND name = ? AND (constituency_no = ? OR (constituency_no IS NULL AND ? IS NULL))
  `);
  
  const insertElection = db.prepare('INSERT OR IGNORE INTO elections (year, month, poll_no, delimid, election_type) VALUES (?, ?, ?, ?, ?)');
  const getElection = db.prepare('SELECT id FROM elections WHERE year = ? AND (month = ? OR (month IS NULL AND ? IS NULL)) AND (poll_no = ? OR (poll_no IS NULL AND ? IS NULL)) AND (delimid = ? OR (delimid IS NULL AND ? IS NULL))');
  
  const insertCandidate = db.prepare(`
    INSERT OR IGNORE INTO candidates (name, sex, myneta_education, tcpd_prof_main, tcpd_prof_main_desc, tcpd_prof_second, tcpd_prof_second_desc, pid) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const getCandidate = db.prepare('SELECT id FROM candidates WHERE name = ?');
  
  const insertResult = db.prepare(`
    INSERT INTO results (
      election_id, constituency_id, candidate_id, party_id, position, votes, candidate_type,
      valid_votes, electors, n_cand, turnout_percentage, vote_share_percentage, vote_share_pct,
      deposit_lost, margin, margin_percentage, margin_pct, enop, last_poll, contested,
      last_party, last_party_id, last_constituency_name, same_constituency, same_party,
      no_terms, turncoat, incumbent, recontest
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Create lookup maps
  const stateMap = new Map();
  const partyMap = new Map();
  const constituencyMap = new Map();
  const electionMap = new Map();
  const candidateMap = new Map();

  // Start transaction
  const insertMany = db.transaction((records) => {
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Get or create state
      let stateId = stateMap.get(record.state_name);
      if (!stateId) {
        insertState.run(record.state_name);
        const stateRow = getState.get(record.state_name);
        if (stateRow) {
          stateId = stateRow.id;
          stateMap.set(record.state_name, stateId);
        }
      }

      // Get or create party
      let partyId = partyMap.get(record.party);
      if (!partyId && record.party) {
        insertParty.run(record.party, record.party_type_tcpd || null, record.party_id || null);
        const partyRow = getParty.get(record.party);
        if (partyRow) {
          partyId = partyRow.id;
          partyMap.set(record.party, partyId);
        }
      }

      // Get or create constituency
      const constituencyKey = `${stateId}-${record.constituency_name}-${record.constituency_no || ''}`;
      let constituencyId = constituencyMap.get(constituencyKey);
      if (!constituencyId) {
        insertConstituency.run(
          stateId, record.constituency_name, record.constituency_no || null,
          record.constituency_type || null, record.sub_region || null, record.assembly_no || null
        );
        const constRow = getConstituency.get(stateId, record.constituency_name, record.constituency_no || null, record.constituency_no || null);
        if (constRow) {
          constituencyId = constRow.id;
          constituencyMap.set(constituencyKey, constituencyId);
        }
      }

      // Get or create election
      const electionKey = `${record.year}-${record.month || ''}-${record.poll_no || ''}-${record.delimid || ''}`;
      let electionId = electionMap.get(electionKey);
      if (!electionId) {
        insertElection.run(
          record.year, record.month || null, record.poll_no || null,
          record.delimid || null, record.election_type || null
        );
        const elecRow = getElection.get(
          record.year, record.month || null, record.month || null,
          record.poll_no || null, record.poll_no || null,
          record.delimid || null, record.delimid || null
        );
        if (elecRow) {
          electionId = elecRow.id;
          electionMap.set(electionKey, electionId);
        }
      }

      // Get or create candidate
      let candidateId = candidateMap.get(record.candidate);
      if (!candidateId && record.candidate) {
        insertCandidate.run(
          record.candidate, record.sex || null, record.myneta_education || null,
          record.tcpd_prof_main || null, record.tcpd_prof_main_desc || null,
          record.tcpd_prof_second || null, record.tcpd_prof_second_desc || null,
          record.pid || null
        );
        const candRow = getCandidate.get(record.candidate);
        if (candRow) {
          candidateId = candRow.id;
          candidateMap.set(record.candidate, candidateId);
        }
      }

      // Insert result
      if (electionId && constituencyId && candidateId && partyId) {
        insertResult.run(
          electionId, constituencyId, candidateId, partyId,
          record.position || null, record.votes || null, record.candidate_type || null,
          record.valid_votes || null, record.electors || null, record.n_cand || null,
          record.turnout_percentage || null, record.vote_share_percentage || null, record.vote_share_pct || null,
          record.deposit_lost || null, record.margin || null, record.margin_percentage || null, record.margin_pct || null,
          record.enop || null, record.last_poll || null, record.contested ? 1 : 0,
          record.last_party || null, record.last_party_id || null, record.last_constituency_name || null,
          record.same_constituency ? 1 : 0, record.same_party ? 1 : 0,
          record.no_terms || null, record.turncoat ? 1 : 0, record.incumbent ? 1 : 0, record.recontest ? 1 : 0
        );
      }

      if ((i + 1) % 1000 === 0) {
        console.log(`   Processed ${i + 1}/${records.length} records...`);
      }
    }
  });

  try {
    insertMany(records);
    console.log(`\n✅ Data import completed successfully!`);
    console.log(`   Total records processed: ${records.length}`);
  } catch (error) {
    console.error('\n❌ Error importing data:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  const filePath = process.argv[2] || path.join(__dirname, '../../cleaned_election_data.csv');
  try {
    importCSV(filePath);
    console.log('\n🎉 Import finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n💥 Import failed:', err);
    process.exit(1);
  }
}

module.exports = importCSV;
