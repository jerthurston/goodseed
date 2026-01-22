# 🚀 Production Fix Deployment Checklist

## 📋 Tổng quan vấn đề

**Lỗi hiện tại**:
- ❌ 500 Error: `/api/seed` - Table `WishlistFolderItem` không tồn tại
- ❌ 401 Error: `/api/me/wishlist-folder` - Hook gọi API khi chưa login

**Root cause**:
- Production database chưa có bảng `WishlistFolderItem` (many-to-many junction table)
- Code mới query table này → crash

---

## ✅ DEPLOYMENT TASKS

### Phase 1: Preparation (15 phút)

- [ ] **1.1. Backup Production Database**
  ```bash
  # AWS RDS Snapshot
  aws rds create-db-snapshot \
    --db-instance-identifier goodseed-production \
    --db-snapshot-identifier pre-wishlist-refactor-$(date +%Y%m%d-%H%M%S)
  ```
  
- [ ] **1.2. Review Migration Files**
  - [ ] Check: `prisma/migrations/20260122_refactor_wishlist_many_to_many/migration.sql`
  - [ ] Verify SQL tạo table `WishlistFolderItem`
  - [ ] Verify indexes và foreign keys

- [ ] **1.3. Test Migration Locally**
  ```bash
  # Reset local DB to test migration
  pnpm prisma migrate reset --force
  
  # Re-apply all migrations
  pnpm prisma migrate deploy
  
  # Verify
  pnpm prisma migrate status
  ```

- [ ] **1.4. Commit All Changes**
  ```bash
  git status
  git add .
  git commit -m "feat: add wishlist many-to-many migration and API"
  git push origin feature/fixing-production
  ```

---

### Phase 2: Schema Migration (5-10 phút)

- [ ] **2.1. Check Current Production Schema**
  ```bash
  # Set production DATABASE_URL
  export DATABASE_URL="your-production-database-url"
  
  # Check migration status
  pnpm prisma migrate status
  ```
  
  **Expected Output**: "1 migration has not been applied"

- [ ] **2.2. Deploy Schema Migration**
  ```bash
  # Apply pending migrations
  pnpm prisma migrate deploy
  ```
  
  **Expected Output**: 
  ```
  1 migration found in prisma/migrations
  Applying migration `20260122_refactor_wishlist_many_to_many`
  ✅ Migration applied successfully
  ```

- [ ] **2.3. Verify Table Created**
  ```bash
  # Connect to production DB
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"WishlistFolderItem\";"
  ```
  
  **Expected Output**: `0` (table exists, empty)

---

### Phase 3: Code Deployment (5-10 phút)

- [ ] **3.1. Merge to Main/Production Branch**
  ```bash
  git checkout develop  # or main/production
  git merge feature/fixing-production
  git push origin develop
  ```

- [ ] **3.2. Deploy via CI/CD or Manual**
  
  **Option A: CI/CD (Automatic)**
  - Push sẽ trigger auto-deployment
  - Monitor build logs
  
  **Option B: Manual Docker Build**
  ```bash
  # Build image
  docker build -t goodseed-app:latest .
  
  # Tag for ECR
  docker tag goodseed-app:latest YOUR_ECR_REPO/goodseed-app:latest
  
  # Push to ECR
  docker push YOUR_ECR_REPO/goodseed-app:latest
  
  # Update ECS service
  aws ecs update-service \
    --cluster goodseed-cluster \
    --service goodseed-app \
    --force-new-deployment
  ```

- [ ] **3.3. Wait for Deployment Complete**
  ```bash
  # Check ECS service status
  aws ecs describe-services \
    --cluster goodseed-cluster \
    --services goodseed-app \
    --query 'services[0].deployments'
  ```
  
  **Wait until**: `runningCount` = `desiredCount`

---

### Phase 4: Data Migration (2-5 phút)

- [ ] **4.1. Login as Admin**
  - Open: https://lembooking.com
  - Login with admin account
  - F12 → Application → Cookies
  - Copy session cookie value

- [ ] **4.2. Check Migration Status**
  ```bash
  curl -X GET \
    -H "Cookie: __Secure-next-auth.session-token=YOUR_SESSION_TOKEN" \
    https://lembooking.com/api/admin/migrate/wishlist-many-to-many
  ```
  
  **Expected Response**:
  ```json
  {
    "needsMigration": true,
    "stats": {
      "orphanedWishlists": 150
    }
  }
  ```

- [ ] **4.3. Run Data Migration**
  ```bash
  curl -X POST \
    -H "Cookie: __Secure-next-auth.session-token=YOUR_SESSION_TOKEN" \
    -H "Content-Type: application/json" \
    https://lembooking.com/api/admin/migrate/wishlist-many-to-many
  ```
  
  **Expected Response**:
  ```json
  {
    "success": true,
    "migration": {
      "fixed": 150,
      "errors": 0
    }
  }
  ```

- [ ] **4.4. Verify Migration Complete**
  ```bash
  # Check status again
  curl -X GET \
    -H "Cookie: __Secure-next-auth.session-token=YOUR_SESSION_TOKEN" \
    https://lembooking.com/api/admin/migrate/wishlist-many-to-many
  ```
  
  **Expected**: `"orphanedWishlists": 0`, `"healthScore": 100`

---

### Phase 5: Verification (10 phút)

- [ ] **5.1. Test API Endpoints**
  
  **Test /api/seed** (was returning 500):
  ```bash
  curl https://lembooking.com/api/seed?page=1&limit=10
  ```
  **Expected**: 200 OK, returns seeds array
  
  **Test /api/me/wishlist-folder**:
  ```bash
  curl -H "Cookie: YOUR_SESSION_TOKEN" \
    https://lembooking.com/api/me/wishlist-folder
  ```
  **Expected**: 200 OK, returns folders array

