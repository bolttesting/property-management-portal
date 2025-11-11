import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const hasRealConnectionString = (() => {
  if (!connectionString) {
    return false;
  }

  try {
    const parsed = new URL(connectionString);

    if (!parsed.protocol.startsWith('postgres')) {
      return false;
    }

    if (!parsed.port) {
      return true;
    }

    return Number.isFinite(Number(parsed.port));
  } catch {
    return false;
  }
})();

const buildSslConfig = () =>
  process.env.PGSSLMODE === 'require' ||
  process.env.PGSSL === 'true' ||
  process.env.DB_SSL === 'true'
    ? {
        rejectUnauthorized:
          process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true,
      }
    : undefined;

let pool: Pool;

if (hasRealConnectionString) {
  const poolConfig: PoolConfig = {
    connectionString,
    ssl: buildSslConfig(),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  pool = new Pool(poolConfig);
} else {
  const host =
    process.env.PGHOST || process.env.DB_HOST || 'localhost';
  const resolvedPort =
    process.env.PGPORT || process.env.DB_PORT || '5432';
  const parsedPort = Number.parseInt(resolvedPort, 10);
  const port = Number.isNaN(parsedPort) ? 5432 : parsedPort;
  const database =
    process.env.PGDATABASE ||
    process.env.DB_NAME ||
    'property_management_uae';
  const user =
    process.env.PGUSER || process.env.DB_USER || 'postgres';
  const password =
    process.env.PGPASSWORD || process.env.DB_PASSWORD || '';

  const poolConfig: PoolConfig = {
    host,
    port,
    database,
    user,
    password,
    ssl: buildSslConfig(),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  console.log(`[DB] Using connection pool host=${host} port=${port}`);
  pool = new Pool(poolConfig);
}

export { pool };

// Test database connection
export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected');
    client.release();
  } catch (error) {
    console.error('❌ Error connecting to PostgreSQL:', error);
    throw error;
  }
}

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Query helper function
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export default pool;
