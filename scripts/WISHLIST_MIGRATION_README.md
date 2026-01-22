# Wishlist Migration Scripts

This directory contains scripts for managing the Wishlist Many-to-Many migration and data integrity.

## 📚 Available Scripts

### 1. Migration Script
**File**: `migrate-wishlist-many-to-many.ts`

**Purpose**: Migrate wishlist data from one-to-many to many-to-many relationship

**Usage**:
```bash
pnpm tsx scripts/migrate-wishlist-many-to-many.ts
```

**What it does**:
- ✅ Checks current migration status
- 🔍 Finds wishlists without folder assignments (orphaned)
- 🔧 Auto-assigns orphaned wishlists to "Uncategorized" folder
- ✅ Creates WishlistFolderItem junction table entries
- 📊 Generates detailed statistics report

**When to run**:
- After deploying new schema to production
- When you have orphaned wishlists
- First time setup for many-to-many relationships

**Safe to run multiple times**: ✅ Yes (idempotent)

---

### 2. Rollback Script
**File**: `rollback-wishlist-many-to-many.ts`

**Purpose**: Safely rollback the many-to-many migration

**Usage**:
```bash
pnpm tsx scripts/rollback-wishlist-many-to-many.ts
```

**What it does**:
- 💾 Creates backup of all WishlistFolderItem data
- 📁 Saves backup to `storage/backups/`
- 🗑️ Deletes all junction table entries
- ✅ Verifies deletion success

**When to run**:
- When you need to revert to old schema
- Before schema changes
- For emergency rollback

**⚠️ Warning**: This will delete all junction table data (but creates backup first)

---

### 3. Restore Script
**File**: `restore-wishlist-from-backup.ts`

**Purpose**: Restore junction table data from backup file

**Usage**:
```bash
pnpm tsx scripts/restore-wishlist-from-backup.ts <backup-filename>
```

**Example**:
```bash
pnpm tsx scripts/restore-wishlist-from-backup.ts wishlist-folder-items-backup-2026-01-22T10-30-00.json
```

**What it does**:
- 📂 Reads backup file from `storage/backups/`
- 🔍 Validates data integrity
- ✅ Restores WishlistFolderItem entries
- 🚫 Skips duplicate entries (no duplicates)
- 📊 Provides restoration statistics

**When to run**:
- After accidental data deletion
- When restoring from rollback
- For data recovery

---

### 4. Integrity Verification Script
**File**: `verify-wishlist-integrity.ts`

**Purpose**: Comprehensive data integrity check

**Usage**:
```bash
pnpm tsx scripts/verify-wishlist-integrity.ts
```

**What it checks**:
- ✅ All wishlists have folder assignments
- ✅ No orphaned junction entries
- ✅ Valid folder references
- ✅ Many-to-many relationships working
- ✅ Folder ownership consistency
- ✅ No duplicate entries
- 📊 Generates health score (0-100)

**When to run**:
- After migration to verify success
- Regular maintenance checks
- Before/after schema changes
- When investigating data issues

**Exit codes**:
- `0`: All checks passed
- `1`: Issues found (check output)

---

## 🔄 Migration Workflow

### Initial Migration (Development → Production)

```bash
# Step 1: Verify current state
pnpm tsx scripts/verify-wishlist-integrity.ts

# Step 2: Run migration
pnpm tsx scripts/migrate-wishlist-many-to-many.ts

# Step 3: Verify migration success
pnpm tsx scripts/verify-wishlist-integrity.ts
```

### Rollback Workflow (if needed)

```bash
# Step 1: Rollback migration (creates backup)
pnpm tsx scripts/rollback-wishlist-many-to-many.ts

# Step 2: Revert schema changes
# - Edit prisma/schema.prisma
# - Add folderId back to Wishlist model
# - Run: pnpm prisma migrate dev

# Step 3: (Optional) Restore data
pnpm tsx scripts/restore-wishlist-from-backup.ts <backup-file>
```

---

## 📊 Script Output Examples

### Migration Success
```
🚀 Starting Wishlist Many-to-Many Migration...

📊 Checking schema status...
✓ Found 0 existing WishlistFolderItem entries

📦 Total wishlists: 150
✓ Wishlists with folders: 120
⚠️  Wishlists without folders: 30

🔧 Fixing orphaned wishlists (assigning to Uncategorized)...
  ✓ Created Uncategorized folder for user abc123
  ✓ Fixed 10 wishlists...
  ✓ Fixed 20 wishlists...
  ✓ Fixed 30 wishlists...

✅ Fixed 30 orphaned wishlists

📊 Final Statistics:
Total junction entries: 150
Unique folders with assignments: 8
Wishlists with multiple folders: 0

✅ Migration verification completed!

📋 Summary:
  - Schema updated: ✅ WishlistFolderItem junction table active
  - Data migrated: ✅ All wishlists have folder assignments
  - Many-to-many ready: ✅ System supports multiple folders per wishlist
  - Orphaned wishlists: ✅ Auto-assigned to Uncategorized

🎉 Migration script completed successfully!
```

