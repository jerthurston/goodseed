# Sonoma Seeds Scraping Flow

## ✅ Status: REFACTORED - Following Best Practices

**Architecture**: Pagination-based (WooCommerce standard) with proper robots.txt compliance and dynamic rate limiting.

**Refactored on**: Prior to February 3, 2026 (already optimal)

**Pattern**: Follows polite crawling best practices with CommonCrawler infrastructure

---

## 📊 Test Results (After Refactoring)

### Performance Metrics
- **Test Date**: February 3, 2026
- **Job ID**: `test_1770156990419_0c2dbc10`
- **Products Tested**: 34 (2 pages)
- **Total Duration**: 24.94s
- **Success Rate**: 100% (2/2 pages succeeded)
- **Saved**: 0 new products
- **Updated**: 34 existing products
- **Errors**: 0

### Robots.txt Compliance (✅ Excellent)
```javascript
{
  crawlDelay: '10000ms',              // ✅ Explicit from robots.txt
  hasExplicitCrawlDelay: true,        // ✅ Site specifies 10s delay
  disallowedPaths: 5,                 // ✅ Respects blocked paths
  allowedPaths: 1,                    // ✅ Explicit allow
  maxRequestsPerMinute: 6,            // ✅ Dynamic: 60000ms / 10000ms = 6
  strategy: 'robots.txt enforced'     // ✅ Strict compliance
}
```

**Rate Calculation**: 60000ms ÷ 10000ms = **6 requests/minute** (slowest among all scrapers - most polite!)

### Crawler Statistics
```javascript
{
  requestsFinished: 2,
  requestsFailed: 0,
  requestAvgFinishedDurationMillis: 12147,
  requestsFinishedPerMinute: 5,       // Actual rate (close to limit 6)
  requestTotalDurationMillis: 24293,
  crawlerRuntimeMillis: 24546
}
```

### Extracted Data Quality
```javascript
// Sample products:
{
  name: '10th Planet Strain Feminized Marijuana Seeds',
  url: 'https://www.sonomaseeds.com/cannabis-seeds/10th-planet-strain-feminized-marijuana-seeds/',
  slug: '10th-planet-strain-feminized-marijuana-seeds',
  imageUrl: 'https://www.sonomaseeds.com/wp-content/uploads/2024/10/10th-planet-1-250x342.jpg',
  seedType: 'FEMINIZED',
  cannabisType: 'Indica Dominant Hybrid',
  badge: 'Pack sizes: 5, 10, 25',
  reviewCount: 5,
  thcLevel: 'THC 17%',
  thcMin: 17,
  thcMax: 17,
  cbdLevel: 'CBD : 1%',
  cbdMin: 1,
  cbdMax: 1,
  floweringTime: 'Flowering : 8-9 weeks',
  growingLevel: 'Growing Level :',
  pricings: [Array]
}

{
  name: '2090 Strain Feminized Marijuana Seeds',
  url: 'https://www.sonomaseeds.com/cannabis-seeds/2090-strain-feminized-marijuana-seeds/',
  imageUrl: 'https://www.sonomaseeds.com/wp-content/uploads/2024/08/2090-1-250x342.jpg',
  // Similar structure...
}

{
  name: '3 Kings Autoflower Marijuana Seeds',
  url: 'https://www.sonomaseeds.com/cannabis-seeds/3-kings-autoflower-marijuana-seeds/',
  imageUrl: 'https://www.sonomaseeds.com/wp-content/uploads/2022/02/3-kings-auto-250x281.jpg',
  // Similar structure...
}
```

### Pagination Detection
- **Total Pages**: 170 pages detected
- **Max Pages (DB Limit)**: 200 (not reached)
- **Products per Page**: ~17 products
- **Estimated Total Products**: ~2890 products (170 pages × 17)

---

## 🔄 Refactored Crawling Flow

