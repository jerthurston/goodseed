# TÌM HIỂU CHI TIẾT REQUIREMENT Goodseed APP

## YÊU CẦU 1:
===
* One scraper per seller site.
* Collect:
  * Product Name & URL
  * Image URL
  * Total Price and Pack Size
  * Stock status
  * Type: Autoflower/Photoperiod, Feminized/Regular, Sativa/Indica/Mix
  * THC % and CBD %

* Normalize data:
  * Price per seed = total price / pack size
  * Convert ranges like 20-25% into min/max numbers
  * Standardize names (e.g., "Auto-flowering" -> "Autoflower")

* Scraper Rulers:
  * One file per site.
  * Wait 2-5 seconds between requests.
  * Take lowest price if a range is shown.
  * Capture pack size.
  * Log errors but do not break search.
  * Support proxies.
  * Send alerts if scraper fails.
===
## DIỄN GIẢI YÊU CẦU 1:
*****
Phần này tập trung vào các tính năng cốt lõi cần triển khai đầu tiên cho ứng dụng GoodSeed - 
một website tìm kiếm hạt giống cannabis bằng cách thu thập dữ liệu từ các nhà bán khác, chuẩn hóa và hiển thị ở một nơi duy nhất. 
Người dùng chỉ click để chuyển hướng đến site bán hàng gốc.

Tài liệu nhấn mạnh tính đơn giản cho dev, sử dụng scraper nền tảng, database-first, và tích hợp affiliate links. 
MVP không bao gồm user accounts hay notifications (đó là full version sau).

### Scrapers & Data
Đây là phần cốt lõi về việc thu thập và xử lý dữ liệu từ các site bán hạt giống cannabis.

- **One scraper per seller site**: Mỗi nhà bán (seller) cần một scraper riêng (có thể là một file code riêng, như `scraper_seller1.js`). Lý do: Mỗi site có cấu trúc HTML khác nhau, nên tách biệt để dễ maintain và debug. Không dùng scraper chung để tránh phức tạp.
Mỗi seller có cấu trúc web khác nhau (e.g., HTML selectors cho price, THC %), nên tách file để customize code scrape (collect data như Product Name & URL, normalize price per seed). Điều này dễ maintain, debug, và handle errors/alerts riêng (Scraper Rules: Log errors but do not break search, Send alerts if scraper fails).
Bắt Đầu Với Bao Nhiêu?: Với MVP, bắt đầu 3-5 file (e.g., Seed Supreme, ILGM, Herbies) để test (run every 6-12 hours – phần 2.3), rồi scale lên. Lưu seller list trong DB hoặc config để admin kill switch (phần 2.5).

- **Collect** (Dữ liệu cần thu thập cho từng sản phẩm):
  - **Product Name & URL**: Tên sản phẩm và link chi tiết sản phẩm (để người dùng click chuyển hướng).
  - **Image URL**: Link ảnh sản phẩm (hiển thị thumbnail trên site của bạn).
  - **Total Price and Pack Size**: Giá tổng cho gói và số lượng hạt trong gói (e.g., $50 cho 10 hạt).
  - **Stock status**: Tình trạng hàng (in stock/out of stock, có thể là boolean hoặc text như "Available").
  - **Type**: Các loại phân loại:
    - Autoflower/Photoperiod (loại nở hoa tự động hay phụ thuộc ánh sáng).
    - Feminized/Regular (giống cái hóa hay thông thường).
    - Sativa/Indica/Mix (loại cannabis: Sativa năng lượng, Indica thư giãn, hoặc lai).
  - **THC % and CBD %**: Phần trăm THC (chất gây phê) và CBD (chất thư giãn/y tế).

- **Normalize data** (Chuẩn hóa dữ liệu để dễ search và hiển thị thống nhất):
  - **Price per seed = total price / pack size**: Tính giá mỗi hạt (e.g., $50 / 10 = $5/hạt). Hiển thị nổi bật trên frontend.
  - **Convert ranges like 20-25% into min/max numbers**: Chuyển khoảng (range) thành số min/max (e.g., THC 20-25% → thc_min: 20, thc_max: 25). Lưu vào DB dưới dạng số để filter dễ dàng.
  - **Standardize names**: Thống nhất tên gọi (e.g., "Auto-flowering" → "Autoflower", "Photo Period" → "Photoperiod"). Sử dụng mapping dictionary trong code để replace.

