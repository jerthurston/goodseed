# Seed Supreme Scraper

Scraper thu thập **product cards** từ category pages của SeedSupreme.com sử dụng Crawlee và Prisma ORM.

## 🎯 Approach

Thay vì scrape navigation menu hoặc product detail pages, scraper này:
- ✅ Nhận **hardcoded array of category URLs**
- ✅ Scrape **product cards** từ category listing pages
- ✅ Lưu lightweight product data vào database (name, price, THC level, image, etc.)

**Không scrape:**
- ❌ Navigation menu / category structure
- ❌ Product detail pages (pack options, full specs, descriptions)

## 📁 Cấu trúc thư mục

```
scrapers/seedsupreme/
├── core/                         # Active scraping logic
│   ├── category-scraper.ts       # Scrape product cards từ category pages (Crawlee)
│   ├── category-db-service.ts    # Database operations (Prisma)
│   ├── selectors.ts              # CSS selectors cho category pages
│   └── types.ts                  # TypeScript types (ProductCardData, CategoryMetadata)
│
├── utils/                        # Utility functions
│   └── thc-cbd-parser.ts         # Parse THC/CBD text → numeric ranges
│
├── scripts/                      # Runnable scripts
│   ├── scrape-hardcoded-urls.ts  # 🚀 Main scraper (hardcoded URL array)
│   ├── check-db-data.ts          # 🔍 Verify database content & statistics
│   └── test-db-service.ts        # 🧪 Test database operations với dummy data
│
└── _archive/                     # Legacy code (không sử dụng)
    ├── navigation-scraper.ts     # Old: Scrape navigation menu
    ├── product-scraper.ts        # Old: Scrape product detail pages
    ├── full-scraper.ts           # Old: Full automation script
    ├── db-service.ts             # Old: Database service for product details
    ├── selectors.ts              # Old: Selectors (includes product detail selectors)
    └── scripts/
        ├── scrape-all-categories.ts  # Old: Auto-scrape from navigation
        ├── test-navigation.ts
        ├── inspect-navigation.ts
        ├── test-category.ts
        └── reparse-thc-cbd.ts
```

## 🚀 Cách sử dụng

### Scrape products từ hardcoded URLs

```bash
# Scrape 1 trang mỗi category (test)
pnpm tsx scrapers/seedsupreme/scripts/scrape-hardcoded-urls.ts 1

# Scrape 5 trang mỗi category (full scrape)
pnpm tsx scrapers/seedsupreme/scripts/scrape-hardcoded-urls.ts 5
```

**Hardcoded URLs** (định nghĩa trong `scrape-hardcoded-urls.ts`):
```typescript
const CATEGORY_URLS = [
    'https://seedsupreme.com/feminized-seeds.html',
    'https://seedsupreme.com/autoflowering-seeds.html',
    'https://seedsupreme.com/cannabis-seeds/high-yield-seeds.html',
];
```

### Kiểm tra database

```bash
# Hiển thị tổng quan dữ liệu:
# - Seller info (name, URL, last scraped)
# - Categories list (name, slug, product count)
# - Sample products (first 3 from each category)
# - Statistics by cannabis type (INDICA, SATIVA, HYBRID)
pnpm tsx scrapers/seedsupreme/scripts/check-db-data.ts
```

### Test database service

```bash
# Tạo test data và verify database operations:
# - Test THC/CBD parser với different patterns
# - Initialize seller
# - Create test category "Test Feminized Seeds"
# - Save 3 test products (Blue Dream, White Widow, OG Kush)
# - Query results và verify data integrity
pnpm tsx scrapers/seedsupreme/scripts/test-db-service.ts
```

## 🗄️ Database Schema

**Tables:**
- `Seller`: Seed banks (Seed Supreme, ILGM, etc.)
- `SeedProductCategory`: Categories (Feminized, Autoflowering, etc.)
- `SeedProduct`: Individual products với pricing, THC levels

