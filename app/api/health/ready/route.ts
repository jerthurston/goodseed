/**
 * Health Check cho monitoring
 * Handles GET: Trả về status hệ thống (DB, Redis, queue)
 */

import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';
import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * 
 * This endpoint is used by AWS ALB target group health checks
 * to verify that the application is running correctly.
 * 
 * Checks performed:
 * 1. Database connection (PostgreSQL)
 * 2. Redis connection (Bull Queue)
 * 3. Process uptime
 * 
 * @returns 200 OK if healthy, 503 Service Unavailable if unhealthy
 */
export async function GET() {
    const startTime = Date.now();
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    try {
        // 1. Check database connection
        const dbStart = Date.now();
        try {
            await prisma.$queryRaw`SELECT 1`;
            checks.database = {
                status: 'healthy',
                latency: Date.now() - dbStart
            };
        } catch (error) {
            checks.database = {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }

        // 2. Check Redis connection
        const redisStart = Date.now();
        try {
            const redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                retryStrategy: () => null, // Don't retry for health check
                maxRetriesPerRequest: 1,
                connectTimeout: 3000
            });

            await redis.ping();
            checks.redis = {
                status: 'healthy',
                latency: Date.now() - redisStart
            };

            redis.disconnect();
        } catch (error) {
            checks.redis = {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }

        // 3. Process information
        checks.process = {
            status: 'healthy',
            latency: process.uptime() * 1000 // Convert to milliseconds
        };

        // Determine overall health
        const isHealthy = Object.values(checks).every(check => check.status === 'healthy');

        const response = {
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            checks,
            responseTime: Date.now() - startTime
        };

        return NextResponse.json(
            response,
            { status: isHealthy ? 200 : 503 }
        );
    } catch (error) {
        console.error('Health check error:', error);

        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
                checks
            },
            { status: 503 }
        );
    }
}