- **Scraper Rulers** (Quy tắc khi viết scraper):
    - ***One file per site***:
        -  Ý nghĩa: Mỗi seller site (nhà bán) phải có một file code scraper riêng biệt (e.g., scraper_seller1.ts, scraper_seller2.ts). Không dùng một file chung cho tất cả.
        - Lý do: Các site có cấu trúc HTML/JS khác nhau (e.g., class names, selectors), nên tách biệt để dễ debug, update khi site thay đổi. Điều này khớp với "One scraper per seller site" ở 2.1, giúp modular hóa code.
        - Triển khai gợi ý: Trong folder src/scrapers/ (như cấu trúc tôi đề xuất trước), mỗi file export một function async (e.g., async function scrapeSeller1() { ... }). Sử dụng Cheerio (cho static) hoặc Puppeteer (cho dynamic sites) để parse dữ liệu như product name, URL, etc.
    - ***Wait 2-5 seconds between requests***:
        - Ý nghĩa: Giữa mỗi request HTTP (e.g., fetch một page), chờ ngẫu nhiên 2-5 giây để mimic hành vi người dùng thật.
        - Lý do: Tránh rate limiting hoặc bị ban IP từ site (e.g., nếu request quá nhanh, site nghĩ là bot). Điều này giúp scraper "lịch sự" và bền vững.
        - Triển khai gợi ý: Sử dụng setTimeout hoặc thư viện như puppeteer-extra với delay random: await new Promise(r => setTimeout(r, Math.random() * 3000 + 2000));. Áp dụng khi loop qua pagination (các trang sản phẩm).
        - Kịch bản đúng sẽ là:
            - Scraper A (cho Site A):
                - Gửi yêu cầu (request) đến siteA.com/products?page=1.
                - Xử lý dữ liệu trang 1.
                - Đợi 2-5 giây.
                - Gửi yêu cầu tiếp theo đến siteA.com/products?page=2.
                - Xử lý dữ liệu trang 2.
                - Đợi 2-5 giây.
                - Tiếp tục cho page=3, page=4... Cứ mỗi một lần chuyển trang là một request mới và bạn phải đợi trước khi thực hiện nó.
            - Scraper B (cho Site B):Quy trình tương tự cũng được áp dụng cho Site B. Giữa các lần request đến siteB.com cũng phải có độ trễ 2-5 giây.
            - Về việc crawl 10 - 12 trang cùng lúc:
                - Điều quan trọng cần lưu ý là quy tắc này không áp dụng giữa các trang web khác nhau.
                - Tình huống A: Bạn chạy 10 - 12 scraper song song (parallel) - (khuyến khích chọn phương án này -  nhanh hiệu suất cao nếu đáp ứng được hạ tầng)
                - Tình huống B: Chạy 10 - 12 scraper lần lượt (sequential) - (thiết lập đơn giản hơn nhưng không hiệu quả)
    - ***Take lowest price if a range is shown***:
        - Ý nghĩa: Nếu giá hiển thị dưới dạng khoảng (range, e.g., $10-$15), lấy giá thấp nhất ($10) làm total price.
        - Lý do: Đảm bảo tính nhất quán và tối ưu cho người dùng (giá thấp nhất hấp dẫn hơn), đồng thời dễ normalize thành price per seed (tổng giá / pack size).
        - Triển khai gợi ý: Trong code parse, kiểm tra nếu text giá có "-" thì split và lấy phần đầu (e.g., const price = parseFloat(range.split('-')[0].replace('$', ''));). Kết hợp với normalize ở 2.1.

    - ***Capture pack size***:
        - Ý nghĩa: Bắt buộc thu thập kích thước gói (pack size, e.g., 5 seeds, 10 seeds) cho mỗi sản phẩm.
        - Lý do: Cần để tính price per seed (total price / pack size), một field quan trọng để hiển thị và filter trên frontend.
        - Triển khai gợi ý: Parse từ HTML (e.g., select dropdown hoặc text như "Pack of 10"). Nếu không có, fallback về default (e.g., 1) hoặc log error.

    - ***Log errors but do not break search***:
        - Ý nghĩa: Khi gặp lỗi (e.g., parse fail, page not found), ghi log nhưng tiếp tục scrape các phần còn lại (không dừng toàn bộ process).
        - Lý do: Đảm bảo scraper vẫn thu thập được dữ liệu partial, tránh mất toàn bộ data vì một lỗi nhỏ. Log giúp debug sau.
        - Triển khai gợi ý: Sử dụng try-catch trong code: try { ... } catch (e) { console.error('Error on product X:', e); }. Integrate với logging tool như Sentry/CloudWatch (từ 2.6).

    - ***Send alerts if scraper fails***:
        - Ý nghĩa: Nếu toàn bộ scraper fail (e.g., không thu thập được data nào), gửi thông báo cho admin (email/Slack).
        - Lý do: Kết nối với "Scraper Alerts" ở 2.3 và 2.5, giúp admin biết và fix nhanh (e.g., site thay đổi cấu trúc).
        - Triển khai gợi ý: Sau scrape, check nếu data.length === 0 thì gửi alert qua Nodemailer hoặc AWS SNS: if (failed) { sendEmail('Scraper failed for seller X'); }. Hiển thị trên admin dashboard.
    
    
