import { readFileSync } from 'fs';
import { join } from 'path';
import { pool, query } from './connection';

async function runSingleMigration(fileName: string) {
  try {
    if (!fileName) {
      throw new Error('Migration file name is required');
    }

    const filePath = join(__dirname, 'migrations', fileName);
    const sql = readFileSync(filePath, 'utf-8');

    console.log(`🔄 Running single migration: ${fileName}`);
    await query(sql);
    console.log(`✅ Migration ${fileName} completed successfully`);
    process.exit(0);
  } catch (error: any) {
    console.error(`❌ Failed to run migration ${fileName}:`, error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const [, , migrationFile] = process.argv;
runSingleMigration(migrationFile);

