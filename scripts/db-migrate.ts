import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, closeDb } from '../src/platform/database/client';

async function main() {
  console.log('Applying migrations...');
  const db = getDb();
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✓ Migrations applied successfully');
  await closeDb();
  process.exit(0);
}

main().catch((error) => {
  console.error('✗ Migration failed:', error);
  process.exit(1);
});
