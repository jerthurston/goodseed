### Luồng Đi Của Khách Hàng (User) Trên Website GoodSeed (MVP)

Dựa trên tài liệu "GoodSeed Development Document", MVP tập trung vào tìm kiếm đơn giản, không có accounts/login (đó là full version). Luồng user là "database-first": Tìm kiếm trên DB nội bộ, không scrape real-time. Dưới đây là luồng trọng tâm, mô tả theo bước (steps) và sơ đồ Mermaid đơn giản để dễ hình dung.

#### Các Bước Chính (User Flow)
1. **Truy Cập Website**: User mở browser, truy cập homepage (SSR với Next.js/Nuxt.js).
2. **Age Gate Verification**: Kiểm tra tuổi (integrate with existing pages). Nếu không đủ tuổi (e.g., <18/21), block; nếu pass, vào site.
3. **Vào Trang Tìm Kiếm (Search Page)**: Hiển thị giao diện search với filters mặc định (price per seed, types, THC/CBD). Show price per seed prominently trên results.
4. **Áp Dụng Filters/Tìm Kiếm**: 
   - Price per Seed: Slider + inputs min/max.
   - Seed Type: Checkboxes (Regular, Feminized, Autoflower).
   - Cannabis Type: Checkboxes (Sativa, Indica, Mix).
   - THC/CBD Range: Slider + inputs numeric.
   - Submit để query backend (/api/search, search DB không phải search trang của đối tác afficiate).
5. **Xem Kết Quả**: Hiển thị list seed (name, image, price per seed, stock, types, THC/CBD %). Dữ liệu từ DB (normalized: price per seed = total/pack, ranges thành min/max).
6. **Click Chuyển Hướng**: User click seedcard → redirect đến seller URL với affiliate tags (kiếm commission). Chằng hạn như: https://seedsupreme.com/feminized-seeds.html?aff=goodseed
7. **End**: Không có favorites/notifications ở MVP; user có thể refresh filters để search lại.

Lưu ý: Scraper chạy background (6-12 giờ/lần) để update DB, không ảnh hưởng user flow. Nếu scraper fail, chỉ admin nhận alert.

#### Sơ Đồ Mermaid (User Flow)
```mermaid
graph TD
    A[User Truy Cập Website] --> B{Age Gate Verification}
    B -->|Fail| C[Block Access]
    B -->|Pass| D[Trang Tìm Kiếm<br>SSR với Filters]
    D --> E[Áp Dụng Filters<br>Price, Types, THC/CBD]
    E --> F[Backend Query DB<br>Search Internal, Not Sellers]
    F --> G[Hiển Thị Results<br>Price Per Seed Prominent]
    G --> H[Click Product<br>Affiliate URL to Seller]
    H --> I[End: Chuyển Đến Seller Site]
```
