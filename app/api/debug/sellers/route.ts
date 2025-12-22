import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sellers = await prisma.seller.findMany({
      where: { isActive: true },
      select: { 
        id: true, 
        name: true, 
        autoScrapeInterval: true,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      data: sellers,
      summary: {
        total: sellers.length,
        withAutoInterval: sellers.filter(s => s.autoScrapeInterval !== null && s.autoScrapeInterval > 0).length,
        nullInterval: sellers.filter(s => s.autoScrapeInterval === null).length
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}