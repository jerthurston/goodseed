/**
 * Verification Script: Wishlist Data Integrity Check
 * 
 * Purpose: Comprehensive check of wishlist data integrity after migration
 * 
 * This script verifies:
 * 1. All wishlists have at least one folder assignment
 * 2. No orphaned WishlistFolderItem entries
 * 3. All folder references are valid
 * 4. Many-to-many relationships are working
 * 5. Data consistency across tables
 * 
 * Usage:
 *   pnpm tsx scripts/verify-wishlist-integrity.ts
 */

import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';

interface IntegrityReport {
  totalWishlists: number;
  wishlistsWithFolders: number;
  orphanedWishlists: number;
  totalFolders: number;
  totalJunctionEntries: number;
  orphanedJunctionEntries: number;
  wishlistsWithMultipleFolders: number;
  issues: string[];
  warnings: string[];
}

async function verifyWishlistIntegrity() {
  console.log('🔍 Starting Wishlist Data Integrity Check...\n');
  
  const report: IntegrityReport = {
    totalWishlists: 0,
    wishlistsWithFolders: 0,
    orphanedWishlists: 0,
    totalFolders: 0,
    totalJunctionEntries: 0,
    orphanedJunctionEntries: 0,
    wishlistsWithMultipleFolders: 0,
    issues: [],
    warnings: []
  };
  
  try {
    // Check 1: Count all wishlists
    console.log('📊 Check 1: Counting wishlists...');
    report.totalWishlists = await prisma.wishlist.count();
    console.log(`✓ Total wishlists: ${report.totalWishlists}\n`);
    
    // Check 2: Count all folders
    console.log('📊 Check 2: Counting wishlist folders...');
    report.totalFolders = await prisma.wishlistFolder.count();
    console.log(`✓ Total folders: ${report.totalFolders}\n`);
    
    // Check 3: Count junction table entries
    console.log('📊 Check 3: Counting junction table entries...');
    report.totalJunctionEntries = await prisma.wishlistFolderItem.count();
    console.log(`✓ Total junction entries: ${report.totalJunctionEntries}\n`);
    
    // Check 4: Find wishlists with folder assignments
    console.log('📊 Check 4: Checking folder assignments...');
    const wishlistsWithFolders = await prisma.wishlist.findMany({
      where: {
        wishlistFolderItems: {
          some: {}
        }
      },
      select: { id: true }
    });
    
    report.wishlistsWithFolders = wishlistsWithFolders.length;
    report.orphanedWishlists = report.totalWishlists - report.wishlistsWithFolders;
    
    console.log(`✓ Wishlists with folders: ${report.wishlistsWithFolders}`);
    console.log(`${report.orphanedWishlists > 0 ? '⚠️ ' : '✓'} Orphaned wishlists: ${report.orphanedWishlists}\n`);
    
    if (report.orphanedWishlists > 0) {
      report.issues.push(`Found ${report.orphanedWishlists} wishlists without folder assignments`);
      
      // Get details of orphaned wishlists
      const orphaned = await prisma.wishlist.findMany({
        where: {
          wishlistFolderItems: {
            none: {}
          }
        },
        select: {
          id: true,
          userId: true,
          seedId: true,
          createdAt: true
        },
        take: 5
      });
      
      console.log('  Sample orphaned wishlists:');
      orphaned.forEach(w => {
        console.log(`    - ID: ${w.id}, User: ${w.userId}, Seed: ${w.seedId}`);
      });
      console.log('');
    }
    
    // Check 5: Find orphaned junction entries (invalid references)
    console.log('📊 Check 5: Checking for orphaned junction entries...');
    const allJunctionEntries = await prisma.wishlistFolderItem.findMany({
      include: {
        wishlist: true,
        wishlistFolder: true
      }
    });
    
    const orphanedEntries = allJunctionEntries.filter(
      entry => !entry.wishlist || !entry.wishlistFolder
    );
    
    report.orphanedJunctionEntries = orphanedEntries.length;
    
    console.log(`${report.orphanedJunctionEntries > 0 ? '⚠️ ' : '✓'} Orphaned junction entries: ${report.orphanedJunctionEntries}\n`);
    
    if (report.orphanedJunctionEntries > 0) {
      report.issues.push(`Found ${report.orphanedJunctionEntries} junction entries with invalid references`);
      console.log('  Sample orphaned entries:');
      orphanedEntries.slice(0, 5).forEach(e => {
        console.log(`    - Entry ID: ${e.id}, Wishlist: ${e.wishlistId}, Folder: ${e.wishlistFolderId}`);
      });
      console.log('');
    }
    
    // Check 6: Find wishlists with multiple folders (many-to-many working)
    console.log('📊 Check 6: Checking many-to-many relationships...');
    const multiFolder = await prisma.$queryRaw<Array<{ wishlistId: string; count: bigint }>>`
      SELECT "wishlistId", COUNT(*) as count
      FROM "WishlistFolderItem"
      GROUP BY "wishlistId"
      HAVING COUNT(*) > 1
    `;
    
    report.wishlistsWithMultipleFolders = multiFolder.length;
    console.log(`✓ Wishlists with multiple folders: ${report.wishlistsWithMultipleFolders}`);
    
    if (report.wishlistsWithMultipleFolders > 0) {
      console.log('  Many-to-many is working! ✨');
      console.log(`  Sample: ${multiFolder[0]?.wishlistId} has ${Number(multiFolder[0]?.count)} folders`);
    } else {
      report.warnings.push('No wishlists have multiple folders yet (many-to-many not in use)');
    }
    console.log('');
    
    // Check 7: Verify folder ownership consistency
    console.log('📊 Check 7: Checking folder ownership consistency...');
    const inconsistentEntries = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "WishlistFolderItem" wfi
      JOIN "Wishlist" w ON w.id = wfi."wishlistId"
      JOIN "WishlistFolder" wf ON wf.id = wfi."wishlistFolderId"
      WHERE w."userId" != wf."userId"
    `;
    
    const inconsistentCount = Number(inconsistentEntries[0]?.count || 0);
    console.log(`${inconsistentCount > 0 ? '⚠️ ' : '✓'} Inconsistent ownership: ${inconsistentCount}\n`);
    
    if (inconsistentCount > 0) {
      report.issues.push(`Found ${inconsistentCount} entries where wishlist owner != folder owner`);
    }
    
    // Check 8: Verify unique constraints
    console.log('📊 Check 8: Checking for duplicate entries...');
    const duplicates = await prisma.$queryRaw<Array<{ wishlistId: string; wishlistFolderId: string; count: bigint }>>`
      SELECT "wishlistId", "wishlistFolderId", COUNT(*) as count
      FROM "WishlistFolderItem"
      GROUP BY "wishlistId", "wishlistFolderId"
      HAVING COUNT(*) > 1
    `;
    
    console.log(`${duplicates.length > 0 ? '⚠️ ' : '✓'} Duplicate entries: ${duplicates.length}\n`);
    
    if (duplicates.length > 0) {
      report.issues.push(`Found ${duplicates.length} duplicate wishlist-folder combinations`);
      console.log('  This should NOT happen due to unique constraint!');
    }
    
    // Generate final report
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 INTEGRITY REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📊 Statistics:');
    console.log(`  Total Wishlists: ${report.totalWishlists}`);
    console.log(`  Total Folders: ${report.totalFolders}`);
    console.log(`  Total Junction Entries: ${report.totalJunctionEntries}`);
    console.log(`  Wishlists with Folders: ${report.wishlistsWithFolders} (${((report.wishlistsWithFolders/report.totalWishlists)*100).toFixed(1)}%)`);
    console.log(`  Many-to-Many Usage: ${report.wishlistsWithMultipleFolders} wishlists\n`);
    
    // Calculate health score
    let healthScore = 100;
    
    if (report.orphanedWishlists > 0) {
      healthScore -= 40;
    }
    if (report.orphanedJunctionEntries > 0) {
      healthScore -= 30;
    }
    if (inconsistentCount > 0) {
      healthScore -= 20;
    }
    if (duplicates.length > 0) {
      healthScore -= 10;
    }
    
    console.log('🏥 Health Score:', healthScore + '/100');
    
    if (healthScore === 100) {
      console.log('   Status: ✅ EXCELLENT - No issues found!\n');
    } else if (healthScore >= 80) {
      console.log('   Status: ⚠️  GOOD - Minor issues detected\n');
    } else if (healthScore >= 60) {
      console.log('   Status: ⚠️  FAIR - Some issues need attention\n');
    } else {
      console.log('   Status: ❌ POOR - Critical issues found!\n');
    }
    
    // List issues
    if (report.issues.length > 0) {
      console.log('❌ Issues Found:');
      report.issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
      console.log('');
    }
    
    // List warnings
    if (report.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      report.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
      console.log('');
    }
    
    // Recommendations
    if (report.orphanedWishlists > 0) {
      console.log('💡 Recommendations:');
      console.log('  → Run migration script to fix orphaned wishlists:');
      console.log('    pnpm tsx scripts/migrate-wishlist-many-to-many.ts\n');
    }
    
    if (report.orphanedJunctionEntries > 0) {
      console.log('💡 Recommendations:');
      console.log('  → Clean up orphaned junction entries:');
      console.log('    DELETE FROM "WishlistFolderItem" WHERE "wishlistId" NOT IN (SELECT id FROM "Wishlist")\n');
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Exit with appropriate code
    if (report.issues.length > 0) {
      console.log('⚠️  Integrity check completed with issues\n');
      process.exit(1);
    } else {
      console.log('✅ Integrity check passed!\n');
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    apiLogger.logError('[verify-wishlist-integrity]', error as Error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute verification
verifyWishlistIntegrity()
  .then(() => {
    console.log('🎉 Verification script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Verification script failed:', error);
    process.exit(1);
  });
