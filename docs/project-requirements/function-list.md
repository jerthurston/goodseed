# Danh Sách Tính Năng Theo Giai Đoạn

Dựa trên tài liệu "GoodSeed Development Document (Simple Version for Dev)", tôi tổng kết danh sách tính năng được chia rõ ràng thành hai giai đoạn: **MVP (Minimum Viable Product)** - tập trung vào core functionality đơn giản, và **Full Version** - mở rộng với user features và admin nâng cao. Tôi liệt kê theo các phần chính từ tài liệu, giữ nguyên ý nghĩa gốc mà không thêm thắt.

## MVP (Giai Đoạn 1: Core Search & Scraping)
MVP nhấn mạnh "database-first" với scrapers background, search nhanh, frontend filters, và admin cơ bản. Bao gồm các phần từ 2.1 đến 2.6, cộng với Scraper Rules (3).

- **Scrapers & Data**: [Guidelines](../scraper/)
  - Một scraper riêng cho mỗi seller site. Chọn khoảng 3 site để demo trước và xác định số lượng site cần scaper từ khách hàng.
    - Leafly.com: [Guidelines](../scraper/leafly/)
    - SeedSupreme.com [Guidelines](../scraper/seedsupreme/)
    - fireandflower.com [Guidelines](../scraper/fireandflower/)
  - Thu thập dữ liệu: Product Name & URL, Image URL, Total Price & Pack Size, Stock status, Type (Autoflower/Photoperiod, Feminized/Regular, Sativa/Indica/Mix), THC % & CBD %.
  - Normalize data: Tính price per seed (total price / pack size), chuyển ranges (e.g., 20-25%) thành min/max, standardize names (e.g., "Auto-flowering" → "Autoflower").

- **Affiliate Links**:
  - Thêm affiliate tags vào URLs sản phẩm.

- **Backend Search**:
  - Tìm kiếm trên database nội bộ (không scrape sellers trực tiếp).
  - Index fields: price per seed, THC/CBD, seed type, cannabis type.
  - Scrapers chạy định kỳ 6-12 giờ.
  - Scraper alerts: Thông báo admin nếu scraper fail.

- **Frontend & Filters**:
  - Sử dụng SSR (Next.js/Nuxt.js preferred).
  - Integrate với existing pages và age gate.
  - Hiển thị price per seed nổi bật.
  - Filters: Price per Seed (slider + min/max inputs), Seed Type (checkboxes: Regular, Feminized, Autoflower), Cannabis Type (checkboxes: Sativa, Indica, Mix), THC/CBD Range (slider + numeric inputs).

- **Admin Panel**:
  - Kill switch để ẩn một seller.
  - Buttons để run hoặc pause scrapers.
  - Dashboard hiển thị last run time, success, errors.
  - Scraper failure alerts đến admin.

- **Infrastructure**:
  - Database: SQL (Postgres/MySQL/MariaDB).
  - Hosting: AWS.
  - Caching: Cloudflare.
  - Logging: Sentry hoặc CloudWatch.

- **Scraper Rules** (Hỗ trợ MVP):
  - Một file per site.
  - Wait 2-5 seconds giữa requests.
  - Lấy lowest price nếu hiển thị range.
  - Capture pack size.
  - Log errors nhưng không break search.
  - Support proxies.
  - Send alerts nếu scraper fails.

## Full Version (Giai Đoạn 2: User Engagement & Advanced Admin)
Full Version mở rộng từ MVP với accounts, favorites, notifications, và admin chi tiết hơn (phần 4).

- **Accounts**:
  - Login: Google, Facebook, Email.
  - Email verification và reset.
  - Store preferences: Marketing emails và price alerts.

- **Favorites & Lists**:
  - Heart button để save sản phẩm.
  - Custom lists per user.
  - Sync across devices.

- **Notifications**:
  - Emails cho price drop hoặc back in stock.

- **Admin**:
  - Manage users (view, ban, delete).
  - Export user emails với filters.
  - Edit homepage/FAQ text.

#### Tóm Tắt Tổng Thể (Từ Section 5)
- **MVP**: Database-first, background scrapers, fast search; SSR frontend với age gate; price per seed, affiliate links, filters; Admin với kill switch, scraper health + alerts; AWS backend, Cloudflare caching.
- **Full Version**: User accounts, favorites, lists; Email notifications cho price changes; Admin với segmented export cho marketing.
