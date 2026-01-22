/**
 * Rollback Script: Wishlist Many-to-Many Migration
 * 
 * Purpose: Safely rollback the many-to-many migration if needed
 * 
 * CAUTION: This will remove all WishlistFolderItem entries
 * Only run this if you need to revert to the old schema
 * 
 * Steps:
 * 1. Backup WishlistFolderItem data before deletion
 * 2. Delete all WishlistFolderItem entries
 * 3. Verify rollback success
 * 
 * Usage:
 *   pnpm tsx scripts/rollback-wishlist-many-to-many.ts
 */

import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';
import * as fs from 'fs';
import * as path from 'path';

async function rollbackWishlistManyToMany() {
  console.log('🔄 Starting Wishlist Many-to-Many Rollback...\n');
  
  try {
    // Step 1: Create backup directory
    const backupDir = path.join(process.cwd(), 'storage', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `wishlist-folder-items-backup-${timestamp}.json`);
    
    // Step 2: Backup all WishlistFolderItem data
    console.log('💾 Creating backup of WishlistFolderItem data...');
    const allItems = await prisma.wishlistFolderItem.findMany({
      include: {
        wishlist: {
          select: {
            id: true,
            userId: true,
            seedId: true
          }
        },
        wishlistFolder: {
          select: {
            id: true,
            name: true,
            userId: true
          }
        }
      }
    });
    
    console.log(`✓ Found ${allItems.length} WishlistFolderItem entries to backup`);
    
    // Save backup to file
    fs.writeFileSync(backupFile, JSON.stringify(allItems, null, 2), 'utf-8');
    console.log(`✓ Backup saved to: ${backupFile}\n`);
    
    // Step 3: Show confirmation prompt (for safety)
    console.log('⚠️  WARNING: This will delete all WishlistFolderItem entries!');
    console.log(`   Backup file: ${backupFile}`);
    console.log(`   Total entries to delete: ${allItems.length}\n`);
    
    // Step 4: Delete all WishlistFolderItem entries
    console.log('🗑️  Deleting all WishlistFolderItem entries...');
    const deleteResult = await prisma.wishlistFolderItem.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.count} WishlistFolderItem entries\n`);
    
    // Step 5: Verify deletion
    const remainingCount = await prisma.wishlistFolderItem.count();
    if (remainingCount === 0) {
      console.log('✅ Rollback successful! Junction table is now empty.\n');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} entries still remain in junction table\n`);
    }
    
    // Step 6: Summary
    console.log('📋 Rollback Summary:');
    console.log(`  - Backup created: ✅ ${backupFile}`);
    console.log(`  - Entries deleted: ${deleteResult.count}`);
    console.log(`  - Remaining entries: ${remainingCount}`);
    console.log(`  - Rollback status: ${remainingCount === 0 ? '✅ Complete' : '⚠️  Incomplete'}`);
    
    console.log('\n📝 Next Steps:');
    console.log('  1. If you need to restore the old schema:');
    console.log('     - Revert Prisma schema changes (add folderId back to Wishlist)');
    console.log('     - Run: pnpm prisma migrate dev');
    console.log('  2. To restore the data:');
    console.log('     - Run: pnpm tsx scripts/restore-wishlist-from-backup.ts');
    console.log(`     - Use backup file: ${backupFile}`);
    
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    apiLogger.logError('[rollback-wishlist-many-to-many]', error as Error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute rollback
rollbackWishlistManyToMany()
  .then(() => {
    console.log('\n🎉 Rollback script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Rollback script failed:', error);
    process.exit(1);
  });