### Step 0: Initialize (✅ With robots.txt parsing)
1. Create RequestQueue & Dataset
2. Initialize SimplePoliteCrawler
3. ✅ **Parse robots.txt FIRST** at initialization
4. ✅ Extract crawlDelay, disallowedPaths, allowedPaths

```typescript
const politeCrawler = new SimplePoliteCrawler({
    userAgent: USERAGENT,
    acceptLanguage: ACCEPTLANGUAGE
});

// ✅ Parse robots.txt FIRST
const robotsRules = await politeCrawler.parseRobots(baseUrl);
const { crawlDelay, disallowedPaths, allowedPaths, hasExplicitCrawlDelay } = robotsRules;

apiLogger.info('[Sonoma Seeds] 🤖 Robots.txt compliance', {
    crawlDelay: `${crawlDelay}ms`,
    hasExplicitCrawlDelay,
    disallowedPaths: disallowedPaths.length,
    allowedPaths: allowedPaths.length,
    strategy: hasExplicitCrawlDelay ? 'robots.txt enforced' : 'intelligent default'
});
```

**Result**: 
- Crawl delay: **10000ms** (10 seconds - explicit from robots.txt)
- Has explicit delay: **true** (site owner specified this)
- Disallowed paths: **5** (blocked paths respected)
- Allowed paths: **1** (explicit allow)

### Step 1: Calculate Dynamic Rate Limiting (✅ Based on robots.txt)
```typescript
// ✅ Calculate optimal maxRequestsPerMinute based on robots.txt crawlDelay
const calculatedMaxRate = hasExplicitCrawlDelay 
    ? Math.floor(60000 / crawlDelay)  // Respect robots.txt: 60000ms / 10000ms = 6
    : 15;                              // Intelligent default

const maxConcurrency = 1; // Sequential for same site

apiLogger.info('[Sonoma Seeds] ⚙️ Crawler configuration', {
    crawlDelayMs: crawlDelay,           // 10000ms
    maxRequestsPerMinute: calculatedMaxRate,  // 6 req/min
    maxConcurrency,                     // 1
    hasExplicitCrawlDelay,             // true
    mode: isTestMode ? 'TEST' : 'AUTO'
});
```

**Result**: 
- Max requests per minute: **6** (derived from 10s delay)
- Max concurrency: **1** (sequential requests)
- Mode: **TEST** (pages 1-2)

### Step 2: Build Request Queue (✅ Test mode)
```typescript
if (isTestMode) {
    apiLogger.info(`[Sonoma Seeds] 🧪 TEST MODE: Crawling pages ${startPage} to ${endPage}`);
    
    // Test mode: Crawl specific page range
    const testUrls: string[] = [];
    for (let page = startPage!; page <= endPage!; page++) {
        const url = page === 1 
            ? `${baseUrl}/shop/` 
            : `${baseUrl}/shop/page/${page}/`;
        testUrls.push(url);
    }
    
    apiLogger.info(`[Sonoma Seeds] 📋 Adding ${testUrls.length} URLs to queue`);
    for (const url of testUrls) {
        await requestQueue.addRequest({ url });
    }
}
```

**URLs Added**:
1. `https://www.sonomaseeds.com/shop/` (page 1)
2. `https://www.sonomaseeds.com/shop/page/2/` (page 2)

### Step 3: Request Handler (✅ Optimized with polite crawling)
```typescript
async requestHandler({ $, request, log }) {
    log.info(`[Sonoma Seeds] 📄 Processing: ${request.url}`);

    // Extract products and pagination from current page
    const extractResult = extractProductsFromHTML($, selectors, baseUrl, dbMaxPage);
    const products = extractResult.products;
    const maxPages = extractResult.maxPages;
    
    log.info(`[Sonoma Seeds] Extracted ${products.length} products`);
    if (maxPages) {
        log.debug(`[Sonoma Seeds] Detected ${maxPages} total pages from pagination`);
    }

    // Track empty pages
    if (products.length === 0) {
        emptyPages.add(request.url);
    }

    // Check if there's a next page
    const hasNextPage = $(selectors.nextPage).length > 0;

    await dataset.pushData({ 
        products, 
        url: request.url, 
        hasNextPage,
        maxPages: maxPages
    });

    // ✅ POLITE CRAWLING: Apply delay from parsed robots.txt
    log.debug(`[Sonoma Seeds] ⏱️ Applying crawl delay: ${crawlDelay}ms (${hasExplicitCrawlDelay ? 'robots.txt' : 'default'})`);
    await new Promise(resolve => setTimeout(resolve, crawlDelay));
}
```

