import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { validateEnv } from '@/platform/env';
import * as schema from './schema';

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle> | undefined;

function getPool(): Pool {
  if (pool) return pool;

  const env = validateEnv();
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err: Error & { code?: string }) => {
    console.error(`[pg pool] background error: name=${err.name} code=${err.code ?? 'unknown'}`);
  });

  return pool;
}

export function getDb(): ReturnType<typeof drizzle> {
  if (db) return db;

  const pool = getPool();
  db = drizzle(pool, { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}
