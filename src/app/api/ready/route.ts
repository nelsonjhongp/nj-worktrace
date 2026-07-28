import { NextResponse } from 'next/server';
import { getReadinessResponse } from '@/platform/readiness';

export async function GET(): Promise<NextResponse> {
  const response = await getReadinessResponse();
  const status = response.status === 'ok' ? 200 : 503;
  return NextResponse.json(response, { status });
}