### Integrity Check Success
```
🔍 Starting Wishlist Data Integrity Check...

📊 Check 1: Counting wishlists...
✓ Total wishlists: 150

📊 Check 2: Counting wishlist folders...
✓ Total folders: 8

📊 Check 3: Counting junction table entries...
✓ Total junction entries: 150

📊 Check 4: Checking folder assignments...
✓ Wishlists with folders: 150
✓ Orphaned wishlists: 0

📊 Check 5: Checking for orphaned junction entries...
✓ Orphaned junction entries: 0

📊 Check 6: Checking many-to-many relationships...
✓ Wishlists with multiple folders: 5
  Many-to-many is working! ✨

📊 Check 7: Checking folder ownership consistency...
✓ Inconsistent ownership: 0

📊 Check 8: Checking for duplicate entries...
✓ Duplicate entries: 0

═══════════════════════════════════════════════════════════
📋 INTEGRITY REPORT
═══════════════════════════════════════════════════════════

📊 Statistics:
  Total Wishlists: 150
  Total Folders: 8
  Total Junction Entries: 150
  Wishlists with Folders: 150 (100.0%)
  Many-to-Many Usage: 5 wishlists

🏥 Health Score: 100/100
   Status: ✅ EXCELLENT - No issues found!

═══════════════════════════════════════════════════════════

✅ Integrity check passed!

🎉 Verification script completed!
```

---

## 🗂️ Backup Files

Backup files are stored in: `storage/backups/`

**Filename format**: `wishlist-folder-items-backup-YYYY-MM-DDTHH-MM-SS.json`

**Example**: `wishlist-folder-items-backup-2026-01-22T10-30-00.json`

**Structure**:
```json
[
  {
    "id": "clx123...",
    "wishlistId": "clx456...",
    "wishlistFolderId": "clx789...",
    "order": 0,
    "createdAt": "2026-01-22T10:30:00.000Z",
    "wishlist": {
      "id": "clx456...",
      "userId": "user123",
      "seedId": "seed789"
    },
    "wishlistFolder": {
      "id": "clx789...",
      "name": "My Favorites",
      "userId": "user123"
    }
  }
]
```

---

## 🚨 Troubleshooting

### Issue: "Orphaned wishlists found"
**Solution**: Run migration script
```bash
pnpm tsx scripts/migrate-wishlist-many-to-many.ts
```

### Issue: "Junction entries with invalid references"
**Solution**: Clean up manually or run rollback + restore
```bash
# Rollback
pnpm tsx scripts/rollback-wishlist-many-to-many.ts

# Then migrate fresh
pnpm tsx scripts/migrate-wishlist-many-to-many.ts
```

### Issue: "Duplicate entries found"
**Solution**: This shouldn't happen due to unique constraint. If it does:
```sql
-- Manual cleanup (run in DB console)
DELETE FROM "WishlistFolderItem" wfi1
WHERE wfi1."id" > (
  SELECT MIN(wfi2."id")
  FROM "WishlistFolderItem" wfi2
  WHERE wfi2."wishlistId" = wfi1."wishlistId"
  AND wfi2."wishlistFolderId" = wfi1."wishlistFolderId"
);
```

### Issue: "Backup file not found"
**Solution**: List available backups
```bash
ls -la storage/backups/
```

---

## 📝 Notes

- All scripts use Prisma transactions for data safety
- Scripts are idempotent (safe to run multiple times)
- Backup files are timestamped (no overwrites)
- Exit codes: 0 = success, 1 = failure/issues
- All operations are logged with apiLogger

---

## 🔐 Production Deployment Checklist

- [ ] Backup production database
- [ ] Test scripts in staging environment
- [ ] Run integrity check BEFORE migration
- [ ] Run migration script
- [ ] Run integrity check AFTER migration
- [ ] Monitor application logs for errors
- [ ] Keep rollback script ready for emergency
- [ ] Document backup file location

---

## 📞 Support

If you encounter issues:
1. Check script output for error messages
2. Run integrity verification for diagnostics
3. Check backup files in `storage/backups/`
4. Review Prisma schema for consistency
5. Check application logs for runtime errors

For help: Contact development team
