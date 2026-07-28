import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import { Client } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';

const SAFE_DB_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const FORBIDDEN_DB_NAMES = ['postgres', 'template0', 'template1', 'nj_worktrace'];

function extractDbName(url: string): string {
  const match = url.match(/\/([^/]+)$/);
  if (!match) {
    throw new Error('Cannot extract database name from URL');
  }
  return match[1]!;
}

async function resetTestDatabase() {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  const devDbUrl = process.env.DATABASE_URL;

  if (!testDbUrl) {
    console.error('✗ TEST_DATABASE_URL is not defined');
    process.exit(1);
  }

  if (!devDbUrl) {
    console.error('✗ DATABASE_URL is not defined');
    process.exit(1);
  }

  if (testDbUrl === devDbUrl) {
    console.error('✗ TEST_DATABASE_URL must be different from DATABASE_URL');
    process.exit(1);
  }

  const testDbName = extractDbName(testDbUrl);

  if (!SAFE_DB_NAME_PATTERN.test(testDbName)) {
    console.error(`✗ Database name "${testDbName}" contains unsafe characters`);
    process.exit(1);
  }

  if (!testDbName.endsWith('_test')) {
    console.error(`✗ Database name "${testDbName}" must end with "_test"`);
    process.exit(1);
  }

  if (FORBIDDEN_DB_NAMES.includes(testDbName)) {
    console.error(`✗ Database name "${testDbName}" is forbidden`);
    process.exit(1);
  }

  const adminUrl = devDbUrl.replace(/\/[^/]+$/, '/postgres');

  console.log('Connecting to PostgreSQL administrative database...');
  const adminClient = new Client({ connectionString: adminUrl });
  await adminClient.connect();

  try {
    console.log(`Terminating active connections to ${testDbName}...`);
    await adminClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid()
    `, [testDbName]);

    console.log(`Dropping database ${testDbName} if exists...`);
    await adminClient.query(`DROP DATABASE IF EXISTS "${testDbName}"`);

    console.log(`Creating database ${testDbName}...`);
    await adminClient.query(`CREATE DATABASE "${testDbName}"`);
  } finally {
    await adminClient.end();
  }

  console.log('Applying migrations to test database...');
  const testDb = drizzle({
    connection: {
      connectionString: testDbUrl,
    },
  });

  await migrate(testDb, { migrationsFolder: './drizzle' });

  console.log('✓ Test database reset successfully');
  process.exit(0);
}

resetTestDatabase().catch((error) => {
  console.error('✗ Test database reset failed:', error);
  process.exit(1);
});