- **BONUS: Bổ sung cho "Scaper Rulers"** : Những bổ sung này làm scraper robust hơn, phù hợp với MVP (database-first, alerts) và dễ scale sang full version.

    Để làm cho phần này hoàn chỉnh hơn, tôi bổ sung các rules mới dựa trên best practices web scraping (từ kinh nghiệm với e-commerce scrapers, tài liệu Scrapy/Puppeteer, và yêu cầu MVP như chạy 6-12 giờ/lần, normalize data). Các bổ sung này tập trung vào an toàn, hiệu suất, và compliance, mà không làm phức tạp MVP. Tôi giữ định dạng bullet points như gốc để dễ tích hợp vào tài liệu.

- Rotate user agents: Thay đổi User-Agent header ngẫu nhiên cho mỗi request (e.g., mimic Chrome/Firefox trên desktop/mobile). Lý do: Tránh detect bot dựa trên header giống hệt. Triển khai: Sử dụng array agents và random pick.
Handle pagination fully: Loop qua tất cả các trang sản phẩm (e.g., page 1 đến last) để collect hết data. Lý do: Đảm bảo không bỏ sót sản phẩm. Triển khai: While loop check "next page" button tồn tại. 
- Respect robots.txt: Kiểm tra file robots.txt của site và tuân thủ (e.g., không scrape nếu disallowed). Lý do: Tuân thủ pháp lý, tránh kiện tụng (dù cannabis seeds legal ở một số nơi). Triển khai: Fetch robots.txt trước và parse.
Use headless browser if needed: Sử dụng browser headless (như Puppeteer) cho sites dynamic (JS-loaded). Lý do: Một số site load data qua JS, Cheerio không đủ. Triển khai: Chuyển sang Puppeteer nếu Cheerio fail.
- Hash data for change detection: Tính hash (e.g., MD5) của data sản phẩm để detect thay đổi, chỉ update DB nếu khác. Lý do: Tối ưu incremental scrape (bổ sung cho full scrape). Triển khai: crypto.createHash('md5').update(JSON.stringify(product)).digest('hex');.
Limit concurrent requests: Giới hạn số request đồng thời (e.g., max 3/seller). Lý do: Tránh overload site và server của bạn. Triển khai: Sử dụng thư viện như p-limit hoặc Promise.all với giới hạn.
- Store scrape metadata: Lưu timestamp last_scraped và status cho mỗi seller trong DB. Lý do: Hỗ trợ dashboard (last run time, success/errors ở 2.5). Triển khai: Prisma upsert cho model Seller.
- Fallback for missing data: Nếu field nào đó missing (e.g., THC %), dùng default (null hoặc 0) và log warning. Lý do: Tránh break normalize/DB insert.
Legal compliance check: Chỉ scrape public data, không login hoặc bypass captcha. Lý do: Tránh vi phạm TOS của sellers. Triển khai: Manual review sites trước.



**Gợi ý triển khai**: Sử dụng library như Cheerio (cho static sites) hoặc Puppeteer (cho dynamic) để parse HTML. Lưu dữ liệu vào DB sau khi normalize. Nếu site có pagination, loop qua các trang để collect hết sản phẩm.

*****

## YÊU CẦU 2: 
*******
Affiliate Links 
-  Add affiliate tags to URLs
*******

## DIỄN GIẢI YÊU CẦU 2
### Tóm Tắt Tổng Thể Phần 2
*******
**Add affiliate tags to URLs**: Thêm tag affiliate vào URL sản phẩm (e.g., original URL + "?aff=goodseed" hoặc theo API affiliate của seller). Lý do: Kiếm commission khi user click và mua hàng.

**Gợi ý triển khai**: Trong scraper hoặc khi query DB, append tag dựa trên seller (lưu affiliate config trong env hoặc DB).
*******
MVP tập trung vào "database-first": Scraper thu thập → normalize → lưu DB → search DB nhanh chóng với filters. Không real-time scrape khi user search để tránh chậm/lỗi. Ưu tiên đơn giản, an toàn (delays, proxies), và alert cho admin. Phần này không bao gồm user features (đó là section 4 sau).

Nếu phần nào vẫn chưa rõ (e.g., cách normalize cụ thể hoặc ví dụ code), hãy cung cấp thêm chi tiết để tôi giải thích sâu hơn!

