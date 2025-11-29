Dựa trên tài liệu "GoodSeed Development Document", tech stack được khuyến nghị tập trung vào hiệu suất, SEO và tích hợp dễ dàng. Dưới đây là tổng hợp ngắn gọn, phân loại theo các thành phần chính (MVP ưu tiên, với một số mở rộng post-MVP):
0. Scraper framework: Crawlee javascript
1. Frontend & Frameworks

Ưu tiên: Next.js (React) để hỗ trợ Server-Side Rendering (SSR) cho SEO.
Cấm: Pure Client-Side Rendering (CRA/Vite).
Tích hợp: Kết nối với age gate và site hiện có; sử dụng components cho filters (sliders, checkboxes).

2. Backend & API

Search System: API query database nội bộ (không real-time scrape).
Scheduling: Background jobs với Cron để chạy scrapers định kỳ (6-12 giờ).
Scrapers: Modular (một file/class per site), hỗ trợ politeness (delay 2-5s), proxies, fail-safe logging.
Gợi ý thư viện: Puppeteer/Cheerio cho scraping, Axios/Node-fetch cho requests.


3. Database
Primsa ORM để tương tác với database
Relational/SQL: PostgreSQL (hỗ trợ indexing cho filtering nhanh: price_per_seed, thc_min, etc.).
Normalization: Tính toán và lưu price_per_seed, parse THC/CBD ranges.

4. Infrastructure & Hosting

Hosting: AWS (EC2, Fargate, hoặc App Runner).
Caching/CDN: Cloudflare cho static assets và bảo vệ DDOS.
Logging: Sentry hoặc AWS CloudWatch để track scraper failures.

5. Alerts & Notifications

Scraper alerts: Slack/email tự động nếu fail.
Post-MVP: Email notifications (price drop, back in stock) – có thể dùng Resend hoặc tương tự.

6. User Features (Post-MVP)

Authentication: NextAuth hoặc tương đương cho login Google/Facebook/Email, với verification/reset.
CMS: Để edit homepage/FAQs mà không chạm code (gợi ý Sanity/Strapi nếu cần).
Export: CSV writer cho segmented data.

7. Công Cụ Khác

Affiliate links: Function linh hoạt để append tags (URL params hoặc redirects).
Admin Panel: Buttons cho kill switch, run/pause scraper, health dashboard.