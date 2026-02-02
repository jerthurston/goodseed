# Price Alert Job Creation - Complete Flow

## 📍 Các vị trí tạo Jobs

```
┌─────────────────────────────────────────────────────────────────────┐
│                    JOB CREATION LOCATIONS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1️⃣  AUTOMATIC (Scraper hoàn thành) ⭐ PRIMARY                       │
│      lib/queue/scraper-queue/scraper.processor.ts                   │
│      ├─ Trigger: Sau khi scraper crawl & save products              │
│      ├─ Why: Có data mới để so sánh với giá cũ                      │
│      └─ Action: createDetectPriceChangesJob()                       │
│                                                                      │
│  2️⃣  MANUAL (Admin trigger qua API) 🛠️ OPTIONAL                     │
│      app/api/admin/trigger-price-check/route.ts                     │
│      ├─ Trigger: Admin button click (debug/testing)                 │
│      ├─ Why: Testing hoặc re-run detection                          │
│      └─ Action: createDetectPriceChangesJob()                       │
│                                                                      │
│  ❌ KHÔNG CÓ Cron Job riêng cho price check                          │
│     Lý do:                                                           │
│     - Scraper đã chạy định kỳ (auto schedule)                       │
│     - Không có data mới để compare nếu chưa crawl                   │
│     - Redundant và waste resources                                  │
│                                                                      │
│  3️⃣  INTERNAL (Trong price alert processor)                         │
│      lib/queue/price-change-alert/price-change-alert.processor.ts   │
│      ├─ Trigger: Sau khi detect price changes                       │
│      └─ Action: createPriceAlertEmailJob() / batchCreateEmailJobs() │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ All calls go through
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │  lib/services/marketing/price-alert/              │
        │  priceAlertJobCreator.ts                          │
        │  (Centralized Job Creation Service)               │
        │                                                    │
        │  ✅ createDetectPriceChangesJob()                 │
        │  ✅ createPriceAlertEmailJob()                    │
        │  ✅ batchCreateEmailJobs()                        │
        │  ✅ scheduleSellersPriceCheck()                   │
        └───────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Price Alert Queue    │
                        │  (price-alert-jobs)   │
                        └───────────────────────┘
```

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         COMPLETE FLOW                                │
└─────────────────────────────────────────────────────────────────────┘

        ┌─────────────────────────────────────┐
        │   Auto Scraper (Scheduled)          │
        │   Chạy định kỳ mỗi 6h/12h/24h       │
        └──────────────┬──────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  Scraper Queue                       │
        │  1. Crawl products từ seller sites   │
        │  2. Save/Update products in DB       │
        │  3. Trigger price detection ──┐      │
        └───────────────────────────────┼──────┘
                                        │
                    ┌───────────────────┘
                    │
                    ▼                      Optional: Admin manual trigger
                ┌────────────────────────────┐              │
                │ priceAlertJobCreator.ts    │◄─────────────┘
                │ createDetectPriceChangesJob│
                └────────────┬───────────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │   Price Alert Queue        │
                │   Job: detect-price-changes│
                └────────────┬───────────────┘
                             │
                             ▼
                ┌────────────────────────────────────┐
                │  Price Alert Processor             │
                │  handleDetectPriceChanges()        │
                │                                    │
                │  1. Compare new vs old prices      │
                │  2. Filter ≥5% drops               │
                │  3. findUsersToNotify()            │
                │  4. Create email jobs per user ──┐ │
                └──────────────────────────────────┼─┘
                                                   │
                                                   ▼
                                      ┌────────────────────────────┐
                                      │   Price Alert Queue        │
                                      │   Job: send-email (batch)  │
                                      └────────────┬───────────────┘
                                                   │
                                                   ▼
                                      ┌────────────────────────────┐
                                      │  Email Processor           │
                                      │  1. Check daily limit      │
                                      │  2. Send batch email ✉️    │
                                      └────────────────────────────┘

KEY INSIGHT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price detection KHÔNG CẦN cron riêng vì:
✅ Scraper đã chạy theo schedule (auto trigger)
✅ Price detection chỉ có ý nghĩa KHI CÓ data mới từ scraper
✅ Avoid redundant checks khi không có data thay đổi
```

## 📂 File Mapping

### Service Layer (Job Creation)
```
lib/services/marketing/price-alert/priceAlertJobCreator.ts
├── createDetectPriceChangesJob()      → Used by: Scraper, API, Cron
├── createPriceAlertEmailJob()         → Used by: Processor
├── batchCreateEmailJobs()             → Used by: Processor
└── scheduleSellersPriceCheck()        → Used by: Cron
```

### Trigger Points
```
1. lib/queue/scraper-queue/scraper.processor.ts ⭐ PRIMARY
   └── After saveScrapedProducts()
       └── createDetectPriceChangesJob()
       
   WHY: Đây là lúc duy nhất có data mới để so sánh giá

