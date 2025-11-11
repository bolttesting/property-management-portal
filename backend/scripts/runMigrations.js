const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationFiles = [
  '001_initial_schema.sql',
  '002_additional_tables.sql',
  '003_add_listing_type.sql',
  '004_create_contact_messages.sql',
  '005_add_offer_amount.sql',
  '006_update_chat_rooms_constraint.sql',
  '007_update_leases_contract.sql',
  '008_create_move_permits.sql',
];

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    console.log('Running migrations...');

    const baseDir = process.cwd();
    const candidateDirs = [
      path.join(baseDir, 'backend', 'dist', 'database', 'migrations'),
      path.join(baseDir, 'backend', 'src', 'database', 'migrations'),
    ];

    const migrationsDir = candidateDirs.find((dir) => fs.existsSync(dir));
    if (!migrationsDir) {
      throw new Error(`Could not locate migrations directory. Checked: ${candidateDirs.join(', ')}`);
    }

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing migration file: ${filePath}`);
      }

      console.log(`\nExecuting ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await pool.query(sql);
      console.log(`Completed ${file}`);
    }

    console.log('\nAll migrations completed.');
    process.exit(0);
  } catch (error) {
    console.error('Migration run failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();


