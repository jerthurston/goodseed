# BC Bud Depot Scraping Flow

## Architecture: Sitemap-based Direct Scraper

Direct implementation (not using CommonCrawler).

---

## 🔄 Crawling Flow

### Step 0: Initialize & Parse Robots.txt
1. Create RequestQueue & Dataset
2. Initialize SimplePoliteCrawler
3. **Parse robots.txt FIRST** (`politeCrawler.parseRobots()`)
4. Extract crawl delay, disallowed/allowed paths
5. Log compliance rules

### Step 1: Load Sitemap & Extract Product URLs
1. Fetch XML sitemap: `https://bcbuddepot.com/product-sitemap.xml`
2. Parse sitemap to extract all product URLs
3. Result: Array of 109 product URLs

### Step 2: Filter URLs Against Robots.txt
**BEFORE adding to queue:**
1. For each URL, extract pathname
2. Check against disallowedPaths
3. Separate into allowedUrls and blockedUrls
4. Log filtering results
5. Result: 109 allowed, 0 blocked

### Step 3: Apply Test Mode Limits (if applicable)
**Mode Detection:**
- **TEST Mode**: `startPage=1, endPage=2`
  - Calculate range: `endPage - startPage = 1`
  - Limit to 1 product only
- **AUTO Mode**: Process all allowed URLs

### Step 4: Configure Crawler with Robots.txt Settings
**Dynamic rate limiting:**
```typescript
const calculatedMaxRate = hasExplicitCrawlDelay 
    ? Math.floor(60000 / crawlDelay)
    : 15;  // Default 15 req/min
```

**Crawler settings:**
- crawlDelayMs: From robots.txt
- maxRequestsPerMinute: Dynamic calculation
- maxConcurrency: 1 (sequential)
- strategy: 🧠 intelligent default or 🤖 robots.txt enforced

### Step 5: Crawl Product Detail Pages
**For each product URL:**
1. Add to RequestQueue
2. Fetch product page with crawl delay
3. Apply robots.txt delay before each request
4. Extract product data using `extractProductFromDetailHTML()`:
   - Name, URL, slug
   - Image URL
   - Seed type, cannabis type
   - Badge, flowering time
   - Pricings (variations)
5. Save to dataset

### Step 6: Collect Results
1. Retrieve all products from dataset
2. Calculate duration
3. Log aggregated statistics:
   - Total products
   - Total pages processed
   - Duration
   - Sitemap URL
   - Product URLs found
4. Return ProductsDataResultFromCrawling

---

## 🤖 Robots.txt Compliance

**Configuration:**
```typescript
{
  crawlDelay: '1349-1869ms',      // Random intelligent default
  hasExplicitCrawlDelay: false,   // No explicit Crawl-delay in robots.txt
  disallowedPaths: 1,
  allowedPaths: 0,
  strategy: '🧠 intelligent default'
}
```

**Why no explicit Crawl-delay?**
- BC Bud Depot's robots.txt doesn't specify Crawl-delay directive
- System uses intelligent default: random 1000-2000ms
- Still respects disallowed paths (1 path blocked)

**Dynamic Rate Limiting:**
```typescript
const calculatedMaxRate = hasExplicitCrawlDelay 
    ? Math.floor(60000 / crawlDelay)
    : 15;  // Falls back to 15 req/min

// Result: 15 req/min (default)
```

---

## 📊 Test Results

### Test Run Summary (3 tests):

| Run | Job ID | Crawl Delay | Rate | Duration | Products | Status |
|-----|--------|-------------|------|----------|----------|--------|
| 1 | test_1770150414675_7000d8c8 | 1349ms | 15 req/min | 5.795s | 1 | ✅ |
| 2 | test_1770151581586_4dd44fa4 | 1869ms | 15 req/min | 8.444s | 1 | ✅ |
| 3 | test_1770151617559_77a5e1f9 | 1473ms | 15 req/min | 5.245s | 1 | ✅ |

**Average Duration**: 6.49s  
**Success Rate**: 100% (3/3)

### Sitemap Statistics:
- Total URLs in sitemap: 109
- URLs allowed by robots.txt: 109
- URLs blocked: 0
- Test mode limit: 1 product

---

## 🎯 Key Features

1. ✅ **Sitemap-based**: Parse XML sitemap first
2. ✅ **Robots.txt compliance**: Parse BEFORE crawling
3. ✅ **URL filtering**: Filter URLs against robots.txt BEFORE queue
4. ✅ **Dynamic rate limiting**: Based on hasExplicitCrawlDelay
5. ✅ **Random delays**: Intelligent default varies (1000-2000ms)
6. ✅ **Test mode support**: startPage/endPage limiting
7. ✅ **Sequential crawling**: maxConcurrency: 1
8. ✅ **Clean logging**: Aggregated statistics with crawler settings

---

## 📋 Comparison with Other Scrapers

| Feature | BC Bud Depot | Beaver Seeds | Canuk Seeds |
|---------|--------------|--------------|-------------|
| Architecture | Sitemap-based | Pagination (CommonCrawler) | Header→Cat→Products |
| Crawl Delay | 1349-1869ms random | 10000ms (robots.txt) | 1325ms random |
| Rate Limit | 15 req/min | 6 req/min | 40 req/min |
| hasExplicitCrawlDelay | ❌ false | ✅ true | ❌ false |
| Strategy | 🧠 default | 🤖 enforced | 🧠 default |
| Disallowed Paths | 1 | 2 | 60 |
| Concurrency | 1 | 1 | 2 |

---

## 🔍 Important Notes

**Why random delays vary?**
- Intelligent default generates random delay: 1000-2000ms
- Different on each run: 1349ms, 1869ms, 1473ms
- Prevents predictable crawling patterns
- Still polite and respectful

**Why 15 req/min fixed?**
- BC Bud Depot has no explicit Crawl-delay
- Code correctly falls back to default: 15 req/min
- To see dynamic calculation, test with site that has Crawl-delay (like Beaver Seeds)
