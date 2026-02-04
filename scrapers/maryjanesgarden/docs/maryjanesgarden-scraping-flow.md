# Mary Jane's Garden Scraping Flow

## Architecture: WordPress Pagination with CommonCrawler Infrastructure

Uses **CommonCrawler** - same infrastructure as Beaver Seeds, Crop King Seeds, MJ Seeds Canada, and Rocket Seeds.

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
- Pattern: `/page/N/` (e.g., `/feminized-marijuana-seeds/page/2/`)
- Detects total pages from WordPress pagination (.page-numbers)
- Example: `https://maryjanesgarden.com/feminized-marijuana-seeds/page/2/`

**For each page:**
1. Build pagination URL using `getScrapingUrl()`
2. Fetch page with robots.txt delay
3. Detect total pages from WordPress pagination
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
- Pricings (variations)
- Badge, rating
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
  crawlDelay: '1576-2439ms',      // Random intelligent default
  hasExplicitCrawlDelay: false,   // No explicit Crawl-delay
  disallowedPaths: 1,
  allowedPaths: 1,
  strategy: '🧠 intelligent default'
}
```

**Example variations across sources:**
- Source 1: 1604ms
- Source 2: 2173ms
- Source 3: 1988ms
- Source 4: 2027ms
- Source 5: 1576ms
- Source 6: 2439ms

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
| **Job ID** | test_1770153103555_7ff9059e |
| **Sources Processed** | 6 categories |
| **Total Products** | 263 |
| **Total Pages** | 12 (2 pages × 6 sources) |
| **Success Rate** | 100% |
| **Errors** | 0 |
| **Duration** | ~41.6 seconds |
| **Rate Limit** | 30 req/min (default) |
| **Saved/Updated** | 0 saved, 263 updated |

### Per-source breakdown:
| Source | Products | Pages | Duration | Rate | Notes |
|--------|----------|-------|----------|------|-------|
| 1 | ? | 2 | ? | 30 req/min | - |
| 2 | 50 | 2 | 6.49s | 30 req/min | Full pages |
| 3 | 26 | 2 | 7.45s | 30 req/min | Partial page 2 |
| 4 | 50 | 2 | 6.08s | 30 req/min | Full pages |
| 5 | 37 | 2 | 5.15s | 30 req/min | Partial page 2 |
| 6 | 50 | 2 | 8.63s | 30 req/min | Full pages |

**Pattern observed:**
- Full pages: 25 products each (50 total from 2 pages)
- Partial pages: Varies (1, 12, 37 products on page 2)
- Consistent rate: 30 req/min across all sources

---

## 🎯 Key Features

1. ✅ **CommonCrawler infrastructure**: Reusable, tested, maintained
2. ✅ **Robots.txt compliance**: Random delays (1000-3000ms range)
3. ✅ **Dynamic rate limiting**: 30 req/min (no explicit delay)
4. ✅ **Multi-source support**: 6 categories processed sequentially
5. ✅ **WordPress pagination**: Standard `/page/N/` pattern
6. ✅ **WooCommerce structure**: Product extraction with variations
7. ✅ **Random delays**: Varies per source (1576-2439ms)
8. ✅ **Clean logging**: Emoji-enriched, aggregated stats per source
9. ✅ **Sequential crawling**: maxConcurrency: 1

---

## 📋 Product Structure

**Example extracted product:**
```javascript
{
  name: '10th Planet Strain Feminized Marijuana Seeds',
  url: 'https://maryjanesgarden.com/10th-planet-strain-feminized-marijuana-seeds/',
  slug: '10th-planet-strain-feminized-marijuana-seeds',
  imageUrl: 'https://maryjanesgarden.com/wp-content/uploads/2024/10/10th-planet-1-230x307.jpg',
  seedType: 'feminized',
  cannabisType: 'hybrid',
  pricings: [
    // Pricing variations
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

## 📈 Comparison with Other CommonCrawler Scrapers

| Feature | Mary Jane's | Beaver Seeds | Crop King | MJ Seeds |
|---------|-------------|--------------|-----------|----------|
| **Crawl Delay** | 1576-2439ms | 10000ms (robots.txt) | 1194-2494ms | TBD |
| **Rate Limit** | **30 req/min** | 6 req/min | 30 req/min | TBD |
| **hasExplicitCrawlDelay** | ❌ false | ✅ true | ❌ false | TBD |
| **Strategy** | 🧠 default | 🤖 enforced | 🧠 default | TBD |
| **Pagination Type** | **WordPress /page/N/** | Jet-smart-filters | WordPress /page/N/ | TBD |
| **Products** | **263** | 197 | 255 | TBD |
| **Sources** | **6 categories** | 5 categories | 7 categories | TBD |
| **Duration** | **41.6s** | 117s | 49.7s | TBD |
| **Products per page** | **25 (standard)** | 21 | Varies | TBD |

---

## 🔍 Important Notes

**Why random delays vary across sources?**
- Intelligent default generates NEW random delay for EACH source
- Range: 1000-3000ms
- Source 1: 1604ms
- Source 6: 2439ms (highest)
- Source 5: 1576ms (lowest)
- This prevents predictable crawling patterns
- Still polite and respectful

**Why 30 req/min?**
- Mary Jane's Garden has no explicit Crawl-delay
- Code correctly falls back to default: 30 req/min
- Same rate as Crop King Seeds
- Different from Beaver Seeds (6 req/min enforced by robots.txt)

**WordPress Pagination Pattern:**
- Standard WordPress pattern: `/page/N/`
- Same as Crop King Seeds
- Different from Beaver Seeds (jet-smart-filters)
- Easy to detect total pages from `.page-numbers`
- Reliable pagination handling

**Products per page:**
- Standard: 25 products per page
- Full pages: 50 products (2 × 25)
- Partial pages: 1, 12, 37 (last pages of categories)
- More consistent than Crop King Seeds

---

## 📊 Categories Crawled

Based on logs, 6 categories were processed:
1. Fast Version (`/fast-version/`)
2. Feminized Marijuana Seeds (`/feminized-marijuana-seeds/`)
3. Regular Seeds (`/regular/`)
4. New Strains (`/new-strains/`)
5. (2 more sources not shown in summary)

---

## ✅ Final Verdict

**Mary Jane's Garden: EXCELLENT!**

- CommonCrawler integration: **PERFECT** ✅
- Robots.txt compliance: **VERIFIED** ✅
- Multi-source handling: **SUCCESS** ✅ (6 categories)
- WordPress pagination: **WORKING** ✅
- Product extraction: **263 products** ✅
- Error rate: **0%** ✅
- Consistency: **25 products per page standard** ✅

**Progress: 5/11 scrapers tested**
- ✅ BC Bud Depot (Sitemap-based)
- ✅ Beaver Seeds (CommonCrawler + Jet-smart-filters)
- ✅ Canuk Seeds (Header→Category→Products)
- ✅ Crop King Seeds (CommonCrawler + WordPress pagination)
- ✅ Mary Jane's Garden (CommonCrawler + WordPress pagination)

**Comparison with Crop King:**
- **Same rate**: 30 req/min
- **Same pagination**: WordPress /page/N/
- **More consistent**: 25 products per page vs varies
- **More products**: 263 vs 255
- **Faster**: 41.6s vs 49.7s
- **Fewer sources**: 6 vs 7

**Mary Jane's Garden is the most consistent CommonCrawler scraper!** 🌟
