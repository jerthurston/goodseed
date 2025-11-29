# Seed Supreme Scraper Scripts

Tất cả scripts để test và chạy Seed Supreme scraper.

## 📂 Structure

```
scrapers/seedsupreme/scripts/
├── README.md                    # This file
├── inspect-navigation.ts        # Debug tool: Inspect navigation structure
├── test-navigation.ts           # Test: Extract categories from navigation
├── test-category.ts             # Test: Scrape single category
└── scrape-all-categories.ts     # Production: Scrape all categories
```

---

## 🔍 Debug & Inspection

### Inspect Navigation Structure

Kiểm tra HTML structure để tìm correct selectors cho navigation menu.

```bash
pnpm tsx scrapers/seedsupreme/scripts/inspect-navigation.ts
```

**Output**: Danh sách tất cả links và selectors có thể dùng.

---

## 🧪 Testing Scripts

### Test Navigation Scraper

Extract tất cả categories từ navigation menu.

```bash
pnpm tsx scrapers/seedsupreme/scripts/test-navigation.ts
```

**Expected Output**:
```
✅ Found 15 seed categories

📂 Main Categories (Level 0):
   1. Feminized Seeds (feminized-seeds)
   2. Autoflowering Seeds (autoflowering-seeds)
   3. Regular Seeds (regular-seeds)

📁 Sub-Categories (Level 1):
   1. High THC Seeds (cannabis-seeds/highest-thc-seeds)
   2. Indoor Seeds (cannabis-seeds/indoor-seeds)
   ...
```

### Test Category Scraper

Scrape products từ 1 category cụ thể.

```bash
# Basic usage (1 page)
pnpm tsx scrapers/seedsupreme/scripts/test-category.ts feminized-seeds

# Multiple pages
pnpm tsx scrapers/seedsupreme/scripts/test-category.ts feminized-seeds 3

# Try different categories
pnpm tsx scrapers/seedsupreme/scripts/test-category.ts autoflowering-seeds 1
pnpm tsx scrapers/seedsupreme/scripts/test-category.ts best-sellers 1
```

**Expected Output**:
```
✅ Total Products: 40
Duration: 3.64s

Price Distribution:
  Under $50: 34
  $50-$100: 6

Varieties:
  Hybrid: 30
  Mostly Indica: 5
```

---

## 🚀 Production Scripts

### Scrape All Categories

Tự động scrape tất cả categories từ navigation và **save vào database**.

```bash
# Scrape 1 page per category (quick)
pnpm tsx scrapers/seedsupreme/scripts/scrape-all-categories.ts 1

# Scrape 3 pages per category (more complete)
pnpm tsx scrapers/seedsupreme/scripts/scrape-all-categories.ts 3
```

**Workflow**:
1. Initialize database service
2. Extract categories from navigation (Step 1)
3. Scrape each category với delay 5-10s (Step 2)
4. Save to PostgreSQL database (Step 3)
5. Display summary statistics (Step 4)

**Expected Output**:
```
✅ Initialized Seller: clzxxx...

📂 Step 1/4: Extracting categories from navigation...
✅ Found 21 categories

📦 Step 2/4: Scraping products from each category...
[1/21] Feminized Seeds
   ✅ 40 products (3.16s)
   💾 Saved: 40, Updated: 0, Errors: 0
   ⏳ Waiting 7.3s before next category...

📊 Step 3/4: Summary Statistics
   Total Products: 595
   💾 Database: 595 saved, 0 updated, 0 errors

📊 Step 4/4: Database Statistics
   Categories in Database: 21
   Products in Database: 595
```

### Test Database Service

Test database operations với sample data.

```bash
pnpm tsx scrapers/seedsupreme/scripts/test-db-service.ts
```

**What it does**:
1. Initialize seller
2. Create test category
3. Save 3 test products
4. Update category aggregates
5. Query and display results

