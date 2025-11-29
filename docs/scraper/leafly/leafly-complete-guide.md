# Leafly Scraper - Complete Guide

> **Tài liệu tổng hợp**: Quy trình scrape dữ liệu strain từ Leafly và chiến lược lấy giá thấp nhất từ sellers

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Dữ Liệu Thu Thập](#dữ-liệu-thu-thập)
3. [Workflow 2-Phase](#workflow-2-phase)
4. [Cách Sử Dụng](#cách-sử-dụng)
5. [Technical Implementation](#technical-implementation)
6. [Kết Quả Mẫu](#kết-quả-mẫu)
7. [Lưu Ý & Rủi Ro](#lưu-ý--rủi-ro)

---

## 🎯 Tổng Quan

### Mục Tiêu
Scrape dữ liệu strain từ **Leafly Strains** (`https://www.leafly.com/strains`) theo 2 giai đoạn:
1. **Phase 1**: Thu thập thông tin strain cơ bản (tên, type, THC/CBD)
2. **Phase 2**: Tìm **giá thấp nhất** từ các seller có bán strain đó

### URL Nguồn
- **Strain List**: `https://www.leafly.com/strains?page={N}`
- **Strain Detail**: `https://www.leafly.com/strains/{slug}`

---

## 📊 Dữ Liệu Thu Thập

### ✅ Có Sẵn từ Leafly Strains (Phase 1)
| Field | Mô Tả | Source |
|-------|-------|--------|
| `name` | Strain Name (dùng làm Seed Name) | Strain list page |
| `slug` | URL-friendly slug | Generated from name |
| `url` | Full strain URL | `https://www.leafly.com/strains/{slug}` |
| `cannabisType` | INDICA / SATIVA / HYBRID | Strain card |
| `thcMin`, `thcMax` | THC % ranges | Strain card |
| `cbdMin`, `cbdMax` | CBD % ranges | Strain card |
| `imageUrl` | Strain image | Strain card |

### ⚠️ Không Có từ Leafly Strains (Cần Phase 2 hoặc Defaults)
| Field | Default Value | Source |
|-------|---------------|--------|
| `totalPrice` | `0` | Phase 2: từ sellers |
| `packSize` | `1` | Phase 2: từ sellers |
| `pricePerSeed` | `0` | Calculated: totalPrice / packSize |
| `stockStatus` | `IN_STOCK` hoặc `UNKNOWN` | Phase 2: từ sellers |
| `seedType` | `FEMINIZED` | Default (không có info) |
| `photoperiodType` | `undefined` | Default (không có info) |

---

## 📋 Yêu Cầu MVP

### 1. Data Normalization
- **Price per seed** = total price / pack size
- **Convert ranges** like "20-25%" into min/max numbers (thcMin: 20, thcMax: 25)
- **Standardize names**: "Auto-flowering" → "Autoflower"

### 2. Scraper Rules
- ✅ **One file per site** (`scrapers/leafly/leafly-strain-scraper.ts`)
- ✅ **Wait 2-5 seconds** between requests
- ✅ **Take lowest price** if a range is shown
- ✅ **Capture pack size**
- ✅ **Log errors but do not break search**
- ⚠️ **Support proxies** (future)
- ⚠️ **Send alerts if scraper fails** (future)

---

---

## 🔄 Workflow 2-Phase

### **Phase 1: Scrape Strain Info** ✅ IMPLEMENTED
**Target**: `https://www.leafly.com/strains?page={N}`

**Dữ liệu thu thập từ Strain List Page**:
```typescript
interface StrainBasicData {
  name: string;           // "Blue Dream"
  slug: string;           // "blue-dream"
  url: string;            // "https://www.leafly.com/strains/blue-dream"
  cannabisType: CannabisType; // INDICA | SATIVA | HYBRID
  thcMin?: number;        // 18
  thcMax?: number;        // 25
  cbdMin?: number;        // 0
  cbdMax?: number;        // 1
  imageUrl?: string;
}
```

**Giá trị mặc định**:
- `totalPrice: 0` (chưa có giá)
- `packSize: 1`
- `pricePerSeed: 0`
- `stockStatus: UNKNOWN` hoặc `OUT_OF_STOCK`

**Status**: ✅ **Phase 1 đã hoàn thành**
- File: `scrapers/leafly/leafly-strain-scraper.ts`
- Test script: `scripts/test/test-leafly-strains.ts`
- Đang hoạt động và có thể lưu vào DB

---

---

### **Phase 2: Find Minimum Price from Sellers** 🔄 TODO
**Target**: Strain Detail Page → `https://www.leafly.com/strains/{slug}`

**Status**: ⏳ **Chưa implement** - Cần investigation trước

#### **2.1. Xác Định URL Pattern cho Sellers**

Từ phân tích HTML của strain detail page (ví dụ: `blue-dream`), cần tìm:

1. **Section có danh sách sellers/dispensaries** bán strain đó
   - Có thể là tab "Products" hoặc "Where to buy"
   - HTML pattern: `<div class="products-section">` hoặc tương tự

2. **Product listings với giá**
   - Format: Seller name, Product name, Price, Pack size
   - HTML pattern: 
     ```html
     <div class="product-card">
       <a href="/brands/{brand}/products/{product}">Product Name</a>
       <span class="price">$XX.XX</span>
       <span class="size">3.5g</span>
     </div>
     ```

3. **API endpoint (nếu có)**
   - Leafly có thể dùng API để load products dynamically
   - Check Network tab trong DevTools cho XHR requests
   - Possible endpoint: `/api/strains/{slug}/products`

#### **2.2. Extract Price Data**

**Dữ liệu cần thu thập**:
```typescript
interface StrainSellerPrice {
  strainSlug: string;       // "blue-dream"
  sellerName: string;       // "Cookies", "Pure Sunfarms"
  sellerUrl: string;        // URL to seller page
  productName: string;      // "Blue Dream 3.5g"
  totalPrice: number;       // 35.00
  packSize: number;         // 3.5 (grams)
  pricePerGram: number;     // 10.00
  productUrl: string;       // Full URL to product
  imageUrl?: string;
}
```

**Logic xử lý**:
1. Lấy tất cả products của strain từ detail page.(cần xác định những selector cần lấy, không lấy thừa)
2. Extract giá + pack size từ mỗi product
3. Calculate `pricePerGram = totalPrice / packSize`
4. Sort by `pricePerGram` ascending
5. Lấy product có `pricePerGram` thấp nhất

#### **2.3. Update Strain Record với Giá Thấp Nhất**

```typescript
const strainWithPrice: SeedData = {
  ...strainBasicData,
  
  // Update với giá thấp nhất
  totalPrice: lowestPriceProduct.totalPrice,
  packSize: lowestPriceProduct.packSize,
  pricePerSeed: lowestPriceProduct.pricePerGram,
  stockStatus: StockStatus.IN_STOCK,
  
  // Seller info (có thể cần thêm vào schema)
  lowestPriceSeller: lowestPriceProduct.sellerName,
  lowestPriceSellerUrl: lowestPriceProduct.sellerUrl,
  lowestPriceProductUrl: lowestPriceProduct.productUrl,
};
```

---

## 🚀 Cách Sử Dụng

### 1. Test Scraper Phase 1 (Không Lưu DB)

```bash
# Scrape 1 trang để xem kết quả
pnpm tsx scripts/test/test-leafly-strains.ts 1 1

# Scrape nhiều trang
pnpm tsx scripts/test/test-leafly-strains.ts 1 5
```

**Output mẫu**:
```
=== Leafly Strains Scraper ===
Scraping pages 1 to 5

Page 1: Found 20 strains
Page 2: Found 20 strains
...

Total strains scraped: 100

=== Sample Strains ===
1. Blue Dream
   Type: HYBRID
   THC: 17-24%
   CBD: 0-2%
   Image: ✅
   URL: https://www.leafly.com/strains/blue-dream
```

---

### 2. Lưu Vào Database

**Bước 1**: Tạo Seller "Leafly Strains" trong DB

```bash
pnpm tsx scripts/seed/seed-sellers.ts
# Output: Created seller with ID: cmii2ai2x0000assboe1156dg
```

**Bước 2**: Scrape và lưu với seller ID

```bash
# Replace <SELLER_ID> với ID từ bước 1
pnpm tsx scripts/test/test-leafly-strains.ts 1 5 --save --seller-id cmii2ai2x0000assboe1156dg
```

---

### 3. Lọc Theo Loại Cannabis

```typescript
// Trong code hoặc tạo script mới
const scraper = new LeaflyStrainScraper({
    startPage: 1,
    endPage: 10,
    strainType: 'indica', // Hoặc: 'sativa', 'hybrid', 'all'
    delayMs: 3000, // Optional: custom delay
});

const strains = await scraper.scrape();
```

---

### 4. Script Commands Nhanh

```bash
# Test 1 page
pnpm tsx scripts/test/test-leafly-strains.ts 1 1

# Test 5 pages (nhiều data)
pnpm tsx scripts/test/test-leafly-strains.ts 1 5

# Save to DB với seller ID đã có
pnpm tsx scripts/test/test-leafly-strains.ts 1 10 --save --seller-id cmii2ai2x0000assboe1156dg
```

---

## 🛠️ Technical Implementation Plan

### **Step 1: Inspect Strain Detail Page HTML**

**Action**: Tạo script để fetch và analyze HTML structure
```bash
# Script: scripts/test/inspect-leafly-strain-detail.ts
pnpm tsx scripts/test/inspect-leafly-strain-detail.ts blue-dream
```

**Mục tiêu**:
- [ ] Tìm selector cho products section
- [ ] Tìm selector cho product cards
- [ ] Tìm selector cho price, pack size, seller name
- [ ] Check xem có API endpoint không

---

### **Step 2: Update LeaflyStrainScraper**

**File**: `scrapers/leafly/leafly-strain-scraper.ts`

**Thêm methods**:
```typescript
class LeaflyStrainScraper {
  // Existing: extractSeedsFromPage() - gets strain list
  
  // NEW: Get minimum price from strain detail page
  private async getMinimumPriceForStrain(
    page: Page, 
    strainUrl: string
  ): Promise<StrainPriceInfo | null>
  
  // NEW: Extract products from strain detail page
  private async extractProductsFromStrainPage(
    page: Page
  ): Promise<StrainSellerPrice[]>
  
  // NEW: Calculate minimum price per gram
  private getLowestPriceProduct(
    products: StrainSellerPrice[]
  ): StrainSellerPrice | null
}
```

---

### **Step 3: Update Scraper Workflow**

**Current flow**:
```
1. Loop pages 1-N
2. Extract strains from list page
3. Return SeedData[]
```

**New flow**:
```
1. Loop pages 1-N
2. Extract strains from list page
3. FOR EACH strain:
   3.1. Navigate to strain detail page
   3.2. Extract products with prices
   3.3. Calculate minimum price
   3.4. Update SeedData with price info
   3.5. Wait 2-5 seconds (requirement)
4. Return SeedData[] with prices
```

⚠️ **Performance consideration**: 
- Nếu có 20 strains/page và scrape 5 pages = 100 strain detail pages
- Với delay 2-5s = 200-500s (~3-8 phút cho 100 strains)
- Có thể cần **batch processing** hoặc **caching**

---

### **Step 4: Schema Changes (Optional)**

**Option A**: Thêm fields vào `Seed` model
```prisma
model Seed {
  // ... existing fields
  
  // Price tracking
  lowestPriceSeller     String?
  lowestPriceSellerUrl  String?
  lowestPriceProductUrl String?
  lastPriceUpdate       DateTime?
}
```

**Option B**: Tạo separate table `SeedPrice` (Recommended)
```prisma
model SeedPrice {
  id        String   @id @default(cuid())
  seedId    String
  seed      Seed     @relation(fields: [seedId], references: [id])
  
  sellerName    String
  sellerUrl     String
  productUrl    String
  totalPrice    Float
  packSize      Float
  pricePerUnit  Float
  
  scrapedAt DateTime @default(now())
  
  @@index([seedId, pricePerUnit])
}
```

**Recommendation**: Option B cho phép track price history

---

## 🔍 Investigation Tasks

### **Task 1: Xác định HTML Structure**
- [ ] Fetch strain detail page HTML (blue-dream)
- [ ] Tìm products section selector
- [ ] Tìm product card selector
- [ ] Tìm price selector
- [ ] Tìm pack size selector
- [ ] Tìm seller name selector

### **Task 2: Check API Alternative**
- [ ] Open DevTools Network tab
- [ ] Load strain detail page
- [ ] Look for XHR/Fetch requests với product data
- [ ] Document API endpoint format nếu có

### **Task 3: Test Price Extraction**
- [ ] Extract 1 strain's products manually
- [ ] Verify price parsing logic
- [ ] Verify pack size parsing logic
- [ ] Calculate pricePerGram correctly

### **Task 4: Performance Optimization**
- [ ] Estimate total scraping time
- [ ] Decide on batch size (bao nhiêu strains/run)
- [ ] Implement caching strategy
- [ ] Add resume capability (nếu scraper bị interrupt)

---

## 📊 Kết Quả Mẫu

### Phase 1 Output (Current - Không có giá)

```typescript
{
  name: "Blue Dream",
  slug: "blue-dream",
  url: "https://www.leafly.com/strains/blue-dream",
  cannabisType: CannabisType.HYBRID,
  thcMin: 17,
  thcMax: 24,
  cbdMin: 0,
  cbdMax: 2,
  
  // Defaults (chưa có giá)
  totalPrice: 0,
  packSize: 1,
  pricePerSeed: 0,
  stockStatus: StockStatus.IN_STOCK,
  seedType: SeedType.FEMINIZED,
  photoperiodType: undefined,
  
  imageUrl: "https://leafly-public.imgix.net/strains/blue-dream.jpg"
}
```

### Phase 2 Output (Expected - Có giá từ sellers)

**Final SeedData with Price**:
```typescript
{
  name: "Blue Dream",
  slug: "blue-dream",
  url: "https://www.leafly.com/strains/blue-dream",
  cannabisType: CannabisType.HYBRID,
  thcMin: 18,
  thcMax: 25,
  cbdMin: 0,
  cbdMax: 1,
  
  // Price data from lowest seller
  totalPrice: 35.00,
  packSize: 3.5,
  pricePerSeed: 10.00, // $10/gram
  stockStatus: StockStatus.IN_STOCK,
  
  // Seller tracking
  lowestPriceSeller: "Cookies Dispensary",
  lowestPriceSellerUrl: "https://www.leafly.com/dispensaries/cookies",
  lowestPriceProductUrl: "https://www.leafly.com/brands/cookies/products/blue-dream-35g",
  
  imageUrl: "https://leafly-public.imgix.net/strains/blue-dream.jpg"
}
```

---

## 🚀 Next Steps

1. **[HIGH PRIORITY]** Tạo script `inspect-leafly-strain-detail.ts` để analyze HTML
2. **[HIGH PRIORITY]** Xác định selectors cho products section
3. **[MEDIUM]** Implement `getMinimumPriceForStrain()` method
4. **[MEDIUM]** Update main scraper flow với price extraction
5. **[LOW]** Consider schema changes cho price tracking
6. **[LOW]** Implement caching và resume capability

---

## 📚 Cấu Trúc Database

### Current Schema (Seed Model)

```prisma
model Seed {
  id        String   @id @default(cuid())
  sellerId  String
  seller    Seller   @relation(fields: [sellerId], references: [id])
  
  name      String
  url       String
  slug      String
  
  totalPrice    Float
  packSize      Int
  pricePerSeed  Float?
  
  stockStatus      StockStatus?
  seedType         SeedType?
  cannabisType     CannabisType?
  photoperiodType  PhotoperiodType?
  
  thcMin    Float?
  thcMax    Float?
  cbdMin    Float?
  cbdMax    Float?
  
  seedImages SeedImage[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([sellerId, slug])
  @@index([pricePerSeed])
  @@index([seedType])
  @@index([cannabisType])
}
```

### Proposed Schema Changes (Phase 2)

**Option A**: Thêm fields vào `Seed` model
```prisma
model Seed {
  // ... existing fields
  
  // Price tracking (Phase 2)
  lowestPriceSeller     String?
  lowestPriceSellerUrl  String?
  lowestPriceProductUrl String?
  lastPriceUpdate       DateTime?
}
```

**Option B**: Tạo separate table `SeedPrice` (Recommended)
```prisma
model SeedPrice {
  id        String   @id @default(cuid())
  seedId    String
  seed      Seed     @relation(fields: [seedId], references: [id])
  
  sellerName    String
  sellerUrl     String
  productUrl    String
  totalPrice    Float
  packSize      Float
  pricePerUnit  Float
  
  scrapedAt DateTime @default(now())
  
  @@index([seedId, pricePerUnit])
}
```

**Lý do chọn Option B**:
- ✅ Track price history
- ✅ Compare prices từ multiple sellers
- ✅ Update prices without modifying Seed record
- ✅ Analytics: price trends, lowest prices over time

---

## 💡 Use Cases & Strategy

### **Option 1: Dùng Leafly Strains làm Reference Database**
**Pros**:
- ✅ Data chất lượng cao (THC/CBD verified)
- ✅ Comprehensive strain catalog
- ✅ Rich metadata (effects, flavors, terpenes)

**Cons**:
- ❌ Không có giá thật
- ❌ Không phải seed seller

**Workflow**:
1. Scrape Leafly strains → save với `sellerId = "leafly-reference"`
2. Scrape real seed sellers (ILGM, Seed Supreme)
3. Match strain names với Leafly reference
4. Enrich seller products với THC/CBD từ Leafly

---

### **Option 2: MVP Testing Only**
**Pros**:
- ✅ Quick data population
- ✅ Test UI/filters với data thật
- ✅ No dependencies on real sellers

**Cons**:
- ❌ Not production-ready (no prices)
- ❌ Need to replace later

**Workflow**:
1. Scrape 100-200 strains từ Leafly
2. Test frontend search/filter/sorting
3. Replace với data từ real sellers khi ready

---

### **Option 3: Hybrid Approach (Recommended)**
**Workflow**:
1. **Phase 1**: Scrape Leafly strains → reference database
2. **Phase 2**: Scrape real sellers (ILGM, Seed Supreme, Herbies)
3. **Link**: Match seller products với Leafly strains
4. **Enrich**: Add THC/CBD/metadata từ Leafly vào seller products

**Benefits**:
- ✅ Best of both worlds
- ✅ Rich metadata + real prices
- ✅ Scalable architecture

---

## ⚠️ Lưu Ý & Rủi Ro

### **Risk 1: Leafly Block Scraping**
- Products có thể load qua API (dynamic)
- Cần Puppeteer để render JS
- Rate limiting có thể block nhiều requests

**Mitigation**:
- Dùng Puppeteer với proper user agent
- Implement delays 2-5s (đã có)
- Add proxy support (future)

### **Risk 2: Price Data Không Available** ⚠️ HIGH RISK
- Strain detail page có thể KHÔNG hiển thị products/prices
- Chỉ show "Where to buy" với links đến dispensaries
- **Finding**: Leafly hiển thị dispensary products (flower), KHÔNG phải seeds

**Mitigation**:
- ✅ Check multiple strains manually trước (DONE - confirmed no seed prices)
- ✅ Nếu không có price data → fallback to `totalPrice: 0` (CURRENT)
- ⏳ Consider **alternative strategy**: Scrape real seed sellers instead
- 📋 Document clearly: Leafly = reference data only, not for prices

**Recommendation**: 
- **Keep Phase 1** (strain info) as reference database
- **Skip Phase 2** for Leafly (no seed prices available)
- **Focus on** real seed seller scrapers (ILGM, Seed Supreme, Herbies)

### **Risk 3: Performance Issues**
- Scraping 100 strain detail pages mất nhiều thời gian
- Database writes có thể slow

**Mitigation**:
- Batch processing (10-20 strains/batch)
- Implement queue system
- Cache strain basic info, chỉ update prices định kỳ

---

---

## 📝 Important Notes

### ⚠️ Không Có Giá Thật từ Leafly
Leafly Strains là **reference database**, không phải seed seller:
- ✅ Good for: Strain info, THC/CBD, metadata
- ❌ Not good for: Actual seed prices and pack sizes
- 💡 Use case: Reference database to enrich seller products

### 🎯 Recommended Next Steps
1. ✅ **Keep using Leafly Phase 1** cho strain reference data
2. 🔄 **Skip Leafly Phase 2** (no seed prices available)
3. 🚀 **Create scrapers for real seed sellers**:
   - ILGM (ilgm.com)
   - Seed Supreme (seedsupreme.com)
   - Herbies Seeds (herbiesheadshop.com)
   - Crop King Seeds (cropkingseeds.com)

### 🏗️ Architecture Strategy
```
┌─────────────────┐
│  Leafly Strains │  → Reference Database (THC/CBD/metadata)
└────────┬────────┘
         │
         │ Enrich
         ↓
┌─────────────────┐
│  Seed Sellers   │  → Real products with prices
│  (ILGM, etc.)   │
└─────────────────┘
```

### 📊 Data Quality Comparison
| Source | THC/CBD | Prices | Stock | Images | Metadata |
|--------|---------|--------|-------|--------|----------|
| Leafly | ✅ Excellent | ❌ No | ❌ No | ✅ Yes | ✅ Rich |
| ILGM | ⚠️ Basic | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Basic |
| Seed Supreme | ⚠️ Basic | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Basic |

**Strategy**: Combine both for best results!

---

## 🔄 Monitoring & Updates

- Leafly có thể thay đổi HTML structure → cần monitoring
- Prices từ real sellers change frequently → daily/weekly updates
- Không phải tất cả strains đều có products listed ở sellers
- Need to distinguish giữa "flower", "seeds", và "clones"

---

## 📚 Related Documentation

- **Leafly Scraper Code**: `scrapers/leafly/leafly-strain-scraper.ts`
- **Test Script**: `scripts/test/test-leafly-strains.ts`
- **Seed Sellers Script**: `scripts/seed/seed-sellers.ts`
- **Prisma Schema**: `prisma/schema.prisma`

---

## ✅ Status Summary

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Phase 1: Strain Info | ✅ Done | HIGH | Working, can save to DB |
| Phase 2: Price Extraction | ⏸️ Paused | LOW | No seed prices on Leafly |
| Real Seed Seller Scrapers | 🔄 Todo | HIGH | ILGM, Seed Supreme, etc. |
| Price Tracking Schema | 📋 Planned | MEDIUM | SeedPrice table design |
| Strain Matching Logic | 📋 Planned | MEDIUM | Link sellers to Leafly |

---

**Last Updated**: November 28, 2025  
**Maintainer**: GoodSeed Development Team
