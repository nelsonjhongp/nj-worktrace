import { sql } from 'drizzle-orm';
import { getDb } from './client';

export interface DatabaseHealthCheck {
  ok: boolean;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { ok: false };
  }
}
