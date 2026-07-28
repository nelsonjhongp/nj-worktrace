import { checkDatabaseHealth, type DatabaseHealthCheck } from '@/platform/database/health';

export interface ReadinessResponse {
  status: 'ok' | 'error';
  service: 'nj-worktrace';
  database: 'ok' | 'unavailable';
}

export type HealthChecker = () => Promise<DatabaseHealthCheck>;

export async function getReadinessResponse(
  healthChecker: HealthChecker = checkDatabaseHealth
): Promise<ReadinessResponse> {
  const health = await healthChecker();

  return {
    status: health.ok ? 'ok' : 'error',
    service: 'nj-worktrace',
    database: health.ok ? 'ok' : 'unavailable',
  };
}
