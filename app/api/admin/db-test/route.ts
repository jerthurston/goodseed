/**
 * Database Connection Test API
 * Test connection to AWS RDS PostgreSQL database
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';

export async function GET() {
  try {
    apiLogger.info('🔗 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    apiLogger.info('✅ Database connection established');
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    apiLogger.info('✅ Basic query successful', { result });
    
    // Test table access
    const sellerCount = await prisma.seller.count();
    const productCount = await prisma.seedProduct.count();
    const categoryCount = await prisma.seedProductCategory.count();
    
    const stats = {
      connection: 'success',
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown',
      counts: {
        sellers: sellerCount,
        products: productCount,
        categories: categoryCount
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
    
    apiLogger.info('📊 Database stats retrieved successfully', stats);
    
    return NextResponse.json({
      status: 'success',
      ...stats
    });
    
  } catch (error) {
    apiLogger.logError('❌ Database connection test failed:', error as Error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
    apiLogger.info('🔌 Database connection closed');
  }
}