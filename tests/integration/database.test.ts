import { describe, it, expect, afterAll } from 'vitest';
import { getDb, closeDb } from '@/platform/database/client';
import { sql } from 'drizzle-orm';

describe('Database Integration', () => {
  afterAll(async () => {
    await closeDb();
  });

  it('connects to PostgreSQL and executes SELECT 1', async () => {
    const db = getDb();
    const result = await db.execute(sql`SELECT 1 as value`);

    expect(result.rows).toBeDefined();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ value: 1 });
  });

  it('validates DATABASE_URL is set', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toMatch(/^postgresql:\/\//);
  });
});
