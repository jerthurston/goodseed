import { NextResponse } from 'next/server';
import { ioredis, upstashRedis, redisConfig } from '@/lib/redis';

export async function GET() {
  const results = {
    config: {
      host: redisConfig.host,
      port: redisConfig.port,
      tls: redisConfig.tls,
      hasPassword: !!redisConfig.password,
    },
    ioredis: {
      available: false,
      connected: false,
      error: null as string | null,
    },
    upstash: {
      available: !!upstashRedis,
      connected: false,
      error: null as string | null,
    },
  };

  // Test IORedis connection
  try {
    const pong = await ioredis.ping();
    results.ioredis.available = true;
    results.ioredis.connected = pong === 'PONG';
  } catch (error) {
    results.ioredis.error = error instanceof Error ? error.message : String(error);
  }

  // Test Upstash REST API connection
  if (upstashRedis) {
    try {
      const pong = await upstashRedis.ping();
      results.upstash.connected = pong === 'PONG';
    } catch (error) {
      results.upstash.error = error instanceof Error ? error.message : String(error);
    }
  }

  // Test write/read
  try {
    const testKey = 'test:connection';
    const testValue = { timestamp: new Date().toISOString(), test: true };
    
    // Test with IORedis
    await ioredis.set(testKey, JSON.stringify(testValue), 'EX', 10);
    const retrieved = await ioredis.get(testKey);
    
    if (retrieved) {
      (results.ioredis as any).writeRead = '✅ Success';
    }
  } catch (error) {
    (results.ioredis as any).writeRead = `❌ ${error instanceof Error ? error.message : String(error)}`;
  }

  // Determine overall status
  const allConnected = results.ioredis.connected && (!upstashRedis || results.upstash.connected);

  return NextResponse.json({
    status: allConnected ? 'success' : 'partial',
    message: allConnected 
      ? '✅ All Redis connections successful!' 
      : '⚠️ Some Redis connections failed',
    ...results,
  }, { 
    status: allConnected ? 200 : 500 
  });
}
