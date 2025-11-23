const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../election_data.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let isConnected = false;

function connect() {
  try {
    console.log('\n🔍 Database Connection Diagnostics:');
    console.log('   Database Type: SQLite (file-based, no server required)');
    console.log(`   Database Path: ${dbPath}`);
    console.log('');

    // Create database file if it doesn't exist
    if (!fs.existsSync(dbPath)) {
      console.log('📝 Database file does not exist. Creating...');
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    // Open database with timeout to prevent hanging
    db = new Database(dbPath, { 
      verbose: null,
      timeout: 5000 // 5 second timeout
    });
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Check if tables exist, if not, initialize schema
    const tablesCheck = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='states'
    `).get();
    
    if (!tablesCheck) {
      console.log('📋 Tables not found. Initializing schema...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      console.log(`   Looking for schema at: ${schemaPath}`);
      if (fs.existsSync(schemaPath)) {
        console.log('   ✅ Schema file found');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        
        // Better SQL parsing - handle multi-line statements
        const lines = schema.split('\n');
        let currentStatement = '';
        const statements = [];

        for (const line of lines) {
          // Remove comments
          let cleanLine = line;
          const commentIndex = line.indexOf('--');
          if (commentIndex >= 0) {
            cleanLine = line.substring(0, commentIndex);
          }
          
          // Skip empty lines
          if (cleanLine.trim().length === 0) {
            continue;
          }
          
          currentStatement += cleanLine + '\n';
          
          // If line ends with semicolon, we have a complete statement
          if (cleanLine.trim().endsWith(';')) {
            const stmt = currentStatement.trim();
            if (stmt.length > 0 && !stmt.startsWith('--')) {
              statements.push(stmt);
            }
            currentStatement = '';
          }
        }

        // Separate tables and indexes
        const tableStatements = [];
        const indexStatements = [];

        statements.forEach(stmt => {
          const upper = stmt.toUpperCase().trim();
          if (upper.startsWith('CREATE TABLE')) {
            tableStatements.push(stmt);
          } else if (upper.startsWith('CREATE INDEX')) {
            indexStatements.push(stmt);
          }
        });

        console.log(`   Found ${statements.length} SQL statements (${tableStatements.length} tables, ${indexStatements.length} indexes)`);

        // Create tables first
        let tableCount = 0;
        for (const stmt of tableStatements) {
          try {
            db.exec(stmt);
            tableCount++;
          } catch (err) {
            if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
              console.error(`   ❌ Error creating table: ${err.message}`);
              console.error(`   Statement: ${stmt.substring(0, 100)}...`);
            }
          }
        }

        // Then create indexes
        let indexCount = 0;
        for (const stmt of indexStatements) {
          try {
            db.exec(stmt);
            indexCount++;
          } catch (err) {
            if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
              // Silently ignore if table doesn't exist (shouldn't happen, but just in case)
              if (!err.message.includes('no such table')) {
                console.error(`   ❌ Error creating index: ${err.message}`);
              }
            }
          }
        }

        if (tableCount === 0 && indexCount === 0) {
          console.error(`   ⚠️  Warning: No tables or indexes were created!`);
          console.error(`   This might indicate a parsing issue. Check the schema file.`);
        } else {
          console.log(`✅ Schema initialized! (${tableCount} tables, ${indexCount} indexes)`);
        }
      } else {
        console.error(`   ❌ Schema file not found at: ${schemaPath}`);
        console.error('   Please ensure schema.sql exists in the database directory');
      }
    } else {
      // Verify tables actually exist
      const allTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
      console.log(`✅ Database already initialized (${allTables.length} tables found)`);
    }
    
    // Test connection
    const result = db.prepare("SELECT datetime('now') as current_time, sqlite_version() as version").get();
    
    isConnected = true;
    console.log('✅ Database connected successfully!');
    console.log(`   SQLite version: ${result.version}`);
    console.log(`   Server time: ${result.current_time}`);
    console.log('');
    
    return true;
  } catch (error) {
    console.error('\n❌ Database connection error:', error.message);
    console.error('\n📋 Troubleshooting steps:');
    console.error('1. Check if the database directory is writable');
    console.error(`2. Database path: ${dbPath}`);
    console.error('3. Ensure you have write permissions to the directory');
    console.error('4. If database is locked, stop the server and run: npm run init-db');
    console.error('\n⚠️  Server will continue but API endpoints will fail until database is connected.\n');
    isConnected = false;
    return false;
  }
}

// Connect on startup (non-blocking to avoid blocking server startup)
process.nextTick(() => {
  connect();
});

// Convert PostgreSQL syntax to SQLite
function convertToSQLite(sql, params = []) {
  let convertedSql = sql;
  const convertedParams = [];
  let paramIndex = 1;
  
  // Replace $1, $2, etc. with ?
  convertedSql = convertedSql.replace(/\$\d+/g, (match) => {
    const index = parseInt(match.substring(1)) - 1;
    if (index < params.length) {
      convertedParams.push(params[index]);
    }
    return '?';
  });
  
  // Replace ILIKE with LIKE (SQLite LIKE is case-insensitive by default)
  convertedSql = convertedSql.replace(/ILIKE/gi, 'LIKE');
  
  // Replace FILTER (WHERE condition) with SUM(CASE WHEN ...)
  convertedSql = convertedSql.replace(/COUNT\(\)\s+FILTER\s+\(WHERE\s+([^)]+)\)/gi, (match, condition) => {
    return `SUM(CASE WHEN ${condition} THEN 1 ELSE 0 END)`;
  });
  
  // Replace FULL OUTER JOIN with UNION of LEFT JOINs (simplified - may need manual fixes for complex queries)
  // This is a basic replacement; complex queries may need manual adjustment
  
  return { sql: convertedSql, params: convertedParams.length > 0 ? convertedParams : params };
}

// Wrapper function to check connection before queries (async wrapper for compatibility)
async function queryWithCheck(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      if (!isConnected || !db) {
        console.log('🔄 Attempting to reconnect to database...');
        const connected = connect();
        if (!connected) {
          const error = new Error('Database is not connected. Please check database file permissions.');
          error.code = 'DB_NOT_CONNECTED';
          reject(error);
          return;
        }
      }
      
      // Convert PostgreSQL syntax to SQLite
      const { sql: convertedSql, params: convertedParams } = convertToSQLite(sql, params);
      
      // Check if it's a SELECT query
      const trimmedSql = convertedSql.trim().toUpperCase();
      if (trimmedSql.startsWith('SELECT')) {
        const stmt = db.prepare(convertedSql);
        const rows = stmt.all(convertedParams);
        resolve({ rows });
      } else {
        // For INSERT, UPDATE, DELETE
        const stmt = db.prepare(convertedSql);
        const result = stmt.run(convertedParams);
        resolve({ 
          rows: [],
          rowCount: result.changes,
          lastInsertRowid: result.lastInsertRowid
        });
      }
    } catch (error) {
      console.error('\n❌ Database Query Error:');
      console.error(`   Error code: ${error.code || 'UNKNOWN'}`);
      console.error(`   Error message: ${error.message}`);
      console.error(`   Query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
      
      if (error.code === 'SQLITE_CANTOPEN' || error.code === 'SQLITE_READONLY') {
        console.error('   🔴 Problem: Cannot open database file - check file permissions');
        console.error('   💡 Solution: Ensure the database directory is writable');
      } else if (error.code === 'SQLITE_NOTADB') {
        console.error('   🔴 Problem: File is not a valid SQLite database');
        console.error('   💡 Solution: Delete the database file and recreate it');
      } else if (error.message.includes('no such table')) {
        console.error('   🔴 Problem: Table does not exist - database schema may not be loaded');
        console.error('   💡 Solution: Run "npm run init-db" to create tables');
      } else if (error.message.includes('no such column')) {
        console.error('   🔴 Problem: Column does not exist - check query syntax');
      }
      console.error('');
      reject(error);
    }
  });
}

// Export for compatibility
module.exports = {
  query: queryWithCheck,
  queryWithCheck: queryWithCheck,
  prepare: (sql) => {
    if (!isConnected || !db) connect();
    return db.prepare(sql);
  },
  close: () => {
    if (db) {
      db.close();
      isConnected = false;
    }
  }
};
