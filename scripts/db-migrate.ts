import { config } from 'dotenv';
import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, closeDb } from '../src/platform/database/client.js';

config({ path: resolve(process.cwd(), '.env') });

console.log('Applying migrations...');

try {
  const db = getDb();
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✓ Migrations applied successfully');
} catch (error) {
  console.error('✗ Migration failed:', error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