**Expected Output**:
```
✅ Seller ID: clzxxx...
✅ Category ID: clzyyy...
✅ Saved: 3, Updated: 0, Errors: 0

📁 Category: Test Feminized Seeds
   Starting Price: $9.75
   Variety: Hybrid
   Products: 3
```

---

## 📋 Script Details

### inspect-navigation.ts

**Purpose**: Debug tool để inspect HTML structure

**Features**:
- Test multiple selectors
- List tất cả links trong header
- Filter potential seed category links
- Identify correct selectors

**Use When**: Navigation scraper không tìm được categories

---

### test-navigation.ts

**Purpose**: Test navigation extraction

**Features**:
- Extract tất cả categories từ homepage
- Group by level (main vs sub)
- Statistics by seed type
- Export to JSON

**Output**: List of `CategoryMetadata` objects

```typescript
interface CategoryMetadata {
  name: string;       // "Feminized Seeds"
  slug: string;       // "feminized-seeds"
  url: string;        // Full URL
  level: number;      // 0 or 1
  seedType?: SeedType;
  parent?: string;    // For sub-categories
}
```

---

### test-category.ts

**Purpose**: Test category scraper với 1 category

**Features**:
- Scrape products từ category page
- Rate limiting (2-5s delay)
- Stock status extraction
- Price calculation
- Analytics (price, variety, THC distribution)

**Parameters**:
- `category`: Slug của category (e.g., "feminized-seeds")
- `maxPages`: Số pages tối đa (default: 1)

---

### scrape-all-categories.ts

**Purpose**: Production script - scrape tất cả categories

**Features**:
- Auto-discover categories
- Scrape từng category với delay
- Progress tracking
- Error handling
- Summary statistics
- Top categories ranking

**Parameters**:
- `maxPages`: Số pages per category (default: 1)

**Rate Limiting**:
- Category scraping: 2-5s delay per page
- Between categories: 5-10s delay

---

## 🔧 Troubleshooting

### No categories found

```bash
# 1. Run inspect tool
pnpm tsx scrapers/seedsupreme/scripts/inspect-navigation.ts

# 2. Check output for correct selectors
# 3. Update navigation-scraper.ts with correct selectors
```

### Scraper too slow

```bash
# Reduce pages per category
pnpm tsx scrapers/seedsupreme/scripts/scrape-all-categories.ts 1
```

### Rate limiting errors

- Increase delay between categories in `scrape-all-categories.ts`
- Current: 5-10s, recommend: 10-15s for safety

---

## 📊 Expected Performance

**Single Category (1 page)**:
- Products: 40
- Duration: 3-5 seconds
- Success Rate: 100%

**All Categories (15 categories, 1 page each)**:
- Total Products: ~500-600
- Duration: ~5-10 minutes (with delays)
- Success Rate: 90-95%

---

## 🔗 Related Files

**Core Scrapers**:
- `../navigation-scraper.ts` - Category extraction
- `../category-scraper.ts` - Product scraping
- `../selectors.ts` - CSS selectors
- `../types.ts` - TypeScript interfaces

**Documentation**:
- `../../docs/scraper/seedsupreme/implementation-steps.md` - Complete guide
- `../../docs/scraper/seedsupreme/README.md` - Overview

---

## 📝 Next Steps

After scraping:
1. **View data**: `pnpm prisma studio`
2. **Query with Prisma**: Build frontend components
3. **Setup cron job**: Automatic daily/weekly scrapes
4. **Monitor logs**: Check ScrapeLog table

**Database Structure**:
```
Seller (Seed Supreme)
  ├─ SeedCategory (21 categories)
  │    ├─ name, slug, url
  │    ├─ seedType, photoperiodType
  │    ├─ startingPrice, variety
  │    └─ thcMin/Max, cbdMin/Max
  └─ SeedProduct (595+ products)
       ├─ name, slug, url
       ├─ basePrice, packSize, pricePerSeed
       ├─ stockStatus, variety, cannabisType
       └─ thcMin/Max, cbdMin/Max
```
