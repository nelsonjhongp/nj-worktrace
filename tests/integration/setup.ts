import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file for integration tests
config({ path: resolve(process.cwd(), '.env') });
