# Canuk Seeds Scraping Flow

## Architecture: Header → Category → Products (3-Step Pattern)

---

## 🔄 Crawling Flow

### Step 0: Initialize & Parse Robots.txt
1. Create RequestQueue & Dataset
2. **Parse robots.txt FIRST** (`politeCrawler.parseRobots()`)
3. Extract crawl delay, disallowed/allowed paths
4. Log compliance rules

### Step 1: Extract Category Links from Homepage
1. Fetch homepage: `https://www.canukseeds.com`
2. Apply robots.txt crawl delay
3. Extract category links from header navigation
4. Filter links against robots.txt rules
5. Result: Array of category URLs (e.g., 34 categories)

### Step 2: Extract Product URLs from Categories
**Mode Detection:**
- **TEST Mode**: Process first category only, limited pages
- **AUTO/MANUAL Mode**: Process all categories, use dbMaxPage

**For each category:**
1. Fetch category page with pagination
2. Extract product URLs from listing
3. Apply robots.txt filtering
4. Collect unique product URLs
5. Result: Array of product URLs (e.g., 56 products)

### Step 3: Extract Product Data
1. Add all product URLs to RequestQueue
2. Configure crawler with robots.txt settings:
   - `crawlDelay`: From robots.txt or intelligent default
   - `maxRequestsPerMinute`: Dynamic based on hasExplicitCrawlDelay
   - `maxConcurrency`: 2 (parallel processing)
3. For each product URL:
   - Fetch product detail page
   - Apply crawl delay
   - Extract: name, url, slug, imageUrl, seedType, cannabisType, pricings, etc.
   - Save to dataset
4. Collect results from dataset
5. Return ProductsDataResultFromCrawling

---

## 🤖 Robots.txt Compliance

**Configuration:**
```typescript
{
  crawlDelay: '1325ms',           // Random intelligent default
  hasExplicitCrawlDelay: false,   // No explicit Crawl-delay in robots.txt
  disallowedPaths: 60,            // 60 blocked paths respected
  allowedPaths: 1,
  strategy: '🧠 intelligent default'
}
```

**Dynamic Rate Limiting:**
```typescript
const calculatedMaxRate = hasExplicitCrawlDelay 
    ? Math.floor(60000 / crawlDelay)  // Dynamic from robots.txt
    : 40;                              // Default 40 req/min
```

---

## 📊 Test Results

| Metric | Value |
|--------|-------|
| Categories Extracted | 34 |
| Product URLs Found | 56 |
| Products Scraped | 56 |
| Success Rate | 100% |
| Errors | 0 |
| Duration | ~107 seconds |
| Rate Limit | 40 req/min |

---

## 🎯 Key Features

1. ✅ **Multi-step crawling**: Homepage → Categories → Products
2. ✅ **Robots.txt compliance**: Parse BEFORE crawling, respect 60 blocked paths
3. ✅ **Mode detection**: TEST vs AUTO/MANUAL with different limits
4. ✅ **URL filtering**: All URLs validated against robots.txt
5. ✅ **Dynamic rate limiting**: Based on robots.txt Crawl-delay
6. ✅ **Parallel processing**: maxConcurrency: 2
7. ✅ **Consistent delays**: Applied to every request
8. ✅ **Clean logging**: Emoji-enriched, structured logs
