import { query, pool } from './connection';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // Create a default admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    // Check if admin already exists
    const existingAdmin = await query('SELECT id FROM users WHERE email = $1', ['admin@propertymanagementuae.com']);
    
    if (existingAdmin.rows.length === 0) {
      const adminUserId = '00000000-0000-0000-0000-000000000001';
      
      await query(
        `INSERT INTO users (id, email, password_hash, user_type, status, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [adminUserId, 'admin@propertymanagementuae.com', adminPassword, 'admin', 'active', true]
      );

      await query(
        `INSERT INTO admin_users (user_id, role)
         VALUES ($1, $2)`,
        [adminUserId, 'super_admin']
      );

      console.log('✅ Default admin user created');
      console.log('   Email: admin@propertymanagementuae.com');
      console.log('   Password: admin123');
    }

    // Create sample management plans
    const plans = [
      {
        name: 'Basic Plan',
        description: 'Perfect for individual property owners',
        price: 500,
        duration: 'monthly',
      },
      {
        name: 'Professional Plan',
        description: 'Ideal for property management companies',
        price: 1500,
        duration: 'monthly',
      },
      {
        name: 'Enterprise Plan',
        description: 'For large portfolios and agencies',
        price: 3000,
        duration: 'monthly',
      },
    ];

    for (const plan of plans) {
      const existingPlan = await query('SELECT id FROM management_plans WHERE name = $1', [plan.name]);
      if (existingPlan.rows.length === 0) {
        await query(
          `INSERT INTO management_plans (name, description, price, duration)
           VALUES ($1, $2, $3, $4)`,
          [plan.name, plan.description, plan.price, plan.duration]
        );
      }
    }

    console.log('✅ Sample management plans created');

    // Create sample branches
    const branches = [
      { name: 'Dubai Branch', emirate: 'Dubai' },
      { name: 'Abu Dhabi Branch', emirate: 'Abu Dhabi' },
      { name: 'Sharjah Branch', emirate: 'Sharjah' },
    ];

    for (const branch of branches) {
      const existingBranch = await query('SELECT id FROM branches WHERE name = $1', [branch.name]);
      if (existingBranch.rows.length === 0) {
        await query(
          `INSERT INTO branches (name, emirate, address, is_active)
           VALUES ($1, $2, $3, $4)`,
          [branch.name, branch.emirate, JSON.stringify({}), true]
        );
      }
    }

    console.log('✅ Sample branches created');
    console.log('✅ Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();