2. app/api/admin/trigger-price-check/route.ts (Optional)
   └── POST handler
       └── createDetectPriceChangesJob()
       
   WHY: Debug/testing hoặc re-run detection cho specific seller

3. lib/queue/price-change-alert/price-change-alert.processor.ts
   └── handleDetectPriceChanges()
       └── batchCreateEmailJobs()
       
   WHY: Sau khi detect xong, tạo email jobs cho users
```

## ❌ Misconceptions (Những gì KHÔNG NÊN làm)

### ❌ WRONG: Cron job riêng để check giá

```typescript
// ❌ BAD - app/api/cron/daily-price-check/route.ts
// Cron chạy hàng ngày để check giá tất cả products

export async function GET() {
  // Lấy tất cả products từ DB
  const products = await prisma.seedProduct.findMany();
  
  // So sánh với... chính nó? (Không có data mới!)
  await detectPriceChanges(products);
}
```

**Vấn đề:**
- Không có data mới để so sánh (giá vẫn vậy trong DB)
- Cần crawl mới từ seller sites mới có data update
- Duplicate công việc của scraper

### ✅ CORRECT: Price check tự động sau scraper

```typescript
// ✅ GOOD - lib/queue/scraper-queue/scraper.processor.ts

export async function processScraperJob(job) {
  // 1. Crawl fresh data từ seller site
  const scrapedProducts = await crawlSeller(sellerId);
  
  // 2. Save vào DB (update prices)
  const savedProducts = await saveScrapedProducts(scrapedProducts);
  
  // 3. NGAY LẬP TỨC detect price changes
  // (compare fresh data với old data in DB)
  await createDetectPriceChangesJob({
    scrapedProducts: savedProducts
  });
}
```

**Tại sao đúng:**
- ✅ Có data mới từ scraping
- ✅ So sánh new price vs old price có ý nghĩa
- ✅ Không duplicate logic
- ✅ Real-time detection ngay khi có update

## 🎯 Usage Examples

### 1. Auto-trigger sau scraper (PRIMARY)
```typescript
// lib/queue/scraper-queue/scraper.processor.ts
import { createDetectPriceChangesJob } from '@/lib/services/marketing/price-alert/priceAlertJobCreator';

async function processScraperJob(job) {
  // Crawl & save products
  const savedProducts = await saveScrapedProducts(...);
  
  // Immediately detect price changes
  const jobId = await createDetectPriceChangesJob({
    sellerId: 'seller-123',
    sellerName: 'Seed Supreme',
    scrapedProducts: savedProducts
  });
  
  apiLogger.info('Price detection triggered', { jobId });
}
```

### 2. Manual trigger qua API (DEBUG/TESTING ONLY)
```bash
# Re-run detection cho specific seller
curl -X POST http://localhost:3000/api/admin/trigger-price-check \
  -H "Content-Type: application/json" \
  -d '{"sellerId": "seller-123"}'
```

### 3. Batch create email jobs (INTERNAL)
```typescript
// Inside price-change-alert.processor.ts
import { batchCreateEmailJobs } from '@/lib/services/marketing/price-alert/priceAlertJobCreator';

// Sau khi detect xong price changes
await batchCreateEmailJobs(
  users.map(user => ({
    userId: user.userId,
    email: user.email,
    userName: user.name,
    priceChanges: getUserPriceChanges(user)
  }))
);
```

## ✅ Benefits of Centralized Service

1. **Single Responsibility**: Job creation logic ở 1 nơi
2. **Reusability**: Dùng lại từ nhiều contexts khác nhau
3. **Consistency**: Đảm bảo job data structure đồng nhất
4. **Testability**: Dễ viết unit tests
5. **Maintainability**: Thay đổi logic chỉ cần sửa 1 file

## 🔒 Security Considerations

### API Routes
- ✅ Check admin permissions
- ✅ Validate sellerId exists
- ✅ Rate limiting

### Cron Jobs
- ✅ Verify cron secret (Vercel)
- ✅ Add delays between sellers
- ✅ Limit products per batch

### Job Creation
- ✅ Validate data before adding to queue
- ✅ Filter out invalid products
- ✅ Error handling với proper logging
