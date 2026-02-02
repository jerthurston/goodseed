# Price Change Alert Queue

Module xử lý price change detection và gửi email thông báo giá giảm cho users.

## 📁 Cấu trúc

```
price-change-alert/
├── price-change-alert.jobs.ts       # Job type definitions
├── price-change-alert.queue.ts      # Queue configuration
├── price-change-alert.processor.ts  # Job processing logic
├── index.ts                         # Barrel exports
└── README.md                        # Documentation
```

## 🎯 Mục đích

Tách biệt các concerns của queue system:
- **Jobs**: Định nghĩa data structure
- **Queue**: Cấu hình và event handling
- **Processor**: Business logic xử lý jobs
- **Index**: Exports cho external usage

## 📝 Job Types

### 1. `detect-price-changes`

Phát hiện thay đổi giá từ scraped data.

**Input:**
```typescript
{
  type: 'detect-price-changes',
  data: {
    sellerId: string,
    sellerName: string,
    scrapedProducts: Array<{
      seedId?: string,
      name: string,
      slug: string,
      url?: string,
      imageUrl?: string,
      pricings: Array<{
        packSize: number,
        totalPrice: number
      }>
    }>,
    scrapedAt: Date
  }
}
```

**Output:**
- Phát hiện giảm giá ≥5%
- Tìm users quan tâm
- Tạo email jobs

### 2. `send-price-alert-email`

Gửi email thông báo giá giảm cho user.

**Input:**
```typescript
{
  type: 'send-price-alert-email',
  data: {
    userId: string,
    email: string,
    userName: string,
    priceChanges: Array<{
      productId: string,
      productName: string,
      productSlug: string,
      productImage: string,
      sellerName: string,
      sellerWebsite: string,
      variantPackSize: number,
      oldPrice: number,
      newPrice: number,
      priceChange: number,
      priceChangePercent: number,
      currency: string
    }>
  }
}
```

## 🚀 Usage

### Add job to queue

```typescript
import { priceAlertQueue, PRICE_ALERT_JOB_TYPES } from '@/lib/queue/price-change-alert';

// Detect price changes sau khi crawl xong
await priceAlertQueue.add({
  type: PRICE_ALERT_JOB_TYPES.DETECT_PRICE_CHANGES,
  data: {
    sellerId: 'seller-123',
    sellerName: 'Seed Supreme',
    scrapedProducts: [...],
    scrapedAt: new Date(),
  }
});

// Gửi email cho user
await priceAlertQueue.add({
  type: PRICE_ALERT_JOB_TYPES.SEND_PRICE_ALERT_EMAIL,
  data: {
    userId: 'user-456',
    email: 'user@example.com',
    userName: 'John Doe',
    priceChanges: [...],
  }
});
```

### Register processor in worker

```typescript
import { priceAlertQueue, processPriceAlertJob } from '@/lib/queue/price-change-alert';

// Worker setup
priceAlertQueue.process(processPriceAlertJob);
```

### Monitor queue health

```typescript
import { getPriceAlertQueueStats } from '@/lib/queue/price-change-alert';

const stats = await getPriceAlertQueueStats();
console.log(stats);
// {
//   waiting: 5,
//   active: 2,
//   completed: 100,
//   failed: 3,
//   delayed: 0,
//   total: 110
// }
```

## ⚙️ Configuration

### Queue Options

```typescript
{
  attempts: 3,              // Retry 3 lần nếu thất bại
  backoff: {
    type: 'exponential',    // 5s → 25s → 125s
    delay: 5000
  },
  removeOnComplete: {
    age: 86400,            // Xóa sau 24 giờ
    count: 1000            // Giữ tối đa 1000 jobs
  },
  removeOnFail: {
    age: 604800            // Giữ failed jobs 7 ngày
  }
}
```

## 🔄 Flow Diagram

```
┌─────────────────┐
│  Scraper Done   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ detect-price-changes job    │
│                             │
│ 1. Compare prices           │
│ 2. Filter ≥5% drops         │
│ 3. Find users to notify     │
│ 4. Create email jobs        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ send-price-alert-email job  │
│                             │
│ 1. Load email template      │
│ 2. Inject price data        │
│ 3. Send via email service   │
└─────────────────────────────┘
```

## 🎨 Design Principles

1. **Separation of Concerns**
   - Jobs: Data structure only
   - Queue: Infrastructure setup
   - Processor: Business logic

2. **Type Safety**
   - Strongly typed job data
   - Union types cho extensibility

3. **Observability**
   - Event logging với apiLogger
   - Queue stats monitoring
   - Error tracking

4. **Extensibility**
   - Dễ dàng thêm job types mới
   - Centralized exports qua index.ts

## 📊 Monitoring

Queue events được log với các levels:
- `info`: Job completed, queue stats
- `warn`: Job stalled
- `error`: Job failed sau all retries
- `debug`: Job waiting, active

## 🔧 Troubleshooting

### Job bị stuck (stalled)

- Worker bị crash hoặc mất connection
- Job execution quá lâu
- **Solution**: Restart worker, check logs

### Job failed nhiều lần

- Database connection issues
- Email service down
- Invalid data format
- **Solution**: Check error logs, verify data structure

### Queue memory cao

- Too many completed jobs
- Failed jobs không được clean up
- **Solution**: Adjust retention policies

## 🚦 Future Enhancements

- [ ] Add job scheduling (cron-based price checks)
- [ ] Implement email template system
- [ ] Add webhook notifications
- [ ] Support multiple notification channels (SMS, Push)
- [ ] Add user notification preferences filtering
- [ ] Batch email sending để tối ưu
