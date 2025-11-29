# Seed Supreme Scraper - Maintenance Checklist

> **Purpose**: Quick reference for maintaining Seed Supreme scraper in production
> **Last Updated**: 2025-11-28
> **Status**: ✅ Production Ready

---

## 📂 Files to Maintain

### 🔧 Core Production Files (Must Maintain)

| # | File Path | Lines | Purpose | Priority |
|---|-----------|-------|---------|----------|
| 1 | `scrapers/seedsupreme/selectors.ts` | 127 | CSS selectors for scraping | 🔴 Critical |
| 2 | `scrapers/seedsupreme/types.ts` | 114 | TypeScript interfaces | 🔴 Critical |
| 3 | `scrapers/seedsupreme/category-scraper.ts` | 218 | Category page scraper | 🔴 Critical |
| 4 | `scrapers/seedsupreme/product-scraper.ts` | 252 | Product detail scraper | 🔴 Critical |
| 5 | `scrapers/seedsupreme/full-scraper.ts` | 151 | Pipeline orchestrator | 🔴 Critical |
| 6 | `scrapers/seedsupreme/db-service.ts` | 389 | Database operations | 🔴 Critical |

**Total Core**: 6 files, 1,251 lines

---

### 🧪 Test Files (Maintain for QA)

| # | File Path | Lines | Purpose | Priority |
|---|-----------|-------|---------|----------|
| 7 | `scripts/test/inspect-seedsupreme-html.ts` | 95 | HTML structure inspector | 🟡 Medium |
| 8 | `scripts/test/test-seedsupreme-category.ts` | 95 | Category scraper test | 🟢 Low |
| 9 | `scripts/test/test-seedsupreme-product.ts` | 124 | Product scraper test | 🟢 Low |
| 10 | `scripts/test/test-seedsupreme-full.ts` | 163 | Full pipeline test | 🟡 Medium |
| 11 | `scripts/test/test-seedsupreme-db.ts` | 145 | Database integration test | 🟡 Medium |
| 12 | `scripts/test/test-seedsupreme-bulk.ts` | 168 | Bulk scraping test | 🟡 Medium |

**Total Tests**: 6 files, 790 lines

---

### 📊 Check/Monitor Files (Maintain for Operations)

| # | File Path | Lines | Purpose | Priority |
|---|-----------|-------|---------|----------|
| 13 | `scripts/check/check-seedsupreme-db.ts` | 89 | Check Seed Supreme data | 🟡 Medium |
| 14 | `scripts/check/check-all-seeds-stats.ts` | 226 | Database statistics | 🟡 Medium |

**Total Checks**: 2 files, 315 lines

---

### 📚 Documentation Files (Keep Updated)

| # | File Path | Lines | Purpose | Priority |
|---|-----------|-------|---------|----------|
| 15 | `docs/scraper/seedsupreme/README.md` | ~350 | Overview & quick start | 🔴 Critical |
| 16 | `docs/scraper/seedsupreme/implementation-steps.md` | ~1060 | Step-by-step guide | 🟡 Medium |
| 17 | `docs/scraper/seedsupreme/PRODUCTION_FILES.md` | ~450 | Files reference | 🟡 Medium |
| 18 | `docs/scraper/seedsupreme/MAINTENANCE.md` | ~200 | This file | 🟢 Low |

**Total Docs**: 4 files

---

## 🚨 Critical Maintenance Points

### 1. **CSS Selectors** (`selectors.ts`) 🔴
**Why Critical**: Website changes break scraping immediately

**Monitor**:
- `.product-item` - Product cards on category pages
- `table tr:contains("x")` - Pack options table
- `td:contains("Label") + td` - Specification values

**Action if broken**:
```bash
# 1. Run HTML inspector to check selectors
pnpm tsx scripts/test/inspect-seedsupreme-html.ts

# 2. Update selectors.ts if needed
# 3. Re-test all scrapers
pnpm tsx scripts/test/test-seedsupreme-full.ts feminized-seeds 1 5
```

---

### 2. **Database Schema** (`prisma/schema.prisma`) 🔴
**Why Critical**: Schema changes require migrations

**Key Models**:
- `Seller` - Seed bank info
- `Seed` - Product records (one per pack size)
- `Image`, `SeedImage` - Image relationships
- `ScrapeLog` - Scraping history

