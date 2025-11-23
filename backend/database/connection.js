/**
 * Database Connection Module
 * 
 * This module handles all database connectivity and query execution for the SQLite database.
 * It provides:
 * - Automatic database connection and initialization
 * - Schema creation if database doesn't exist
 * - PostgreSQL-to-SQLite query syntax conversion
 * - Error handling and connection status management
 * 
 * The module uses better-sqlite3 for synchronous SQLite operations, which is wrapped
 * in async functions for compatibility with Express route handlers.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database file path - can be configured via DB_PATH environment variable
// Defaults to election_data.db in the project root
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../election_data.db');

// Ensure database directory exists before attempting to create database file
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Global database connection state
let db = null;
let isConnected = false;

/**
 * Connect to SQLite Database
 * 
 * Establishes connection to the SQLite database file. If the database doesn't exist,
 * it creates a new one. If tables don't exist, it automatically initializes the
 * schema by reading and executing schema.sql.
 * 
 * @returns {boolean} True if connection successful, false otherwise
 */
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

    // Open database connection with timeout to prevent hanging on locked databases
    db = new Database(dbPath, { 
      verbose: null,  // Disable verbose logging
      timeout: 5000   // 5 second timeout for database operations
    });
    
    // Enable foreign key constraints to maintain referential integrity
    // This ensures that foreign key relationships are enforced by SQLite
    db.pragma('foreign_keys = ON');
    
    // Check if database tables exist by looking for the 'states' table
    // If tables don't exist, we need to initialize the schema
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
        
        // Parse SQL schema file - handle multi-line statements properly
        // SQLite requires each statement to be executed separately
        const lines = schema.split('\n');
        let currentStatement = '';
        const statements = [];

        // Parse each line of the schema file
        for (const line of lines) {
          // Remove SQL comments (everything after --)
          let cleanLine = line;
          const commentIndex = line.indexOf('--');
          if (commentIndex >= 0) {
            cleanLine = line.substring(0, commentIndex);
          }
          
          // Skip empty lines
          if (cleanLine.trim().length === 0) {
            continue;
          }
          
          // Accumulate lines until we find a semicolon (end of statement)
          currentStatement += cleanLine + '\n';
          
          // If line ends with semicolon, we have a complete SQL statement
          if (cleanLine.trim().endsWith(';')) {
            const stmt = currentStatement.trim();
            if (stmt.length > 0 && !stmt.startsWith('--')) {
              statements.push(stmt);
            }
            currentStatement = '';
          }
        }

        // Separate CREATE TABLE and CREATE INDEX statements
        // Tables must be created before indexes to avoid foreign key errors
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

        // Create tables first (indexes depend on tables existing)
        let tableCount = 0;
        for (const stmt of tableStatements) {
          try {
            db.exec(stmt);
            tableCount++;
          } catch (err) {
            // Ignore errors if table already exists (idempotent operation)
            if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
              console.error(`   ❌ Error creating table: ${err.message}`);
              console.error(`   Statement: ${stmt.substring(0, 100)}...`);
            }
          }
        }

        // Create indexes after tables (indexes reference table columns)
        let indexCount = 0;
        for (const stmt of indexStatements) {
          try {
            db.exec(stmt);
            indexCount++;
          } catch (err) {
            // Ignore errors if index already exists (idempotent operation)
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

// Connect to database on module load (non-blocking to avoid blocking server startup)
// Uses process.nextTick to defer connection until after the current execution completes
process.nextTick(() => {
  connect();
});

/**
 * Convert PostgreSQL Query Syntax to SQLite
 * 
 * This function converts PostgreSQL-style queries to SQLite-compatible syntax.
 * The original codebase was written for PostgreSQL, so this adapter allows
 * the same queries to work with SQLite.
 * 
 * Conversions performed:
 * - $1, $2 parameter placeholders → ? placeholders
 * - ILIKE (case-insensitive LIKE) → LIKE (SQLite LIKE is case-insensitive by default)
 * - COUNT() FILTER (WHERE ...) → SUM(CASE WHEN ... THEN 1 ELSE 0 END)
 * 
 * @param {string} sql - PostgreSQL-style SQL query
 * @param {Array} params - Query parameters array
 * @returns {Object} Object with converted SQL and parameters
 */
function convertToSQLite(sql, params = []) {
  let convertedSql = sql;
  const convertedParams = [];
  let paramIndex = 1;
  
  // Convert PostgreSQL parameter placeholders ($1, $2, etc.) to SQLite placeholders (?)
  // PostgreSQL uses numbered parameters, SQLite uses positional parameters
  convertedSql = convertedSql.replace(/\$\d+/g, (match) => {
    const index = parseInt(match.substring(1)) - 1;
    if (index < params.length) {
      convertedParams.push(params[index]);
    }
    return '?';
  });
  
  // Replace ILIKE (PostgreSQL case-insensitive LIKE) with LIKE
  // SQLite LIKE is case-insensitive by default, so this is a direct replacement
  convertedSql = convertedSql.replace(/ILIKE/gi, 'LIKE');
  
  // Replace PostgreSQL FILTER clause with SQLite-compatible CASE expression
  // COUNT() FILTER (WHERE condition) becomes SUM(CASE WHEN condition THEN 1 ELSE 0 END)
  convertedSql = convertedSql.replace(/COUNT\(\)\s+FILTER\s+\(WHERE\s+([^)]+)\)/gi, (match, condition) => {
    return `SUM(CASE WHEN ${condition} THEN 1 ELSE 0 END)`;
  });
  
  // Note: FULL OUTER JOIN conversion is not implemented here
  // Complex queries with FULL OUTER JOIN may need manual adjustment
  
  return { sql: convertedSql, params: convertedParams.length > 0 ? convertedParams : params };
}

/**
 * Execute Database Query with Connection Check
 * 
 * This is the main query execution function used throughout the application.
 * It:
 * - Checks database connection and reconnects if necessary
 * - Converts PostgreSQL syntax to SQLite
 * - Executes SELECT queries and returns rows
 * - Executes INSERT/UPDATE/DELETE queries and returns affected row count
 * - Handles errors with detailed logging
 * 
 * @param {string} sql - SQL query string (PostgreSQL syntax, will be converted)
 * @param {Array} params - Query parameters array
 * @returns {Promise<Object>} Promise resolving to {rows: Array} for SELECT or {rowCount: number} for INSERT/UPDATE/DELETE
 */
async function queryWithCheck(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      // Check if database is connected, attempt reconnection if not
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
      
      // Convert PostgreSQL query syntax to SQLite-compatible syntax
      const { sql: convertedSql, params: convertedParams } = convertToSQLite(sql, params);
      
      // Determine query type and execute accordingly
      const trimmedSql = convertedSql.trim().toUpperCase();
      if (trimmedSql.startsWith('SELECT')) {
        // SELECT queries return data rows
        const stmt = db.prepare(convertedSql);
        const rows = stmt.all(convertedParams);
        resolve({ rows });
      } else {
        // INSERT, UPDATE, DELETE queries return affected row count
        const stmt = db.prepare(convertedSql);
        const result = stmt.run(convertedParams);
        resolve({ 
          rows: [],
          rowCount: result.changes,        // Number of rows affected
          lastInsertRowid: result.lastInsertRowid  // ID of last inserted row (for INSERT)
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

/**
 * Module Exports
 * 
 * Exports database connection functions for use throughout the application.
 * Provides both async (query, queryWithCheck) and sync (prepare) interfaces.
 */
module.exports = {
  // Main query function (async, recommended for route handlers)
  query: queryWithCheck,
  queryWithCheck: queryWithCheck,
  
  // Direct prepared statement access (sync, for advanced use cases)
  prepare: (sql) => {
    if (!isConnected || !db) connect();
    return db.prepare(sql);
  },
  
  // Close database connection (useful for cleanup or testing)
  close: () => {
    if (db) {
      db.close();
      isConnected = false;
    }
  }
};
