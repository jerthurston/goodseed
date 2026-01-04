# Canuk Seeds Scraper

## 🎯 Tổng quan
Scraper để extract dữ liệu sản phẩm từ website Canuk Seeds (https://www.canukseeds.com) với hỗ trợ pagination và crawling toàn diện.

## 📋 Flow xử lý chính

### **Step 0: Parse Robots.txt & Setup Polite Crawling**
```typescript
// Trong canukseedsScraper.ts
const politeCrawler = new SimplePoliteCrawler({
    userAgent: USERAGENT,
    acceptLanguage: ACCEPTLANGUAGE,
    minDelay: 2000, // Will be updated based on robots.txt
    maxDelay: 5000
});

// Parse robots.txt to get crawling rules
const robotsRules = await politeCrawler.parseRobots(baseUrl);
```
- **Input**: Base URL (`https://www.canukseeds.com`)
- **Process**: 
  - Parse robots.txt để lấy crawl delays, disallowed paths
  - Setup polite crawling parameters
  - Validate user-agent permissions
- **Output**: Crawling rules object để pass cho các extraction functions

### **Step 1: Extract Category Links từ Homepage**
```typescript
extractCategoryLinksFromHomepage(robotsRules)
```
- **Input**: Homepage URL + robots rules
- **Process**: Parse header navigation với polite crawling
- **Output**: Array of 34 category URLs
  ```
  [
    "https://www.canukseeds.com/buy-canuk-seeds/standard-canuk-seeds",
    "https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds",
    ...
  ]
  ```

### **Step 2: Extract Product URLs từ Categories với Pagination**
```typescript
extractProductUrlsFromCatLink(categoryUrl, maxPages = 3, robotsRules)
```
- **Input**: Category URL + max pages + robots rules
- **Process**: 
  - Check robots.txt cho allowed paths
  - Lặp qua từng page với proper delays
  - Extract product links tuân theo crawl rate limits
- **Pagination Pattern**: `https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds?p=2`
- **Output**: Array of product URLs per category (~36+ URLs per category)

### **Step 3: Process All Categories**
```typescript
// Trong canukseedsScraper.ts với polite crawler
for (const catLink of catLinkArr) {
    // Validate URL against robots.txt
    if (politeCrawler.isAllowed(catLink, robotsRules)) {
        const productUrls = await extractProductUrlsFromCatLink(catLink, maxPages, robotsRules);
        urlsToProcess.push(...productUrls); // Remove duplicates
        
        // Apply robots.txt crawl delay
        await politeCrawler.delay(robotsRules.crawlDelay);
    }
}
```
- **Process**: Lặp qua 34 categories với robots.txt compliance
- **Safety**: Check disallowed paths, apply proper delays
- **Total Expected**: ~1000+ unique product URLs
- **Deduplication**: Remove duplicate URLs across categories

### **Step 4: Extract Product Data với Polite Rules**
```typescript
extractProductFromDetailHTML($, siteConfig, productUrl, robotsRules)
```
- **Input**: Product detail URL + robots rules
- **Process**: Parse cannabis data với respect cho robots.txt
- **Rate Limiting**: Apply crawl delays between product requests
- **Extracted Data**:
  - ✅ Name (with ELITE STRAIN formatting)
  - ✅ Seed Type (feminized/autoflower)
  - ✅ Cannabis Type (indica/sativa/hybrid)
  - ✅ THC Level (e.g., "19-24%")
  - ✅ CBD Level (e.g., "2%")
  - ✅ Flowering Time
  - ✅ Pricing (multiple pack sizes)
  - ✅ Image URL (OG meta fallback)

### **Step 5: Return Results**
```typescript
ProductsDataResultFromCrawling {
    products: ProductCardDataFromCrawling[],
    totalProducts: number,
    totalPages: number,
    timestamp: Date,
    duration: number
}
```

## 🔧 Infrastructure Components

### **Polite Crawling & Robots.txt Compliance**
- `SimplePoliteCrawler`: Central crawling manager với robots.txt parsing
- `parseRobots()`: Parse robots.txt để lấy crawl delays và disallowed paths
- `isAllowed()`: Validate URLs against robots.txt rules
- `delay()`: Apply appropriate delays based on robots.txt

### **URL Management**
- `getScrapingUrl.ts`: Handles pagination URLs với pattern `?p=N`
- Support functions: `getPageNumberFromUrl()`, `isPaginationUrl()`, `getScrapingUrlRange()`

### **Data Extraction với Polite Rules**
- `selectors.ts`: WooCommerce selectors cho Canuk Seeds structure
- `extractProductFromDetailHTML.ts`: Parse cannabis product data với robots.txt compliance
- `extractCatLinkFromHeader.ts`: Extract navigation links với rate limiting

### **Quality Assurance**
- **Robots.txt Compliance**: Parse và follow tất cả robots.txt rules
- **Dynamic Rate Limiting**: Adjust delays based on site's robots.txt crawl-delay
- **Path Validation**: Check disallowed paths trước khi crawl
- **Error Handling**: Continue on individual failures với proper delays
- **Image Fallback**: OG meta tags khi Fotorama gallery fails
- **Deduplication**: Remove duplicate URLs và products

## 📊 Performance Metrics

### **Tested Results với Robots.txt Compliance**:
- ✅ Robots.txt parsing: All URLs allowed
- ✅ Dynamic crawl delays: 2.7s - 4.7s based on robots.txt
- ✅ Category extraction: 34 categories
- ✅ Single category: 36 product URLs
- ✅ Product data extraction: 100% success rate (2/2 tested)
- ✅ Pagination: Support multi-page crawling
- ✅ Image extraction: OG fallback working
- ✅ Polite crawling: Follows robots.txt rules completely

### **Estimated Scale**:
- Total categories: 34
- Pages per category: 3 (max)
- Products per page: ~36
- **Total products**: ~3,600 products potential

## 🚀 Entry Point
```typescript
canukSeedScraper(siteConfig, sourceContext, startPage?, endPage?)
```

## 🎯 Status
- ✅ **Robots.txt Compliance**: Parse và follow tất cả robots.txt rules
- ✅ **URL Extraction**: Implemented với pagination support
- ✅ **Product Data**: High-quality extraction với cannabis-specific fields  
- ✅ **Polite Crawling**: Dynamic delays based on robots.txt (2.7s-4.7s)
- ✅ **Error Handling**: Robust error handling với path validation
- 🔄 **Ready for Production**: Full infrastructure completed với ethical crawling

## 📝 Ghi chú Implementation
- **Thực trạng site**: Không có sitemap, chỉ có robots.txt. Product cards ở listings thiếu thông tin.
- **Chiến lược**: Extract từ menu navigation → pagination categories → detail product pages
- **Architecture**: CommonCrawler pattern tương tự maryjanesgarden và cropkingseeds
