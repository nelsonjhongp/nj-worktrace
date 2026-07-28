import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file
config({ path: resolve(process.cwd(), '.env') });

import { validateEnv } from '../src/platform/env';
import { getDb, closeDb } from '../src/platform/database/client';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Validating environment...');
  validateEnv();

  console.log('Connecting to database...');
  const db = getDb();

  console.log('Executing SELECT 1...');
  await db.execute(sql`SELECT 1`);

  console.log('✓ Database connection successful');

  await closeDb();
  process.exit(0);
}

main().catch((error) => {
  console.error('✗ Database connection failed');
  console.error(error.message);
  process.exit(1);
});