**Key Relations:**
```
Seller (1) → (N) SeedProductCategory
SeedProductCategory (1) → (N) SeedProduct
```

**Unique Constraint:**
```prisma
@@unique([categoryId, slug]) // Prevent duplicate products in same category
```

## 🌟 Features

### Category Scraper (`core/category-scraper.ts`)
- Scrape **product cards** từ category listing pages
- Sử dụng **Crawlee CheerioCrawler** (HTTP-based, nhanh)
- Automatic request queue management
- Built-in retries & error handling
- Pagination support (1-N pages per category)
- Random delays (2-4s) giữa các pages

### Database Service (`core/category-db-service.ts`)
- Upsert categories (create if not exists, update if exists)
- Upsert products (handle duplicates via `categoryId + slug`)
- Parse THC/CBD text → numeric ranges (`15-20%` → `{min: 15, max: 20}`)
- Map variety text → `CannabisType` enum (`Mostly Indica` → `INDICA`)

### THC/CBD Parser (`utils/thc-cbd-parser.ts`)
- Patterns hỗ trợ:
  - `over 20%` → `{min: 20, max: 100}`
  - `15-20%` → `{min: 15, max: 20}`
  - `under 2%` → `{min: 0, max: 2}`
  - `10%` → `{min: 10, max: 10}`
  - `N/A` → `{min: 0, max: 0}`

### Data Scraped (Product Cards)
- Name, URL, slug, image
- Base price, pack size, price per seed
- Stock status
- Variety (Indica/Sativa/Hybrid)
- THC level (text + parsed numeric range)
- Badges, rating, review count

## ⚙️ Configuration

**Environment Variables** (`.env`):
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

**Rate Limiting** (`scrape-hardcoded-urls.ts`):
```typescript
const MIN_DELAY = 5000;  // 5s between categories
const MAX_DELAY = 10000; // 10s between categories
```

## 📊 Sample Output

```
[1/3] Feminized Seeds
   ✅ 40 products (5.71s)
      💾 Saved: 0, Updated: 40, Errors: 0

Total Categories: 3
Total Products: 112
Total Duration: 29.75s
```

## 🧹 Legacy Code

Các files trong `_archive/` là legacy code từ các approaches cũ:

### Navigation-based Approach (deprecated)
- `navigation-scraper.ts`: Extract categories từ menu navigation
- `scrape-all-categories.ts`: Auto-scrape all categories from menu
- **Lý do bỏ**: Navigation structure thay đổi thường xuyên, khó maintain

### Product Detail Scraper (not implemented)
- `product-scraper.ts`: Scrape full product detail pages
- `db-service.ts`: Database service cho product details
- **Lý do bỏ**: Không cần full specs, product cards đủ thông tin

### Current Approach: Hardcoded URLs ✅
- Simple, stable, easy to maintain
- Focus on product cards (lightweight data)
- Manual URL curation đảm bảo quality

## 🔧 Maintenance

### Thêm category mới
Edit `CATEGORY_URLS` array trong `scripts/scrape-hardcoded-urls.ts`:
```typescript
const CATEGORY_URLS = [
    'https://seedsupreme.com/feminized-seeds.html',
    'https://seedsupreme.com/autoflowering-seeds.html',
    'https://seedsupreme.com/cannabis-seeds/high-yield-seeds.html',
    'https://seedsupreme.com/new-category.html', // ← Thêm URL mới
];
```

### Update CSS selectors
Nếu website thay đổi HTML structure, update selectors trong `core/selectors.ts`.

### Prisma schema changes
```bash
# After editing schema.prisma
pnpm prisma migrate dev --name describe_change
pnpm prisma generate
```

## 📝 Notes

- **Duplicate Handling**: Products được upsert dựa trên `categoryId + slug` unique constraint
- **THC Parsing**: 500/540 products (92%) có numeric THC ranges
- **Variety Mapping**: Text như "Mostly Indica" → `CannabisType.INDICA`
- **Stock Status**: Mapped từ text sang `StockStatus` enum
