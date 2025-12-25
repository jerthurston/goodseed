/**
 * Chức tổng quan các scraper job gần đây
 * Handles GET: Lấy danh sách các scraper job gần đây (cho dashboard)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Placeholder implementation - will be implemented later
    return NextResponse.json({
      success: true,
      data: [],
      message: "Scraper admin endpoint - implementation pending"
    });
  } catch (error) {
    console.error('Error in scraper admin route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}