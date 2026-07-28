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

  it('validates with minimal required variables', () => {
    delete process.env.DATABASE_URL;

    const env = validateEnv();

    expect(env.NODE_ENV).toBeDefined();
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it('accepts valid DATABASE_URL when provided', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    const env = validateEnv();

    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
  });

  it('rejects invalid DATABASE_URL format', () => {
    process.env.DATABASE_URL = 'not-a-url';

    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });

  it('caches result on subsequent calls', () => {
    delete process.env.DATABASE_URL;

    const env1 = validateEnv();
    const env2 = validateEnv();

    expect(env1).toBe(env2);
  });
});