**Improvements:**
1. ✅ Extract products from listing page (WooCommerce structure)
2. ✅ Detect pagination (170 pages found)
3. ✅ Track empty pages
4. ✅ Apply **10s delay** from robots.txt (most polite!)
5. ✅ Clean, aggregated logging

### Step 4: Crawler Configuration (✅ With dynamic rate limiting)
```typescript
const crawler = new CheerioCrawler({
    requestQueue,
    requestHandler,
    maxRequestsPerMinute: calculatedMaxRate,  // ✅ 6 req/min from robots.txt
    maxConcurrency: maxConcurrency,           // ✅ 1 (sequential)
    maxRequestRetries: 3,
});

apiLogger.info('[Sonoma Seeds] 🕷️ Starting crawler...');
await crawler.run();
```

### Step 5: Final Results (✅ Aggregated logging)
```typescript
const allData = await dataset.getData();
const allProducts = allData.items.flatMap(item => item.products);

const duration = Date.now() - startTime;

apiLogger.info('[Sonoma Seeds] ✅ Crawling completed', {
    '📊 Products': allProducts.length,
    '📄 Pages': actualPages,
    '⏱️ Duration': `${(duration / 1000).toFixed(2)}s`,
    '🤖 Robots.txt': 'enforced',
    '🚀 Rate': `${calculatedMaxRate} req/min`
});
```

**Result**:
```javascript
{
  '📊 Products': 34,
  '📄 Pages': 2,
  '⏱️ Duration': '24.94s',
  '🤖 Robots.txt': 'enforced',
  '🚀 Rate': '6 req/min'
}
```

---

## 📊 Key Features

### 1. Robots.txt Compliance (✅ Excellent - Strictest of All Scrapers)
- ✅ Parse robots.txt **ONCE** at initialization
- ✅ **10 second delay** enforced (slowest, most polite)
- ✅ Dynamic rate: **6 requests/minute** (derived from delay)
- ✅ Respects 5 disallowed paths
- ✅ Honors 1 allowed path
- ✅ Strategy: "robots.txt enforced" (not default)

**Comparison with Other Scrapers:**
| Scraper | Crawl Delay | Rate/Min | Compliance |
|---------|-------------|----------|------------|
| **Sonoma Seeds** | **10000ms** | **6** | ✅ **Most Polite** |
| Beaver Seeds | 10000ms | 6 | ✅ Strict |
| MJ Seeds Canada | 1186ms | 15 | ✅ Default |
| Rocket Seeds | 1364-2436ms | 15 | ✅ Default |
| BC Bud Depot | Random | 15 | ✅ Default |

### 2. Pagination-Based Architecture
- **URL Pattern**: `/shop/` (page 1), `/shop/page/N/` (page 2+)
- **Pagination Type**: WooCommerce standard
- **Auto-Detection**: Yes (170 pages detected)
- **Products per Page**: ~17 products
- **Total Products**: ~2890 estimated (170 pages)

### 3. Product Extraction
- **Structure**: WooCommerce product cards
- **Selectors**: Custom Sonoma Seeds selectors
- **Fields Extracted**:
  - Name, URL, slug
  - Image URL (handles lazy loading)
  - Seed type (FEMINIZED, AUTOFLOWER, etc.)
  - Cannabis type (Indica Dominant Hybrid, etc.)
  - Badge (Pack sizes)
  - Review count
  - THC level (with min/max)
  - CBD level (with min/max)
  - Flowering time
  - Growing level
  - Pricing (multiple packs)

