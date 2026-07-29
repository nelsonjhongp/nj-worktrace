import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';

config({ path: resolve(process.cwd(), '.env') });

const SAFE_DB_NAME_PATTERN = /^\w+$/;
const FORBIDDEN_DB_NAMES = new Set(['postgres', 'template0', 'template1', 'nj_worktrace']);

function extractDbName(url: string): string {
  const parsed = new URL(url);
  const pathname = parsed.pathname;
  const dbName = pathname.slice(1);
  if (!dbName) {
    throw new Error('Cannot extract database name from URL');
  }
  return dbName;
}

const testDbUrl = process.env.TEST_DATABASE_URL;
const devDbUrl = process.env.DATABASE_URL;

if (!testDbUrl) {
  throw new Error('TEST_DATABASE_URL is not defined');
}

if (!devDbUrl) {
  throw new Error('DATABASE_URL is not defined');
}

if (testDbUrl === devDbUrl) {
  throw new Error('TEST_DATABASE_URL must be different from DATABASE_URL');
}

const testDbName = extractDbName(testDbUrl);

if (!SAFE_DB_NAME_PATTERN.test(testDbName)) {
  throw new Error(`Database name "${testDbName}" contains unsafe characters`);
}

if (!testDbName.endsWith('_test')) {
  throw new Error(`Database name "${testDbName}" must end with "_test"`);
}

if (FORBIDDEN_DB_NAMES.has(testDbName)) {
  throw new Error(`Database name "${testDbName}" is forbidden`);
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

try {
  await migrate(testDb, { migrationsFolder: './drizzle' });
  console.log('✓ Test database reset successfully');
} catch (error) {
  console.error('✗ Test database reset failed:', error);
  process.exitCode = 1;
}
