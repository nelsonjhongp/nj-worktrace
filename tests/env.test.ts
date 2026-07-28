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

    const env = validateEnv();

    expect(env.NODE_ENV).toBeDefined();
    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
  });

  it('rejects missing DATABASE_URL', () => {
    delete process.env.DATABASE_URL;

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('rejects invalid DATABASE_URL format', () => {
    process.env.DATABASE_URL = 'not-a-url';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('caches result on subsequent calls', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    const env1 = validateEnv();
    const env2 = validateEnv();

    expect(env1).toBe(env2);
  });
});
