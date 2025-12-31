import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all sellers with their status and product counts
    const sellers = await prisma.seller.findMany({
      select: { 
        id: true, 
        name: true, 
        isActive: true,
        autoScrapeInterval: true
      }
    });

    const sellerStats = [];
    for (const seller of sellers) {
      const productCount = await prisma.seedProduct.count({
        where: {
          category: {
            sellerId: seller.id
          }
        }
      });

      sellerStats.push({
        name: seller.name,
        isActive: seller.isActive,
        productCount,
        autoScrapeInterval: seller.autoScrapeInterval
      });
    }

    // Find Beaver Seed specifically  
    const beaverSeed = sellers.find(s => 
      s.name.toLowerCase().includes('beaver')
    );

    // Get sample of what API returns (active sellers only)
    const apiSample = await prisma.seedProduct.findMany({
      where: {
        category: {
          seller: {
            isActive: true
          }
        }
      },
      take: 5,
      include: {
        category: {
          include: {
            seller: {
              select: {
                name: true,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      sellers: sellerStats.sort((a, b) => b.productCount - a.productCount),
      beaverSeed: beaverSeed ? {
        name: beaverSeed.name,
        isActive: beaverSeed.isActive,
        id: beaverSeed.id
      } : null,
      apiSample: apiSample.map(p => ({
        name: p.name,
        seller: p.category.seller.name,
        sellerActive: p.category.seller.isActive,
        createdAt: p.createdAt
      })),
      summary: {
        totalSellers: sellers.length,
        activeSellers: sellers.filter(s => s.isActive).length,
        inactiveSellers: sellers.filter(s => !s.isActive).length,
        totalProducts: sellerStats.reduce((sum, s) => sum + s.productCount, 0)
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}