app/api/
├── admin/                          # Toàn bộ API dành cho admin (cần auth middleware)
│   ├── sellers/                    # Resource chính: Seller
│   │   ├── route.ts                # GET: List all sellers (for admin dashboard)
│   │   │                           # POST: Create new seller (nếu cần thêm seller mới)
│   │   └── [id]/                   # Dynamic route cho từng seller
│   │       ├── route.ts            # GET: Chi tiết seller
│   │       │                       # PATCH: Update seller (name, kill switch hidden, isActive)
│   │       │                       # DELETE: Xóa seller (soft delete)
│   │       ├── scraper/            # Hành động scrape cho seller này
│   │       │   ├── route.ts        # POST: Trigger manual scrape ngay lập tức
│   │       │   └── schedule/       # Lên lịch tự động
│   │       │       └── route.ts    # GET: Lấy lịch hiện tại
│   │       │                       # POST/PATCH: Set cron schedule (e.g., "0 */6 * * *")
│   │       │                       # DELETE: Tắt lịch tự động
│   │       └── scrape-logs/               # Lịch sử scrape
│   │           └── route.ts        # GET: Lịch sử scrape jobs của seller này (status, duration, products saved, errors)
│   │
│   ├── scraper/                    # Các API tổng quát cho scraper (không gắn với seller cụ thể)
│   │   ├── route.ts                # GET: Tổng quan tất cả scrape jobs gần đây (cho dashboard)
│   │   ├── status(scrape-job)/                 # Theo dõi tiến độ job
│   │   │   └── [jobId]/            
│   │   │       └── route.ts        # GET: Chi tiết status một job (IN_PROGRESS, COMPLETED, FAILED, progress %)
│   │   └── schedule-all/           # Lên lịch cho tất cả sellers cùng lúc
│   │       └── route.ts            # POST: Set global schedule (ví dụ chạy tất cả sellers lúc 2AM)
│   │
│   └── health/                     # Optional: Health check cho monitoring
│       └── route.ts                # GET: Trả về status hệ thống (DB, Redis, queue)
│
├── search/                         # API public cho frontend/template (không cần auth)
│   └── route.ts                    # GET/POST: Search products với filters (price per seed, types, THC/CBD, etc.)
│                                   # Params: page, limit, search, minPrice, maxPrice, types[], thcMin, etc.
│
└── cron/                           # API nội bộ cho scheduled scraping (chỉ AWS EventBridge gọi)
    └── scraper/
        └── route.ts                # GET: Trigger tự động cho tất cả sellers có schedule bật
                                    # Bảo vệ bằng CRON_SECRET header


Route,Method,Mục Đích,Liên Kết Với Tài Liệu
GET /api/admin/sellers,GET,Lấy danh sách tất cả sellers (cho admin dashboard),Admin dashboard
GET/PATCH /api/admin/sellers/[id],GET/PATCH,"Chi tiết + update seller (kill switch hidden, isActive)",2.5 Kill Switch
POST /api/admin/sellers/[id]/scraper,POST,Trigger manual scrape ngay cho seller này,Manual run scraper
GET/POST/PATCH /api/admin/sellers/[id]/scraper/schedule,-,Quản lý lịch tự động cho từng seller (cron expression),2.3 Run every 6-12h
GET /api/admin/sellers/[id]/logs,GET,"Xem lịch sử scrape của seller (last run time, success/errors)",2.5 Dashboard
GET /api/admin/scraper,GET,Tổng quan tất cả scrape jobs (toàn hệ thống),Admin monitoring
GET /api/admin/scraper/status/[jobId],GET,"Theo dõi tiến độ một job cụ thể (progress, current page, etc.)",Real-time status
POST /api/admin/scraper/schedule-all,POST,Set lịch tự động cho tất cả sellers,Scheduled scraping
GET /api/cron/scraper,GET,Endpoint nội bộ cho EventBridge/Lambda gọi hàng ngày,Automated run
GET/POST /api/search,GET/POST,Public API cho frontend/template tìm kiếm với filters,2.3 Backend Search + 2.4 Filters