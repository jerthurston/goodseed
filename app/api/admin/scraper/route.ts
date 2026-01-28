/**
 * Chức tổng quan các scraper job gần đây
 * Handles GET: Lấy danh sách các scraper job gần đây (cho dashboard)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheHeaders } from '@/lib/cache-headers';

export async function GET(request: NextRequest) {
  try {
    // Placeholder implementation - will be implemented later
    const response = NextResponse.json({
      success: true,
      data: [],
      message: "Scraper admin endpoint - implementation pending"
    });
    
    // Apply admin cache headers - no cache for sensitive admin data
    const adminHeaders = getCacheHeaders('admin');
    Object.entries(adminHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('Error in scraper admin route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}