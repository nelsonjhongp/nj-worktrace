import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file for integration tests
config({ path: resolve(process.cwd(), '.env') });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is not set');
}

// Application code has a single database contract. Point it at the disposable
// integration database before any application module creates its pool.
process.env.DATABASE_URL = testDatabaseUrl;
