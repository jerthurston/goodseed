# Rocket Seeds Pagination Detection Logic

## Overview
This document explains how the system automatically detects the total number of pages when scraping Rocket Seeds pagination.

## Current Implementation

### Strategy: Parse Pagination HTML (Method 1 Only)

The system uses **ONE simple and reliable method** to detect total pages:

```typescript
function detectTotalPages($: any): number {
    let maxPage = 1;
    
    // Parse all page number links from pagination
    $('.page-numbers:not(.prev):not(.next):not(.current):not(.dots)').each((_: any, element: any) => {
        const pageText = $(element).text().trim();
        
        // Skip if text is dots/ellipsis
        if (pageText === '…' || pageText === '...' || pageText === '....') {
            return; // continue
        }
        
        const pageNum = parseInt(pageText, 10);
        if (!isNaN(pageNum) && pageNum > maxPage) {
            maxPage = pageNum; // ⭐ Find highest page number
        }
    });
    
    return maxPage;
}
```

## How It Works

### Pagination HTML Structure
```html
<nav class="woocommerce-pagination">
    <ul class="page-numbers">
        <li><span class="page-numbers current">1</span></li>
        <li><a class="page-numbers" href="...?paged=2">2</a></li>
        <li><a class="page-numbers" href="...?paged=3">3</a></li>
        <li><a class="page-numbers" href="...?paged=4">4</a></li>
        <li><span class="page-numbers dots">…</span></li>
        <li><a class="page-numbers" href="...?paged=37">37</a></li>
        <li><a class="page-numbers" href="...?paged=38">38</a></li>
        <li><a class="page-numbers" href="...?paged=39">39</a></li>
        <li><a class="next page-numbers" href="...?paged=2">&gt;</a></li>
    </ul>
</nav>
```

### Detection Process

1. **Select page links**: `.page-numbers:not(.prev):not(.next):not(.current):not(.dots)`
   - Excludes: prev button, next button, current page indicator, dots
   - Includes: Only numeric page links (2, 3, 4, 37, 38, 39)

2. **Parse each link**:
   - Extract text content
   - Skip if ellipsis (`…`, `...`, `....`)
   - Convert to integer
   - Keep track of maximum value

3. **Return max page**: The highest page number found = total pages

## Examples

### Current Scenario (39 Pages)
```
Pagination: 1, 2, 3, 4, ..., 37, 38, 39
Detected: 39 pages ✅
```

### Future Scenario (50 Pages)
```
Pagination: 1, 2, 3, 4, ..., 48, 49, 50
Detected: 50 pages ✅ (automatic)
```

### Future Scenario (100 Pages)
```
Pagination: 1, 2, 3, 4, ..., 98, 99, 100
Detected: 100 pages ✅ (automatic)
```

## Why This Method?

### ✅ Advantages
- **Simple and reliable**: WordPress pagination always shows last page number
- **No calculations needed**: Direct parsing from HTML
- **Automatic scaling**: Works for any number of pages (10, 50, 100+)
- **No dependencies**: Doesn't rely on result count text or products per page
- **Clean code**: Only ~15 lines, easy to maintain

### ❌ Why We Rejected Other Methods

#### Method 2: Check Current Page (Removed)
```typescript
// ❌ Doesn't work - current page is always 1 on first request
const currentPage = $('.page-numbers.current').text(); // "1"
```
**Why rejected**: Current page doesn't tell us total pages

#### Method 3: Calculate from Result Count (Removed)
```typescript
// ❌ Not applicable - listing page doesn't display total products
const resultCount = $('.woocommerce-result-count').text(); 
// Expected: "Showing 1-16 of 624 results"
// Actual: Not displayed on Rocket Seeds listing page
```
**Why rejected**: Result count not available on the listing page

## Automatic Detection Guarantee

**YES** ✅ The system will automatically detect any number of pages without code changes.

### Requirements for Auto-detection:
1. Pagination HTML must follow WordPress structure
2. Last page number must be visible in pagination links
3. Page links must use `.page-numbers` class

### Current Status:
- **Rocket Seeds**: ✅ Meets all requirements
- **Detection**: ✅ Fully automatic
- **Scalability**: ✅ Works for any page count

## Testing

### Current Test Results (39 Pages)
```bash
INFO  CheerioCrawler: [Rocket Seeds extractProductUrls] Detected 39 total pages
INFO  CheerioCrawler: [Rocket Seeds extractProductUrls] Added 38 pagination pages to queue (page 2 to 39)

# Final Results:
- Pages crawled: 39 ✅
- Products found: 620 ✅
- Success rate: 100% ✅
```

## Configuration

### Adjustable Constants
```typescript
// Location: scrapers/rocketseeds/utils/extractProductUrls.ts

/**
 * Base domain for constructing absolute URLs
 */
const SITE_BASE_URL = 'https://rocketseeds.com';

/**
 * Page link selector
 */
const PAGINATION_SELECTORS = {
    pageLinks: '.page-numbers:not(.prev):not(.next):not(.current):not(.dots)',
} as const;
```

### When to Update:
- **SITE_BASE_URL**: If domain changes
- **pageLinks selector**: If pagination HTML structure changes (unlikely)

## Maintenance

### No Maintenance Needed For:
- ✅ Increasing/decreasing product count
- ✅ Adding new products to catalog
- ✅ Changing number of pages
- ✅ Pagination reaching 50, 100, 200+ pages

### Maintenance Required Only If:
- ⚠️ Website changes pagination HTML structure
- ⚠️ Website stops displaying last page number in pagination

## Related Files

- **Implementation**: `scrapers/rocketseeds/utils/extractProductUrls.ts`
- **Test Script**: `scrapers/rocketseeds/script/test-scraper.ts`
- **HTML Sample**: `scrapers/rocketseeds/materials/pagination.html`
- **Main Scraper**: `scrapers/rocketseeds/core/rocketSeedScraper.ts`

## Last Updated
February 7, 2026 - Simplified to single method (Method 1 only)