- [ ] **5.2. Manual UI Testing**
  - [ ] Open homepage: https://lembooking.com
  - [ ] Check seed browse page loads
  - [ ] Login as user
  - [ ] Navigate to /dashboard/user/favorites
  - [ ] Check wishlist folders display
  - [ ] Try adding seed to wishlist
  - [ ] Try moving seed between folders

- [ ] **5.3. Check CloudWatch Logs**
  ```bash
  # Check for errors in last 10 minutes
  aws logs filter-pattern "/aws/ecs/goodseed-cluster/app" \
    --pattern "ERROR" \
    --start-time $(date -u -d '10 minutes ago' +%s)000
  ```
  
  **Expected**: No critical errors

- [ ] **5.4. Check Database State**
  ```bash
  # Connect to production
  export DATABASE_URL="your-production-url"
  
  # Verify junction table has entries
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"WishlistFolderItem\";"
  
  # Check no orphaned wishlists
  psql $DATABASE_URL -c "
    SELECT COUNT(*) FROM \"Wishlist\" w 
    WHERE NOT EXISTS (
      SELECT 1 FROM \"WishlistFolderItem\" wfi 
      WHERE wfi.\"wishlistId\" = w.id
    );
  "
  ```
  
  **Expected**: Junction table has entries, 0 orphaned wishlists

---

### Phase 6: Monitoring (24 giờ)

- [ ] **6.1. Set up Alerts** (nếu chưa có)
  - [ ] Error rate > 5%
  - [ ] Response time > 2s
  - [ ] 500 errors spike

- [ ] **6.2. Monitor Key Metrics**
  - [ ] Error rate: Should stay < 1%
  - [ ] /api/seed response time: < 500ms
  - [ ] Database connections: Normal
  - [ ] ECS task health: All healthy

- [ ] **6.3. Check User Reports**
  - [ ] Monitor support channels
  - [ ] Check for user complaints
  - [ ] Watch for error reports

---

## 🆘 ROLLBACK PLAN (Nếu có vấn đề)

### Rollback Code

```bash
# Revert to previous ECS task definition
aws ecs update-service \
  --cluster goodseed-cluster \
  --service goodseed-app \
  --task-definition goodseed-app:PREVIOUS_VERSION
```

### Rollback Database (CRITICAL - Only if absolutely necessary)

```bash
# Option 1: Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier goodseed-production-rollback \
  --db-snapshot-identifier your-backup-snapshot-id

# Option 2: Manual SQL rollback
psql $DATABASE_URL <<EOF
-- Delete junction entries
DELETE FROM "WishlistFolderItem";

-- Drop table
DROP TABLE IF EXISTS "WishlistFolderItem";
EOF
```

---

## 📝 COMMANDS QUICK REFERENCE

### Essential Prisma Commands

```bash
# Check migration status
pnpm prisma migrate status

# Deploy pending migrations
pnpm prisma migrate deploy

# View database in GUI
pnpm prisma studio

# Generate Prisma Client
pnpm prisma generate

# Reset database (⚠️ DEV ONLY)
pnpm prisma migrate reset
```

### Production DATABASE_URL Setup

```bash
# Temporary (current terminal session)
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# Or create .env.production.local (DON'T commit!)
echo 'DATABASE_URL="postgresql://..."' > .env.production.local
```

### AWS Commands

```bash
# ECS service status
aws ecs describe-services \
  --cluster goodseed-cluster \
  --services goodseed-app

# CloudWatch logs
aws logs tail /aws/ecs/goodseed-cluster/app --follow

# RDS snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier goodseed-production
```

---

## ⏱️ TIMELINE ESTIMATE

| Phase | Duration | Can Fail? |
|-------|----------|-----------|
| Preparation | 15 min | Low |
| Schema Migration | 5-10 min | Medium |
| Code Deployment | 5-10 min | Low |
| Data Migration | 2-5 min | Low |
| Verification | 10 min | - |
| **TOTAL** | **40-50 min** | |

---

## ✅ SUCCESS CRITERIA

Deployment considered successful when ALL these are true:

- [ ] ✅ Schema migration applied successfully
- [ ] ✅ Code deployment completed
- [ ] ✅ Data migration: 0 orphaned wishlists
- [ ] ✅ `/api/seed` returns 200 (not 500)
- [ ] ✅ `/api/me/wishlist-folder` returns 200 for authenticated users
- [ ] ✅ No errors in CloudWatch logs
- [ ] ✅ All ECS tasks healthy
- [ ] ✅ Manual UI testing passed
- [ ] ✅ Error rate < 1%

---

## 📞 EMERGENCY CONTACTS

If critical issues:
1. Check CloudWatch logs first
2. Check ECS task status
3. Check RDS connections
4. Consider rollback if error rate > 10%

---

## 📚 DOCUMENTS TO REFERENCE

- Migration API: `app/api/admin/migrate/wishlist-many-to-many/route.ts`
- Migration SQL: `prisma/migrations/20260122_refactor_wishlist_many_to_many/migration.sql`
- Full Guide: `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- Migration Guide: `docs/PRODUCTION_MIGRATION_GUIDE.md`

---

## 🎯 FINAL CHECKLIST

Before starting:
- [ ] All code committed and pushed
- [ ] Database backup created
- [ ] Team notified
- [ ] Maintenance window scheduled (if needed)
- [ ] Admin credentials ready
- [ ] AWS CLI configured
- [ ] Monitoring dashboards open

**Ready to start? Check all items above!** ✅