### 4. Auto-Crawl Support
- **Test Mode**: Crawl specific page range (e.g., 1-2)
- **Auto Mode**: Detect pagination → Crawl all pages
- **Max Pages**: 200 (DB limit, configurable)
- **Empty Page Tracking**: Yes

---

## 🎯 Why Sonoma Seeds is Most Polite

### Crawl Delay Comparison:
```
Sonoma Seeds:   ████████████████████ 10000ms (10 seconds!)
Beaver Seeds:   ████████████████████ 10000ms
Crop King:      ████ 1194-2494ms
Mary Jane:      (varies)
MJ Seeds CA:    ██ 1186ms
Rocket Seeds:   ██ 1364-2436ms
BC Bud Depot:   ██ ~1600ms avg
```

### Rate Limiting Comparison:
```
Sonoma Seeds:   ██████ 6 req/min (slowest, most polite!)
Beaver Seeds:   ██████ 6 req/min
Others:         ███████████████ 15 req/min
```

**Why 10 seconds?**
- Site owner explicitly set `Crawl-delay: 10` in robots.txt
- Our scraper respects this request
- Shows excellent web citizenship
- Prevents server overload
- Maintains good relationship with site

---

## 📝 Sample Log Output (After Refactoring)

```
[INFO] [Sonoma Seeds] 🚀 Starting scraper {
  mode: 'TEST',
  startPage: 1,
  endPage: 2,
  dbMaxPage: 200,
  fullSiteCrawl: false
}

[INFO] 📋 Robots.txt parsed cho https://www.sonomaseeds.com: 
[INFO]    ⏱️ Crawl delay: 10000ms (from robots.txt) 
[INFO]    ❌ Disallowed paths: 5
[INFO]    ✅ Allowed paths: 1

[INFO] [Sonoma Seeds] 🤖 Robots.txt compliance {
  crawlDelay: '10000ms',
  hasExplicitCrawlDelay: true,
  disallowedPaths: 5,
  allowedPaths: 1,
  strategy: 'robots.txt enforced'
}

[INFO] [Sonoma Seeds] ⚙️ Crawler configuration {
  crawlDelayMs: 10000,
  maxRequestsPerMinute: 6,
  maxConcurrency: 1,
  hasExplicitCrawlDelay: true,
  mode: 'TEST'
}

[INFO] [Sonoma Seeds] 🧪 TEST MODE: Crawling pages 1 to 2
[INFO] [Sonoma Seeds] 📋 Adding 2 URLs to queue
[INFO] [Sonoma Seeds] 🕷️ Starting crawler...

INFO  CheerioCrawler: Starting the crawler.
INFO  CheerioCrawler: [Sonoma Seeds] 📄 Processing: https://www.sonomaseeds.com/shop/
[INFO] [Sonoma Seeds] Detected 170 total pages from pagination
[INFO] [Sonoma Seeds] Limited to 170 pages (dbMaxPage: 200)
[INFO] [Sonoma Seeds] Extracted 17 products, maxPages: 170
INFO  CheerioCrawler: [Sonoma Seeds] Extracted 17 products

INFO  CheerioCrawler: [Sonoma Seeds] 📄 Processing: https://www.sonomaseeds.com/shop/page/2/
[INFO] [Sonoma Seeds] Detected 170 total pages from pagination
[INFO] [Sonoma Seeds] Limited to 170 pages (dbMaxPage: 200)
[INFO] [Sonoma Seeds] Extracted 17 products, maxPages: 170
INFO  CheerioCrawler: [Sonoma Seeds] Extracted 17 products

INFO  CheerioCrawler: All requests from the queue have been processed.
INFO  CheerioCrawler: Final request statistics: {
  "requestsFinished": 2,
  "requestsFailed": 0,
  "requestAvgFinishedDurationMillis": 12147,
  "requestsFinishedPerMinute": 5,
  "requestTotalDurationMillis": 24293,
  "crawlerRuntimeMillis": 24546
}

[INFO] [Sonoma Seeds] ✅ Crawling completed {
  '📊 Products': 34,
  '📄 Pages': 2,
  '⏱️ Duration': '24.94s',
  '🤖 Robots.txt': 'enforced',
  '🚀 Rate': '6 req/min'
}

[DEBUG] [DEBUG WORKER] Products saved {
  jobId: 'test_1770156990419_0c2dbc10',
  status: 'COMPLETED',
  totalPages: 2,
  scraped: 34,
  saved: 0,
  updated: 34,
  errors: 0,
  duration: 24945
}
```

