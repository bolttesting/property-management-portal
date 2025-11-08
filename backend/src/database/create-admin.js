const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'property_management_uae',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function createAdmin() {
  const email = process.argv[2] || 'admin@pdfproedit.com';
  const password = process.argv[3] || 'admin123';
  
  try {
    console.log(`Creating admin user: ${email}`);
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists. Updating password and status...');
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, status = $2, user_type = $3 WHERE email = $4',
        [passwordHash, 'active', 'admin', email]
      );
      
      // Check if admin_users entry exists
      const adminUser = await pool.query('SELECT id FROM admin_users WHERE user_id = $1', [existingUser.rows[0].id]);
      if (adminUser.rows.length === 0) {
        await pool.query(
          'INSERT INTO admin_users (user_id, role) VALUES ($1, $2)',
          [existingUser.rows[0].id, 'super_admin']
        );
      }
      
      console.log('✅ Admin user updated successfully!');
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = require('crypto').randomUUID();
      
      await pool.query(
        `INSERT INTO users (id, email, password_hash, user_type, status, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, email, passwordHash, 'admin', 'active', true]
      );
      
      await pool.query(
        'INSERT INTO admin_users (user_id, role) VALUES ($1, $2)',
        [userId, 'super_admin']
      );
      
      console.log('✅ Admin user created successfully!');
    }
    
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log('\n✅ You can now login with these credentials!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();

