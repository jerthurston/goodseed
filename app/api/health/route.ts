/**
 * ALB Liveness Check - Simple and Fast
 * Used by AWS ALB target group health checks
 * Should NEVER fail unless process is dead
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    },
    { status: 200 }
  );
}