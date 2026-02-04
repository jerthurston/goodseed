# Beaver Seeds Scraping Flow

## Architecture: Pagination-based with CommonCrawler Infrastructure

Uses **CommonCrawler** - shared infrastructure for 4 scrapers:
- Beaver Seeds
- Mary Jane's Garden
- MJ Seeds Canada
- Rocket Seeds

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

**For each page:**
1. Build pagination URL using `getScrapingUrl()`
2. Fetch page with robots.txt delay
3. Detect total pages from jet-smart-filters pagination
4. Extract products using `extractProductsFromHTML()`
5. Add next page to queue if within range

### Step 2: Extract Product Data
**CommonCrawler handles:**
- Request queue management
- Robots.txt compliance enforcement
- Dynamic rate limiting
- Crawl delay application
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
3. Log aggregated statistics
4. Return ProductsDataResultFromCrawling

---

## 🤖 Robots.txt Compliance

**Configuration:**
```typescript
{
  crawlDelay: '10000ms',          // Explicit from robots.txt!
  hasExplicitCrawlDelay: true,    // ✅ Dynamic rate limiting activated
  disallowedPaths: 2,
  allowedPaths: 1,
  strategy: '🤖 robots.txt enforced'
}
```

**Dynamic Rate Limiting:**
```typescript
const calculatedMaxRate = hasExplicitCrawlDelay 
    ? Math.floor(60000 / 10000)   // = 6 req/min
    : 30;                          // Default 30 req/min

// Result: 6 req/min (enforced by robots.txt)
```

---

## 📊 Test Results

| Metric | Value |
|--------|-------|
| Sources Processed | 5 categories |
| Total Products | 197 |
| Total Pages | 10 (2 pages × 5 sources) |
| Success Rate | 100% |
| Errors | 0 |
| Duration | ~117 seconds |
| Rate Limit | 6 req/min (enforced) |
| Crawl Delay | 10000ms (10 seconds) |

**Per-source breakdown:**
- Source 2: 41 products, 2 pages, 23.69s
- Source 3: 42 products, 2 pages, 23.50s
- Source 4: 36 products, 2 pages, 21.82s
- Source 5: 36 products, 2 pages, 23.64s

---

## 🎯 Key Features

1. ✅ **CommonCrawler infrastructure**: Reusable, tested, maintained
2. ✅ **Robots.txt compliance**: Explicit 10s delay enforced
3. ✅ **Dynamic rate limiting**: 6 req/min calculated from Crawl-delay
4. ✅ **Multi-source support**: 5 categories processed sequentially
5. ✅ **Jet-smart-filters pagination**: Detects total pages automatically
6. ✅ **WooCommerce structure**: Standard product extraction
7. ✅ **Consistent delays**: 10 seconds applied to every request
8. ✅ **Clean logging**: Emoji-enriched, aggregated stats per source

---

## 🏗️ CommonCrawler Benefits

**Inherited features:**
- ✅ Robots.txt parsing and compliance
- ✅ Dynamic rate limiting logic
- ✅ Request queue management
- ✅ Error handling and retries
- ✅ Dataset management
- ✅ Aggregated logging

**Site-specific focus:**
- Only implement: pagination logic + product extraction
- Zero boilerplate code
- Automatic compliance updates when CommonCrawler improves
