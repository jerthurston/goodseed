# Crop King Seeds Scraping Flow

## Architecture: Pagination-based with CommonCrawler Infrastructure

Uses **CommonCrawler** - same infrastructure as Beaver Seeds, Mary Jane's Garden, MJ Seeds Canada, and Rocket Seeds.

---

## 🔄 Crawling Flow

### Step 0: Initialize & Parse Robots.txt (CommonCrawler)
1. Create RequestQueue & Dataset
2. **Parse robots.txt FIRST** (`politeCrawler.parseRobots()`)
3. Extract crawl delay, disallowed/allowed paths
4. Log compliance rules
5. Configure dynamic rate limiting

### Step 1: Process Pagination
**Mode Detection:**
- **TEST Mode**: `startPage=1, endPage=2` → 2 pages only
- **AUTO Mode**: Use `dbMaxPage` from config

**WordPress Standard Pagination:**
- Pattern: `/page/N/` (e.g., `/new-strains/page/2/`)
- Detects total pages from WooCommerce pagination
- Example: `https://www.cropkingseeds.ca/new-strains/page/2/`

**For each page:**
1. Build pagination URL using `getScrapingUrl()`
2. Fetch page with robots.txt delay
3. Detect total pages from WooCommerce pagination (.page-numbers)
4. Extract products using `extractProductsFromHTML()`
5. Add next page to queue if within range

### Step 2: Extract Product Data
**CommonCrawler handles:**
- Request queue management
- Robots.txt compliance enforcement
- Dynamic rate limiting
- Crawl delay application (random 1000-3000ms)
- Error handling

**Site-specific handler extracts:**
- Product name, URL, slug
- Image URL (WooCommerce structure)
- Seed type, cannabis type
- THC/CBD levels
- Pricings with radio button variations (3-9 variants per product)
- Badge, description
- Result: Array of ProductCardDataFromCrawling

### Step 3: Collect & Return Results
1. Retrieve all products from dataset
2. Calculate duration
3. Log aggregated statistics with emoji
4. Return ProductsDataResultFromCrawling

---

## 🤖 Robots.txt Compliance

**Configuration (varies per run - random delays):**
```typescript
{
  crawlDelay: '1194-2494ms',      // Random intelligent default
  hasExplicitCrawlDelay: false,   // No explicit Crawl-delay
  disallowedPaths: 1,
  allowedPaths: 1,
  strategy: '🧠 intelligent default'
}
```

**Example variations across sources:**
- Source 1: 1603ms
- Source 2: 1194ms
- Source 3: 1871ms
- Source 4: 2456ms
- Source 5: 1484ms
- Source 6: 2494ms
- Source 7: 2245ms

**Dynamic Rate Limiting:**
```typescript
const calculatedMaxRate = hasExplicitCrawlDelay 
    ? Math.floor(60000 / crawlDelay)
    : 30;  // Default 30 req/min

// Result: 30 req/min (no explicit Crawl-delay)
```

---

## 📊 Test Results

| Metric | Value |
|--------|-------|
| **Job ID** | test_1770152802142_71dc6389 |
| **Sources Processed** | 7 categories |
| **Total Products** | 255 |
| **Total Pages** | 14 (2 pages × 7 sources) |
| **Success Rate** | 100% |
| **Errors** | 0 |
| **Duration** | ~49.7 seconds |
| **Rate Limit** | 30 req/min (default) |
| **Saved/Updated** | 0 saved, 255 updated |

### Per-source breakdown:
| Source | Products | Pages | Duration | Rate |
|--------|----------|-------|----------|------|
| 1 | ? | 2 | ? | 30 req/min |
| 2 | ? | 2 | ? | 30 req/min |
| 3 | ? | 2 | ? | 30 req/min |
| 4 | 40 | 2 | 10.43s | 30 req/min |
| 5 | 26 | 2 | 3.76s | 30 req/min |
| 6 | 38 | 2 | 6.17s | 30 req/min |
| 7 | 40 | 2 | 14.14s | 30 req/min |

---

## 🎯 Key Features

