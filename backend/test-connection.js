// Simple test to check database connection
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'property_management_uae',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

console.log('\n=== Testing Database Connection ===\n');
console.log('Trying to connect...');
console.log('Host:', process.env.DB_HOST);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);
console.log('Password:', process.env.DB_PASSWORD ? '***SET***' : '❌ NOT SET');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', err.message);
    console.error('\nPossible issues:');
    console.error('1. PostgreSQL is not running');
    console.error('2. Database password is not set in .env');
    console.error('3. Database does not exist');
    console.error('4. Wrong credentials');
    process.exit(1);
  } else {
    console.log('\n✅ Connection successful!');
    console.log('Database time:', res.rows[0].now);
    console.log('\nYou can now run: npm run dev');
    process.exit(0);
  }
});

