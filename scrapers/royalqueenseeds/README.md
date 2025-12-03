# Royal Queen Seeds Scraper

> **Status**: ✅ Production Ready - Infinite Scroll Support
> **Approach**: Playwright (scroll) → Cheerio (extract) → Database
> **Documentation**: See [Quick Start Guide](../../docs/scraper/royalqueenseeds/quickstart-guide.md)

---

## 🚀 Quick Start

### Run Scraper

```bash
# Scrape 2 pages per category (~48 products each)
pnpm tsx scrapers/royalqueenseeds/scripts/scrape-hardcoded-urls.ts 2

# Scrape 5 pages per category (~120 products each)
pnpm tsx scrapers/royalqueenseeds/scripts/scrape-hardcoded-urls.ts 5
```

**Performance:**
- ~12 seconds per category for 2 pages (48 products)
- ~30 seconds total for 2 categories
- Data quality: 100% (price, image, THC, effects, rating, reviews)

---

## 📁 Structure

```
scrapers/royalqueenseeds/
├── core/
│   ├── category-scraper-playwright.ts  # ✅ Infinite scroll scraper
│   ├── category-scraper.ts             # ⚠️  Deprecated (no pagination)
│   ├── selectors.ts                    # CSS selectors
│   └── types.ts                        # TypeScript types
├── scripts/
│   ├── scrape-hardcoded-urls.ts        # 🚀 Main scraper (uses Playwright)
│   ├── test-and-preview.ts             # 🧪 Data quality check
│   └── inspect-html.ts                 # 🔍 Analyze HTML
└── README.md
```

---

## ⚙️ Configuration

### Category URLs

Edit `scripts/scrape-hardcoded-urls.ts`:

```typescript
const CATEGORY_URLS = [
    'https://www.royalqueenseeds.com/us/33-feminized-cannabis-seeds',
    'https://www.royalqueenseeds.com/us/34-autoflowering-cannabis-seeds',
];
```

### Infinite Scroll Settings

In `core/category-scraper-playwright.ts`:

```typescript
// Scrolls per page (default: 5)
const maxScrolls = maxPages * 5;

// Wait time between scrolls (default: 2s)
await page.waitForTimeout(2000);

// Timeout per request (default: 120s)
requestHandlerTimeoutSecs: 120,
```

---

## 🎯 Features

✅ **Infinite Scroll Pagination** - Automatically scrolls to load all products
✅ **Fast Extraction** - Uses Cheerio for 10x faster parsing
✅ **Complete Data** - Price, image, THC, effects, rating, reviews (100%)
✅ **Deduplication** - Removes duplicate products by URL
✅ **Rate Limiting** - 2-5s between scrolls, 5-10s between categories
✅ **Error Handling** - Retries on failure, logs all errors

---

## 📊 Data Structure

```typescript
{
  name: "Royal Gorilla Auto",
  url: "https://www.royalqueenseeds.com/us/...",
  slug: "royal-gorilla-auto",
  imageUrl: "https://www.royalqueenseeds.com/...",
  basePrice: "$39.00",
  basePriceNum: 39.00,
  packSize: 3,
  pricePerSeed: 13.00,
  originalPrice: "$78.00",  // Sale price
  thcLevel: "20%",
  effects: "Creative, Euphoric; Flavor: Citrus, Pine",
  rating: 4.5,
  reviewCount: 350
}
```

---

## 📚 Documentation

Full documentation: [docs/scraper/royalqueenseeds/quickstart-guide.md](../../docs/scraper/royalqueenseeds/quickstart-guide.md)

---

## 🔧 Troubleshooting

**Issue: Timeout errors**
- Increase `requestHandlerTimeoutSecs` in scraper
- Reduce `maxPages` parameter

**Issue: Not enough products**
- Increase `maxScrolls` multiplier (e.g., `maxPages * 10`)
- Increase scroll wait time

**Issue: Duplicate products**
- Already handled by URL deduplication
- Check logs for "Extracted X products"

---

**Last Updated**: 2025-11-29
**Status**: ✅ Production Ready
