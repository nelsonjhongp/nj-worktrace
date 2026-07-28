export interface HealthCheckResponse {
  status: 'ok';
  service: 'nj-worktrace';
}

export function getHealthCheckResponse(): HealthCheckResponse {
  return {
    status: 'ok',
    service: 'nj-worktrace',
  };
}
