// Detailed database diagnosis
require('dotenv').config();
const { Pool } = require('pg');

console.log('\n=== Database Diagnosis ===\n');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  connectionTimeoutMillis: 5000,
};

console.log('Connection settings:');
console.log('  Host:', config.host);
console.log('  Port:', config.port);
console.log('  User:', config.user);
console.log('  Password:', config.password ? '***SET***' : '❌ NOT SET');
console.log('  Database:', config.database);
console.log('');

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('❌ Pool error:', err.message);
  console.error('   Code:', err.code);
});

pool.query('SELECT version()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed!');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Error details:', err.detail || 'N/A');
    console.error('Error hint:', err.hint || 'N/A');
    
    console.log('\n💡 Troubleshooting:');
    if (err.code === 'ECONNREFUSED') {
      console.log('  → PostgreSQL service is not running');
      console.log('  → Start PostgreSQL service from Services');
    } else if (err.code === '28P01') {
      console.log('  → Password authentication failed');
      console.log('  → Check password in .env file');
    } else if (err.code === '57P03') {
      console.log('  → Database is starting up, wait a moment');
    } else {
      console.log('  → Check if PostgreSQL is installed');
      console.log('  → Check if service is running');
      console.log('  → Verify credentials in .env');
    }
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('PostgreSQL version:', res.rows[0].version.split(',')[0]);
    
    // Check if target database exists
    pool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.DB_NAME || 'property_management_uae'],
      (err, res) => {
        if (err) {
          console.error('Error checking database:', err.message);
          pool.end();
          process.exit(1);
        }
        
        if (res.rows.length > 0) {
          console.log('✅ Database exists!');
        } else {
          console.log('⚠️  Database does not exist, creating...');
          pool.query(
            `CREATE DATABASE ${process.env.DB_NAME || 'property_management_uae'}`,
            (err) => {
              if (err) {
                console.error('❌ Error creating database:', err.message);
              } else {
                console.log('✅ Database created!');
              }
              pool.end();
              if (!err) {
                console.log('\n✅ Everything is ready!');
                console.log('Run: npm run db:migrate');
              }
            }
          );
          return;
        }
        
        pool.end();
        console.log('\n✅ Everything is ready!');
        console.log('Run: npm run db:migrate');
      }
    );
  }
});