**Action if schema changes**:
```bash
# 1. Edit schema.prisma
# 2. Create migration
pnpm prisma migrate dev --name <migration_name>

# 3. Test database integration
pnpm tsx scripts/test/test-seedsupreme-db.ts feminized-seeds 1 3
```

---

### 3. **Pack Options Parsing** (`product-scraper.ts`) 🔴
**Why Critical**: Pricing data must be accurate

**Pattern**: `/(\d+)\s*x/i` to find pack sizes (4x, 8x, etc.)

**Validation**:
```bash
# Test 3 products to verify pack extraction
pnpm tsx scripts/test/test-seedsupreme-product.ts

# Check for:
# - Pack sizes detected (4x, 8x, 12x, 25x, 100x)
# - Prices extracted correctly
# - pricePerSeed calculated properly
```

---

### 4. **Data Transformation** (`db-service.ts`) 🔴
**Why Critical**: Enum mapping and THC/CBD parsing

**Key Functions**:
- `mapSeedType()` - Text → `SeedType` enum
- `mapCannabisType()` - Text → `CannabisType` enum
- `extractThcCbd()` - "Very High (over 20%)" → `thcMin: 20, thcMax: 30`

**Validation**:
```bash
# Check database for correct enum values
pnpm tsx scripts/check/check-all-seeds-stats.ts

# Verify:
# - Seed types (FEMINIZED, AUTOFLOWER, REGULAR)
# - Cannabis types (HYBRID, INDICA, SATIVA)
# - THC ranges (numeric, not null)
```

---

## 🔄 Regular Maintenance Tasks

### Daily
- [ ] **Check scrape logs** - `SELECT * FROM "ScrapeLog" ORDER BY timestamp DESC LIMIT 10`
- [ ] **Monitor errors** - Look for status='error' in logs
- [ ] **Verify data freshness** - Check `lastScraped` on Seller table

### Weekly
- [ ] **Run bulk scraping test**
  ```bash
  pnpm tsx scripts/test/test-seedsupreme-bulk.ts
  ```
- [ ] **Check database statistics**
  ```bash
  pnpm tsx scripts/check/check-all-seeds-stats.ts
  ```
- [ ] **Verify seed count growth** - Should increase over time

### Monthly
- [ ] **Test all scrapers** (category, product, full, db)
- [ ] **Review performance metrics** (should stay ~0.55s per product)
- [ ] **Check for broken selectors** (run HTML inspector)
- [ ] **Update documentation** if any changes were made

---

## 🐛 Troubleshooting Guide

### Issue: No products scraped

**Symptoms**:
```
✓ Found 0 products from 1 page(s)
```

**Diagnosis**:
```bash
# Check if selectors still work
pnpm tsx scripts/test/inspect-seedsupreme-html.ts

# Look for:
# ✅ .product-item: Found 40 elements  (should be ~40)
# ✅ Pagination: .pages-item-next a
```

**Fix**:
1. Open https://seedsupreme.com/feminized-seeds.html in browser
2. Inspect product card HTML structure
3. Update `CATEGORY_SELECTORS.productCard` in `selectors.ts` if changed
4. Re-test: `pnpm tsx scripts/test/test-seedsupreme-category.ts feminized-seeds 1`

---

### Issue: Pack options not extracted

**Symptoms**:
```
With Pack Options: 0/3 (0%)
```

**Diagnosis**:
```bash
# Test single product
pnpm tsx scripts/test/test-seedsupreme-product.ts https://seedsupreme.com/fruity-pebbles-feminized.html

# Check pack options table in output
```

**Fix**:
1. Open product page in browser
2. Inspect pack options table HTML
3. Check if pattern `/(\d+)\s*x/i` still matches
4. Update `extractPackOptions()` in `product-scraper.ts` if needed

---

### Issue: Database save fails

**Symptoms**:
```
✗ Failed to save <Product>: PrismaClientKnownRequestError
```

**Diagnosis**:
```bash
# Check error details in terminal output
# Common issues:
# - Unique constraint violation → Duplicate slug
# - Missing required fields → Check data transformation
# - Connection error → Verify DATABASE_URL
```

