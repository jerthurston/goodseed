import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check Beaver Seed products and their pricing
    const beaverProducts = await prisma.seedProduct.findMany({
      where: {
        category: {
          seller: {
            name: 'Beaver Seed'
          }
        }
      },
      take: 10,
      include: {
        pricings: true,
        category: {
          include: {
            seller: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const results = beaverProducts.map(product => ({
      name: product.name,
      createdAt: product.createdAt,
      hasPricing: product.pricings.length > 0,
      pricingCount: product.pricings.length,
      pricings: product.pricings.map(p => ({
        totalPrice: p.totalPrice,
        packSize: p.packSize,
        pricePerSeed: p.pricePerSeed
      }))
    }));

    return NextResponse.json({
      success: true,
      beaverSeedProducts: results,
      totalChecked: results.length,
      withPricing: results.filter(p => p.hasPricing).length,
      withoutPricing: results.filter(p => !p.hasPricing).length
    });

  } catch (error) {
    console.error('Debug pricing API error:', error);
    return NextResponse.json({ 
      error: 'Failed to debug pricing',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}