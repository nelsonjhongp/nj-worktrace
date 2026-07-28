import { describe, it, expect } from 'vitest';
import { getHealthCheckResponse } from '@/platform/health';

describe('Health Check Contract', () => {
  it('returns status ok and service name', () => {
    const response = getHealthCheckResponse();

    expect(response).toEqual({
      status: 'ok',
      service: 'nj-worktrace',
    });
  });

  it('has correct type structure', () => {
    const response = getHealthCheckResponse();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('nj-worktrace');
  });
});
