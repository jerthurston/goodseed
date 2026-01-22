import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth/auth';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * POST /api/admin/migrate/wishlist-many-to-many
 * 
 * Trigger wishlist migration to many-to-many relationship
 * 
 * SECURITY: Only accessible by admin users
 * IDEMPOTENT: Safe to run multiple times
 */
export async function POST(request: NextRequest) {
  try {
    // Security check: Only admin can trigger migration
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is admin (adjust based on your admin check logic)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });
    
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    apiLogger.info('[Migration API] Starting wishlist many-to-many migration', {
      triggeredBy: session.user.email,
      timestamp: new Date().toISOString()
    });
    
    // Step 1: Check current status
    const existingCount = await prisma.wishlistFolderItem.count();
    apiLogger.info('[Migration API] Existing junction entries', { count: existingCount });
    
    // Step 2: Find orphaned wishlists
    const allWishlists = await prisma.wishlist.findMany({
      select: {
        id: true,
        userId: true,
        seedId: true,
        wishlistFolderItems: {
          include: {
            wishlistFolder: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
    
    const wishlistsWithoutFolders = allWishlists.filter(w => w.wishlistFolderItems.length === 0);
    
    apiLogger.info('[Migration API] Orphaned wishlists found', { 
      count: wishlistsWithoutFolders.length,
      totalWishlists: allWishlists.length
    });
    
    // Step 3: Auto-fix orphaned wishlists
    let fixed = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    
    for (const wishlist of wishlistsWithoutFolders) {
      try {
        // Find or create Uncategorized folder
        let uncategorizedFolder = await prisma.wishlistFolder.findFirst({
          where: {
            userId: wishlist.userId,
            name: 'Uncategorized'
          }
        });
        
        if (!uncategorizedFolder) {
          uncategorizedFolder = await prisma.wishlistFolder.create({
            data: {
              userId: wishlist.userId,
              name: 'Uncategorized',
              order: 0
            }
          });
          
          apiLogger.info('[Migration API] Created Uncategorized folder', {
            userId: wishlist.userId,
            folderId: uncategorizedFolder.id
          });
        }
        
        // Create junction entry
        await prisma.wishlistFolderItem.create({
          data: {
            wishlistId: wishlist.id,
            wishlistFolderId: uncategorizedFolder.id,
            order: 0
          }
        });
        
        fixed++;
      } catch (error) {
        errors++;
        const errorMsg = `Failed to fix wishlist ${wishlist.id}: ${(error as Error).message}`;
        errorDetails.push(errorMsg);
        apiLogger.logError('[Migration API] Fix error', error as Error);
      }
    }
    
    // Step 4: Final verification
    const finalJunctionCount = await prisma.wishlistFolderItem.count();
    const finalOrphanedCount = await prisma.wishlist.count({
      where: {
        wishlistFolderItems: {
          none: {}
        }
      }
    });
    
    const result = {
      success: true,
      migration: {
        totalWishlists: allWishlists.length,
        orphanedBefore: wishlistsWithoutFolders.length,
        orphanedAfter: finalOrphanedCount,
        fixed,
        errors,
        errorDetails: errors > 0 ? errorDetails : undefined
      },
      stats: {
        junctionEntriesBefore: existingCount,
        junctionEntriesAfter: finalJunctionCount,
        junctionEntriesCreated: finalJunctionCount - existingCount
      },
      timestamp: new Date().toISOString(),
      triggeredBy: session.user.email
    };
    
    apiLogger.info('[Migration API] Migration completed', result);
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    apiLogger.logError('[Migration API] Migration failed', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrate/wishlist-many-to-many
 * 
 * Check migration status without running migration
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check admin access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });
    
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    // Get current status
    const totalWishlists = await prisma.wishlist.count();
    const totalFolders = await prisma.wishlistFolder.count();
    const totalJunctionEntries = await prisma.wishlistFolderItem.count();
    
    const orphanedWishlists = await prisma.wishlist.count({
      where: {
        wishlistFolderItems: {
          none: {}
        }
      }
    });
    
    const wishlistsWithMultipleFolders = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM (
        SELECT "wishlistId"
        FROM "WishlistFolderItem"
        GROUP BY "wishlistId"
        HAVING COUNT(*) > 1
      ) as multi
    `;
    
    const status = {
      needsMigration: orphanedWishlists > 0,
      stats: {
        totalWishlists,
        totalFolders,
        totalJunctionEntries,
        orphanedWishlists,
        wishlistsWithMultipleFolders: Number(wishlistsWithMultipleFolders[0]?.count || 0)
      },
      healthScore: orphanedWishlists === 0 ? 100 : Math.max(0, 100 - (orphanedWishlists / totalWishlists * 100)),
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(status, { status: 200 });
    
  } catch (error) {
    apiLogger.logError('[Migration API] Status check failed', error as Error);
    
    return NextResponse.json(
      {
        error: 'Failed to check migration status',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