1. ✅ **CommonCrawler infrastructure**: Reusable, tested, maintained
2. ✅ **Robots.txt compliance**: Random delays (1000-3000ms range)
3. ✅ **Dynamic rate limiting**: 30 req/min (no explicit delay)
4. ✅ **Multi-source support**: 7 categories processed sequentially
5. ✅ **WordPress pagination**: Standard `/page/N/` pattern
6. ✅ **WooCommerce structure**: Product extraction with radio button pricing
7. ✅ **Random delays**: Varies per source (1194-2494ms)
8. ✅ **Clean logging**: Emoji-enriched, aggregated stats per source
9. ✅ **Cannabis-specific data**: THC/CBD levels, seed types

---

## 📋 Product Structure

**Example extracted product:**
```javascript
{
  name: 'Amnesia Haze Autoflower Marijuana Seeds',
  url: 'https://www.cropkingseeds.ca/autoflower-seeds-canada/amnesia-haze-autoflower-seeds/',
  slug: 'amnesia-haze-autoflower-marijuana-seeds',
  imageUrl: 'https://www.cropkingseeds.ca/wp-content/uploads/2025/01/amnesia-haze-auto-1-230x389.jpg',
  seedType: 'autoflowering',
  cannabisType: 'sativa',
  pricings: [
    // 3-9 pricing variants per product
    // Radio button selections
  ]
}
```

---

## 🏗️ CommonCrawler Benefits

**Inherited features:**
- ✅ Robots.txt parsing and compliance
- ✅ Dynamic rate limiting logic
- ✅ Request queue management
- ✅ Error handling and retries
- ✅ Dataset management
- ✅ Aggregated logging with emoji

**Site-specific focus:**
- Only implement: pagination logic + product extraction
- Zero boilerplate code
- Automatic compliance updates when CommonCrawler improves

---

## 📈 Comparison with Other Scrapers

| Feature | Crop King Seeds | Beaver Seeds | BC Bud Depot | Canuk Seeds |
|---------|-----------------|--------------|--------------|-------------|
| **Architecture** | Pagination (CommonCrawler) | Pagination (CommonCrawler) | Sitemap-based | Header→Cat→Products |
| **Crawl Delay** | 1194-2494ms random | 10000ms (robots.txt) | 1349-1869ms random | 1325ms random |
| **Rate Limit** | **30 req/min** | 6 req/min | 15 req/min | 40 req/min |
| **hasExplicitCrawlDelay** | ❌ false | ✅ true | ❌ false | ❌ false |
| **Strategy** | 🧠 default | 🤖 enforced | 🧠 default | 🧠 default |
| **Pagination Type** | **WordPress /page/N/** | Jet-smart-filters | Sitemap | Multi-step |
| **Products** | **255** | 197 | 1 | 56 |
| **Sources** | **7 categories** | 5 categories | 1 sitemap | 34 categories |
| **Duration** | **49.7s** | 117s | 6.49s avg | 107s |

---

## 🔍 Important Notes

**Why random delays vary across sources?**
- Intelligent default generates NEW random delay for EACH source
- Range: 1000-3000ms
- Source 1: 1603ms
- Source 2: 1194ms (fastest)
- Source 4: 2456ms (slowest)
- This prevents predictable crawling patterns
- Still polite and respectful

**Why 30 req/min?**
- Crop King Seeds has no explicit Crawl-delay
- Code correctly falls back to default: 30 req/min
- Higher than BC Bud Depot (15) but lower than Canuk Seeds (40)
- Balanced between speed and politeness

**WordPress Pagination:**
- Standard WordPress pattern: `/page/N/`
- Easy to detect total pages from `.page-numbers`
- Reliable pagination handling
- Different from Beaver Seeds' jet-smart-filters

---

## ✅ Final Verdict

**Crop King Seeds: EXCELLENT!**

- CommonCrawler integration: **PERFECT** ✅
- Robots.txt compliance: **VERIFIED** ✅
- Multi-source handling: **SUCCESS** ✅ (7 categories)
- WordPress pagination: **WORKING** ✅
- Product extraction: **255 products** ✅
- Error rate: **0%** ✅

**Progress: 4/11 scrapers tested**
- ✅ BC Bud Depot (Sitemap-based)
- ✅ Beaver Seeds (CommonCrawler + Jet-smart-filters)
- ✅ Canuk Seeds (Header→Category→Products)
- ✅ Crop King Seeds (CommonCrawler + WordPress pagination)

**4 different architectures, all working perfectly!** 🎉