## YÊU CẦU 3:
*****
Backend Search:
* Search internal database, not sellers.
* Index price per seed, THC/CBD, seed type, cannabis type.
* Scrapers run every 6-12 hours.
* **Scraper Alerts:** Notify admin if scraper fails.
*****
## DIỄN GIẢI YÊU CẦU 3:
*****
### Backend Search
- **Search internal database, not sellers**: Tìm kiếm chỉ trên DB nội bộ (không scrape real-time để tránh chậm và rủi ro ban). User search → query DB → hiển thị results.
- **Index price per seed, THC/CBD, seed type, cannabis type**: Tạo index trong DB cho các field này để query nhanh (e.g., Prisma hoặc SQL indexes).
- **Scrapers run every 6-12 hours**: Chạy scraper định kỳ để update DB (sử dụng cron jobs hoặc AWS Lambda).
- **Scraper Alerts: Notify admin if scraper fails**: Gửi alert (email/Slack) nếu scraper lỗi (e.g., site thay đổi cấu trúc, ban IP).

**Gợi ý triển khai**: Sử dụng Prisma cho query (e.g., `prisma.product.findMany({ where: { pricePerSeed: { gte: min, lte: max } } })`). Integrate logging tool như Sentry để detect fail và alert.
*****

## YÊU CẦU 4:
*****
Frontend & Filters
* Use SSR (Next.js/Nuxt.js preferred).
* Integrate with existing pages and age gate.
* Show Price Per Seed prominently.
* Filters:
  * Price per Seed: slider + Min/Max inputs
  * Seed Type: checkboxes (Regular, Feminized, Autoflower)
  * Cannabis Type: checkboxes (Sativa, Indica, Mix)
  * THC/CBD Range: slider + numeric inputs
*****

## YÊU CẦU 4:
*****
### 2.4 Frontend & Filters
- **Use SSR (Next.js/Nuxt.js preferred)**: Server-Side Rendering để SEO tốt và load nhanh (Next.js khuyến nghị vì project dùng Next.js).
- **Integrate with existing pages and age gate**: Kết nối với các trang hiện có và age verification (kiểm tra tuổi ≥18/21 trước khi vào site, vì cannabis).
- **Show Price Per Seed prominently**: Hiển thị giá mỗi hạt nổi bật (e.g., bold hoặc badge trên product card).
- **Filters** (Bộ lọc cho search):
  - **Price per Seed**: Slider + input min/max (e.g., $1-$10).
  - **Seed Type**: Checkbox (Regular, Feminized, Autoflower).
  - **Cannabis Type**: Checkbox (Sativa, Indica, Mix).
  - **THC/CBD Range**: Slider + input số (dùng min/max từ normalized data).

**Gợi ý triển khai**: Sử dụng React components trong Next.js (e.g., Slider từ shadcn/ui hoặc Ant Design). Fetch data từ API route (/api/search) để apply filters server-side.
*****
## YÊU CẦU 5:
*****
* Kill Switch to hide a seller.
* Buttons to run or pause scrapers.
* Dashboard for last run time, success, errors.
* Scraper failure alerts to admin.
*****
## DIỄN GIẢI YÊU CẦU 5:
*****
- **Kill Switch to hide a seller**: Nút để ẩn seller (e.g., nếu seller có vấn đề, không hiển thị products của họ).
- **Buttons to run or pause scrapers**: Nút chạy manual hoặc pause scraper.
- **Dashboard for last run time, success, errors**: Bảng hiển thị thời gian chạy lần cuối, thành công/thất bại, lỗi.
- **Scraper failure alerts to admin**: Alert khi scraper fail (tích hợp với 2.3).

**Gợi ý triển khai**: Pages riêng dưới /admin (protected by auth đơn giản như basic auth hoặc session). Sử dụng components như Table từ UI library để dashboard.
*****

## YÊU CẦU 6:
*****
* Database: SQL (Postgres/MySQL/MariaDB)
* Hosting: AWS
* Caching: Cloudflare
* Logging: Sentry or CloudWatch
*****

## DIỄN GIẢI YÊU CẦU 6:
*****
### Infrastructure
- **Database: SQL (Postgres/MySQL/MariaDB)**: Chọn một (Postgres khuyến nghị cho AWS RDS).
- **Hosting: AWS**: Deploy trên AWS (e.g., EC2/ECS cho app, Lambda cho scrapers).
- **Caching: Cloudflare**: Cache static assets và API responses để nhanh hơn.
- **Logging: Sentry or CloudWatch**: Theo dõi errors và performance.

**Gợi ý triển khai**: Sử dụng AWS CDK hoặc Terraform để setup. Integrate Prisma với DB URL trong .env.
*****



