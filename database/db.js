const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || process.env.RDS_HOSTNAME || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.RDS_PORT || '5432'),
  database: process.env.DB_NAME || process.env.RDS_DB_NAME || 'findingsweetie',
  user: process.env.DB_USER || process.env.RDS_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || process.env.RDS_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database initialized successfully');
}

module.exports = { pool, query, initializeDatabase };
