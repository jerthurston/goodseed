/**
 * Restore Script: Wishlist Many-to-Many Migration
 * 
 * Purpose: Restore WishlistFolderItem data from backup file
 * 
 * This script allows you to restore junction table data from a backup
 * created by the rollback script
 * 
 * Steps:
 * 1. Read backup file
 * 2. Validate data structure
 * 3. Restore WishlistFolderItem entries
 * 4. Verify restoration
 * 
 * Usage:
 *   pnpm tsx scripts/restore-wishlist-from-backup.ts [backup-filename]
 * 
 * Example:
 *   pnpm tsx scripts/restore-wishlist-from-backup.ts wishlist-folder-items-backup-2026-01-22.json
 */

import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/helpers/api-logger';
import * as fs from 'fs';
import * as path from 'path';

interface BackupItem {
  id: string;
  wishlistId: string;
  wishlistFolderId: string;
  order: number | null;
  createdAt: string;
  wishlist: {
    id: string;
    userId: string;
    seedId: string;
  };
  wishlistFolder: {
    id: string;
    name: string;
    userId: string;
  };
}

async function restoreWishlistFromBackup() {
  console.log('♻️  Starting Wishlist Restoration from Backup...\n');
  
  try {
    // Step 1: Get backup filename from command line args
    const backupFilename = process.argv[2];
    
    if (!backupFilename) {
      console.error('❌ Error: Backup filename required!');
      console.log('\nUsage:');
      console.log('  pnpm tsx scripts/restore-wishlist-from-backup.ts <backup-filename>\n');
      console.log('Available backups:');
      
      const backupDir = path.join(process.cwd(), 'storage', 'backups');
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir)
          .filter(f => f.startsWith('wishlist-folder-items-backup-'))
          .sort()
          .reverse();
        
        files.forEach(file => {
          const stats = fs.statSync(path.join(backupDir, file));
          console.log(`  - ${file} (${new Date(stats.mtime).toLocaleString()})`);
        });
      }
      
      process.exit(1);
    }
    
    // Step 2: Read backup file
    const backupDir = path.join(process.cwd(), 'storage', 'backups');
    const backupPath = path.join(backupDir, backupFilename);
    
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Error: Backup file not found: ${backupPath}`);
      process.exit(1);
    }
    
    console.log(`📂 Reading backup file: ${backupFilename}`);
    const backupData: BackupItem[] = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    console.log(`✓ Found ${backupData.length} entries in backup\n`);
    
    // Step 3: Validate data structure
    console.log('🔍 Validating backup data...');
    let validEntries = 0;
    let invalidEntries = 0;
    
    const validData: BackupItem[] = [];
    
    for (const item of backupData) {
      if (item.wishlistId && item.wishlistFolderId) {
        // Check if wishlist still exists
        const wishlistExists = await prisma.wishlist.findUnique({
          where: { id: item.wishlistId }
        });
        
        // Check if folder still exists
        const folderExists = await prisma.wishlistFolder.findUnique({
          where: { id: item.wishlistFolderId }
        });
        
        if (wishlistExists && folderExists) {
          validData.push(item);
          validEntries++;
        } else {
          invalidEntries++;
          console.log(`  ⚠️  Skipping entry: wishlist ${item.wishlistId} or folder ${item.wishlistFolderId} not found`);
        }
      } else {
        invalidEntries++;
      }
    }
    
    console.log(`✓ Valid entries: ${validEntries}`);
    console.log(`⚠️  Invalid/skipped entries: ${invalidEntries}\n`);
    
    if (validEntries === 0) {
      console.log('❌ No valid entries to restore!');
      process.exit(1);
    }
    
    // Step 4: Check for existing entries
    const existingCount = await prisma.wishlistFolderItem.count();
    if (existingCount > 0) {
      console.log(`⚠️  Warning: Junction table already has ${existingCount} entries`);
      console.log('   This restore will ADD to existing data, not replace it.\n');
    }
    
    // Step 5: Restore data
    console.log('💾 Restoring WishlistFolderItem entries...');
    let restored = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const item of validData) {
      try {
        // Check if entry already exists (avoid duplicates)
        const existing = await prisma.wishlistFolderItem.findUnique({
          where: {
            wishlistId_wishlistFolderId: {
              wishlistId: item.wishlistId,
              wishlistFolderId: item.wishlistFolderId
            }
          }
        });
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Create entry
        await prisma.wishlistFolderItem.create({
          data: {
            wishlistId: item.wishlistId,
            wishlistFolderId: item.wishlistFolderId,
            order: item.order,
            // Note: Let createdAt be auto-generated (current time)
          }
        });
        
        restored++;
        
        if (restored % 10 === 0) {
          console.log(`  ✓ Restored ${restored} entries...`);
        }
      } catch (error) {
        errors++;
        console.error(`  ✗ Error restoring entry:`, error);
      }
    }
    
    console.log(`\n✅ Restored ${restored} entries`);
    console.log(`⚠️  Skipped ${skipped} duplicate entries`);
    if (errors > 0) {
      console.log(`❌ ${errors} errors encountered`);
    }
    
    // Step 6: Final verification
    console.log('\n📊 Final Statistics:');
    const totalEntries = await prisma.wishlistFolderItem.count();
    console.log(`Total junction entries: ${totalEntries}`);
    
    const wishlistsWithFolders = await prisma.wishlist.findMany({
      where: {
        wishlistFolderItems: {
          some: {}
        }
      }
    });
    
    console.log(`Wishlists with folder assignments: ${wishlistsWithFolders.length}`);
    
    // Step 7: Summary
    console.log('\n📋 Restoration Summary:');
    console.log(`  - Backup file: ${backupFilename}`);
    console.log(`  - Valid entries in backup: ${validEntries}`);
    console.log(`  - Entries restored: ${restored}`);
    console.log(`  - Duplicate entries skipped: ${skipped}`);
    console.log(`  - Errors: ${errors}`);
    console.log(`  - Final total entries: ${totalEntries}`);
    
  } catch (error) {
    console.error('\n❌ Restoration failed:', error);
    apiLogger.logError('[restore-wishlist-from-backup]', error as Error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute restoration
restoreWishlistFromBackup()
  .then(() => {
    console.log('\n🎉 Restoration script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Restoration script failed:', error);
    process.exit(1);
  });
