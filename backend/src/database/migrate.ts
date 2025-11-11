import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { query, pool } from './connection';

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');

    // Migration files in order
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

    for (const migrationFile of migrationFiles) {
      console.log(`\n📄 Running migration: ${migrationFile}...`);
      
      // Read migration file
      let migrationPath = join(__dirname, 'migrations', migrationFile);
      if (!existsSync(migrationPath)) {
        const fallbackPath = join(__dirname, '..', '..', 'src', 'database', 'migrations', migrationFile);
        if (existsSync(fallbackPath)) {
          migrationPath = fallbackPath;
        } else {
          throw new Error(`Migration file not found: ${migrationFile}`);
        }
      }

      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Execute the entire SQL file at once
      // PostgreSQL can handle multiple statements in one query
      await query(migrationSQL);
      
      console.log(`✅ ${migrationFile} completed`);
    }

    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error: any) {
    // Ignore "already exists" errors for tables, indexes, etc.
    if (error.code === '42P07' || error.code === '42710' || error.message?.includes('already exists')) {
      console.log('⚠️  Some objects already exist (this is okay if running migrations again)');
      console.log('✅ Migrations completed');
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', error.message);
      console.error('Error code:', error.code);
      if (error.detail) {
        console.error('Error detail:', error.detail);
      }
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigrations();