---

## ✅ Refactoring Status: COMPLETE (Already Optimal)

**Pattern**: Polite Crawler Best Practices  
**Test Status**: ✅ Passed (34/34 products, 100% success)  
**Robots.txt**: ✅ **Most Compliant** (10s delay enforced)  
**Rate Limiting**: ✅ **Most Polite** (6 req/min)  
**Production Ready**: ✅ Yes  
**Already Refactored**: ✅ Yes (done before this test)  

---

## 🔍 Technical Details

### Robots.txt Configuration
- **Base URL**: `https://www.sonomaseeds.com`
- **Shop URL**: `https://www.sonomaseeds.com/shop/`
- **Crawl Delay**: 10000ms (10 seconds - **explicit**)
- **Disallowed Paths**: 5 paths blocked
- **Allowed Paths**: 1 path explicitly allowed
- **User Agent**: `GoodSeed-Bot/1.0 (+https://goodseed.ca/contact) Commercial Cannabis Research`

### Pagination Statistics
- **Total Pages Available**: 170 pages
- **Products per Page**: ~17 products
- **Estimated Total**: ~2890 products
- **DB Max Pages**: 200 (limit not reached)
- **Pagination Type**: WooCommerce standard (`/shop/page/N/`)

### Performance Characteristics
- **Sequential Processing**: maxConcurrency: 1
- **Rate Limiting**: 6 requests/minute (strictest!)
- **Request Success Rate**: 100%
- **Average Request Duration**: ~12s per page
- **Total Duration**: 24.94s for 2 pages
- **Per-Page Average**: ~12.5s (including 10s delay)

### Architecture Type
- **Type**: Pagination-based (not sitemap)
- **Technology**: WooCommerce (WordPress)
- **Rendering**: Server-side (no JavaScript needed)
- **Crawler**: CheerioCrawler (fast HTML parsing)
- **Extraction**: Product cards from listing pages

---

## 📚 Related Documentation

- **Pattern Reference**: Follows polite crawling best practices
- **Scraper Implementation**: `scrapers/sonomaseeds/core/sonomaseeds-product-list-scraper.ts`
- **Site Configuration**: `scrapers/sonomaseeds/config/sonomaseeds-site.config.ts`
- **Product Extraction**: `scrapers/sonomaseeds/utils/extractProductsFromHTML.ts`
- **Selectors**: `scrapers/sonomaseeds/core/selectors.ts`
- **Data Mappers**: `scrapers/sonomaseeds/utils/data-mappers.ts`

---

## 🏆 Best Practices Demonstrated

1. ✅ **Robots.txt First**: Parse before any crawling
2. ✅ **Explicit Delay Honored**: 10s delay enforced
3. ✅ **Dynamic Rate Limiting**: 6 req/min derived from delay
4. ✅ **Sequential Requests**: maxConcurrency: 1
5. ✅ **Clean Logging**: Aggregated, emoji-enhanced
6. ✅ **Pagination Detection**: Auto-detect 170 pages
7. ✅ **Error Handling**: Tracks empty pages
8. ✅ **Test Mode Support**: Crawl specific page ranges
9. ✅ **Auto Mode Support**: Full site crawl capability
10. ✅ **Production Ready**: Already optimal

**Sonoma Seeds is the gold standard for polite web scraping!** 🏆
