import { NextResponse } from 'next/server';
import { getHealthCheckResponse } from '@/platform/health';

export function GET(): NextResponse {
  return NextResponse.json(getHealthCheckResponse());
}
