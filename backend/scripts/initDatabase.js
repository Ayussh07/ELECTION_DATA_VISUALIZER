const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../election_data.db');
const schemaPath = path.join(__dirname, '../database/schema.sql');

console.log('🔧 Initializing SQLite database...');
console.log(`   Database path: ${dbPath}`);
console.log(`   Schema file: ${schemaPath}\n`);

// Remove existing database if it exists (only if not locked)
if (fs.existsSync(dbPath)) {
  try {
    console.log('⚠️  Existing database found. Deleting...');
    fs.unlinkSync(dbPath);
  } catch (error) {
    if (error.code === 'EBUSY') {
      console.log('⚠️  Database file is locked (server may be running).');
      console.log('   Please stop the server first, or the database will be recreated on next server start.');
      console.log('   Continuing with existing database...\n');
      process.exit(0);
    } else {
      throw error;
    }
  }
}

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Read and execute schema
console.log('📖 Reading schema file...');
const schema = fs.readFileSync(schemaPath, 'utf-8');

console.log('🔨 Creating tables and indexes...');

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

// Create tables first
let tableCount = 0;
for (const stmt of tableStatements) {
  try {
    db.exec(stmt);
    tableCount++;
  } catch (error) {
    if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
      console.error(`   Error: ${error.message}`);
    }
  }
}

// Then create indexes
let indexCount = 0;
for (const stmt of indexStatements) {
  try {
    db.exec(stmt);
    indexCount++;
  } catch (error) {
    if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
      console.error(`   Error: ${error.message}`);
    }
  }
}

db.close();

console.log(`\n✅ Database initialized successfully!`);
console.log(`   Tables created: ${tableCount}`);
console.log(`   Indexes created: ${indexCount}`);
console.log(`   Database file: ${dbPath}\n`);
