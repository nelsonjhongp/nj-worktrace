import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv, resetEnvCache } from '@/platform/env';

describe('Environment Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetEnvCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetEnvCache();
  });

  it('validates with required variables', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.BETTER_AUTH_SECRET = 'secret-key-minimum-32-characters-long';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';

    const env = validateEnv();

    expect(env.NODE_ENV).toBeDefined();
    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    expect(env.BETTER_AUTH_SECRET).toBe('secret-key-minimum-32-characters-long');
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3000');
  });

  it('validates with minimal variables', () => {
    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.BETTER_AUTH_URL;

    const env = validateEnv();

    expect(env.NODE_ENV).toBeDefined();
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.BETTER_AUTH_SECRET).toBeUndefined();
    expect(env.BETTER_AUTH_URL).toBeUndefined();
  });

  it('rejects invalid DATABASE_URL format', () => {
    process.env.DATABASE_URL = 'not-a-url';
    process.env.BETTER_AUTH_SECRET = 'secret-key-minimum-32-characters-long';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('rejects short BETTER_AUTH_SECRET', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.BETTER_AUTH_SECRET = 'short';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('rejects invalid BETTER_AUTH_URL format', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.BETTER_AUTH_SECRET = 'secret-key-minimum-32-characters-long';
    process.env.BETTER_AUTH_URL = 'not-a-url';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('caches result on subsequent calls', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.BETTER_AUTH_SECRET = 'secret-key-minimum-32-characters-long';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';

    const env1 = validateEnv();
    const env2 = validateEnv();

    expect(env1).toBe(env2);
  });
});