**Fix**:
1. **Unique constraint error**:
   - Check if slug generation is correct (`generateSlug()` in `db-service.ts`)
   - Verify `sellerId + slug` combination is truly unique

2. **Missing fields**:
   - Check `mapSeedType()`, `mapCannabisType()` logic
   - Verify THC/CBD extraction regex

3. **Connection error**:
   - Test connection: `pnpm prisma db pull`
   - Check `.env` for correct `DATABASE_URL`

---

### Issue: Performance degradation

**Symptoms**:
```
Avg per Product: 5.0s (previously 0.55s)
```

**Diagnosis**:
```bash
# Test with small sample to isolate issue
pnpm tsx scripts/test/test-seedsupreme-full.ts feminized-seeds 1 3

# Check:
# - Category extraction time (should be ~1-2s)
# - Product scraping time (should be ~0.3s per product)
# - Database save time (should be ~0.2s)
```

**Fix**:
1. **Slow category scraping**:
   - Website may be slow → Add retry logic
   - Rate limiting too strict → Adjust `maxRequestsPerMinute` in scraper

2. **Slow product scraping**:
   - Check concurrency setting (default: 2)
   - Increase if stable: `maxConcurrency: 3` in `product-scraper.ts`

3. **Slow database**:
   - Check PostgreSQL performance
   - Consider adding database indexes if querying is slow

---

## 📦 Dependencies to Monitor

### Critical Dependencies
```json
{
  "crawlee": "^3.15.3",           // ⚠️ Major version updates may break API
  "cheerio": "1.0.0-rc.12",       // ⚠️ Required as peer dependency
  "@prisma/client": "^7.0.1",     // ⚠️ Major updates need migration
  "@prisma/adapter-pg": "^7.0.1", // ⚠️ Must match Prisma version
  "pg": "^8.16.3"                 // ⚠️ PostgreSQL driver
}
```

**Update Strategy**:
1. **Test in dev first** - Never update directly in production
2. **Check breaking changes** - Read CHANGELOG for each package
3. **Run full test suite** - All 6 test scripts must pass
4. **Monitor first 24h** - Watch for errors after update

---

## 🔐 Environment Variables

**Required**:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/goodseed_db"
```

**Backup**:
- Keep `.env.example` updated
- Document any new env vars in README.md

---

## 📊 Health Check Commands

```bash
# 1. Quick health check (3 products)
pnpm tsx scripts/test/test-seedsupreme-db.ts feminized-seeds 1 3

# Expected: 3 products → ~13 seeds, 0 errors

# 2. Database stats
pnpm tsx scripts/check/check-all-seeds-stats.ts

# Expected: See seed counts by type, cannabis type, prices

# 3. Check recent scrape logs
pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const logs = await prisma.scrapeLog.findMany({ 
  orderBy: { timestamp: 'desc' }, 
  take: 10, 
  include: { seller: true } 
});
console.table(logs.map(l => ({ 
  seller: l.seller.name, 
  time: l.timestamp, 
  status: l.status, 
  products: l.productsFound 
})));
await prisma.\$disconnect();
"
```

---

## 🎯 Performance Benchmarks

**Expected Performance** (maintain these standards):
- Category extraction: **< 2s** for 40 products
- Product scraping: **< 1s** per product
- Database save: **< 0.3s** per product
- Total pipeline: **< 1s** per product (scrape + save)
- Success rate: **> 95%**

**If below benchmarks**:
1. Check website response time
2. Verify database connection pool
3. Review concurrency settings
4. Check for memory leaks

---

## 📞 Support Contacts

**Technical Issues**:
- Developer: [Your Name/Team]
- Crawlee Issues: https://github.com/apify/crawlee/issues
- Prisma Issues: https://github.com/prisma/prisma/issues

**Documentation**:
- Internal: `docs/scraper/seedsupreme/`
- Crawlee: https://crawlee.dev/
- Prisma: https://www.prisma.io/docs/

---

## ✅ Pre-Deployment Checklist

Before deploying updates:
- [ ] All 6 test scripts pass
- [ ] Database migration applied (if schema changed)
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Environment variables set
- [ ] Backup database before major changes
- [ ] Monitor logs for first 24 hours after deploy

---

**Last Updated**: 2025-11-28  
**Next Review**: 2025-12-28 (monthly)
