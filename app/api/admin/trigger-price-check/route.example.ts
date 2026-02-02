/**
 * API Route: Manual Price Check Trigger
 * 
 * ⚠️  OPTIONAL - For debugging/testing only
 * 
 * PURPOSE:
 * ========
 * 1. Testing: Test price detection logic without running scraper
 * 2. Debug: Verify email notifications work correctly
 * 3. Manual Re-run: Force price check for specific seller if needed
 * 
 * NORMAL FLOW (Production):
 * =========================
 * Scraper (auto) → Save Products → Detect Price Changes → Send Emails
 * 
 * This endpoint BYPASSES scraper and directly triggers detection
 * using EXISTING data in database (no fresh crawl)
 * 
 * USE CASES:
 * ==========
 * ✅ Development/Testing phase
 * ✅ Admin needs to re-run detection due to previous error
 * ✅ Emergency manual price check
 * 
 * ❌ NOT needed in production if scraper auto-trigger works properly
 * 
 * Endpoint: POST /api/admin/trigger-price-check
 * Body: { "sellerId": "seller-123" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDetectPriceChangesJob } from '@/lib/services/marketing/price-alert/priceAlertJobCreator';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const session = await getServerSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { sellerId } = body;

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId is required' },
        { status: 400 }
      );
    }

    // 1. Get seller info
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    // 2. Get all products for this seller
    const products = await prisma.seedProduct.findMany({
      where: { sellerId },
      include: {
        pricings: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found for this seller' },
        { status: 404 }
      );
    }

    // 3. Create price detection job
    const jobId = await createDetectPriceChangesJob({
      sellerId: seller.id,
      sellerName: seller.name,
      scrapedProducts: products.map(p => ({
        seedId: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: '', // Will be fetched from productImages if needed
        pricings: p.pricings.map(pricing => ({
          packSize: pricing.packSize,
          totalPrice: pricing.totalPrice,
        })),
      })),
    });

    apiLogger.info('[API] Manual price check triggered', {
      sellerId,
      sellerName: seller.name,
      productCount: products.length,
      jobId,
    });

    return NextResponse.json({
      success: true,
      message: `Price check job created for ${seller.name}`,
      jobId,
      productCount: products.length,
    });

  } catch (error) {
    apiLogger.logError('[API] Failed to trigger price check', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to trigger price check',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
