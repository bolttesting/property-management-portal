// Create database if it doesn't exist
require('dotenv').config();
const { Pool } = require('pg');

const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Connect to default postgres database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const dbName = process.env.DB_NAME || 'property_management_uae';

console.log('\n=== Creating Database ===\n');
console.log('Database name:', dbName);

adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName], (err, res) => {
  if (err) {
    console.error('❌ Error checking database:', err.message);
    console.error('\nPossible issues:');
    console.error('1. PostgreSQL is not running');
    console.error('2. Wrong password');
    console.error('3. PostgreSQL not installed');
    process.exit(1);
  }

  if (res.rows.length > 0) {
    console.log('✅ Database already exists!');
    adminPool.end();
    testConnection();
  } else {
    console.log('Creating database...');
    adminPool.query(`CREATE DATABASE ${dbName}`, (err, res) => {
      adminPool.end();
      if (err) {
        console.error('❌ Error creating database:', err.message);
        process.exit(1);
      }
      console.log('✅ Database created successfully!');
      testConnection();
    });
  }
});

function testConnection() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: dbName,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Connection test failed:', err.message);
      process.exit(1);
    } else {
      console.log('✅ Connection test successful!');
      console.log('\nNext steps:');
      console.log('1. Run: npm run db:migrate');
      console.log('2. Run: npm run db:seed');
      console.log('3. Run: npm run dev');
      pool.end();
      process.exit(0);
    }
  });
}

