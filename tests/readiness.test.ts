import { describe, it, expect } from 'vitest';
import { getReadinessResponse, type HealthChecker } from '@/platform/readiness';

describe('Readiness Contract', () => {
  it('returns ok when database is available', async () => {
    const mockHealthy: HealthChecker = async () => ({ ok: true });

    const response = await getReadinessResponse(mockHealthy);

    expect(response).toEqual({
      status: 'ok',
      service: 'nj-worktrace',
      database: 'ok',
    });
  });

  it('returns error when database is unavailable', async () => {
    const mockUnhealthy: HealthChecker = async () => ({ ok: false });

    const response = await getReadinessResponse(mockUnhealthy);

    expect(response).toEqual({
      status: 'error',
      service: 'nj-worktrace',
      database: 'unavailable',
    });
  });
});
