# GoodSeed Development Document (Simple Version for Dev)

---

## 1. Overview

GoodSeed is a website to search for cannabis seeds (e-commerce aggregator for afficiate marketing site). It collects data from other sellers, fixes prices and details, and shows them in one place. Users click to go to seller websites.

**How it works:** Scrapers collect data and store it in a database. The website searches this database, not the sellers directly.

---

## 2. MVP Requirements

### 2.1 Scrapers & Data

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
* Bonus (additional rules for robustness):
  * Rotate user agents.  # Bổ sung: Thay đổi header để mimic user thật.
  * Handle pagination fully.  # Bổ sung: Loop qua tất cả trang sản phẩm.
  * Respect robots.txt.  # Bổ sung: Tuân thủ quy định site.
  * Use headless browser if needed.  # Bổ sung: Cho sites dynamic.
  * Hash data for change detection.  # Bổ sung: Để tối ưu update DB.
  * Limit concurrent requests.  # Bổ sung: Giới hạn request đồng thời.
  * Store scrape metadata.  # Bổ sung: Lưu timestamp và status.
  * Fallback for missing data.  # Bổ sung: Xử lý data thiếu.
  * Legal compliance check.  # Bổ sung: Đảm bảo hợp pháp.

### 2.2 Affiliate Links

* Add affiliate tags to URLs.

### 2.3 Backend Search

* Search internal database, not sellers.
* Index price per seed, THC/CBD, seed type, cannabis type.
* Scrapers run every 6-12 hours.
* **Scraper Alerts:** Notify admin if scraper fails.

### 2.4 Frontend & Filters

* Use SSR (Next.js/Nuxt.js preferred).
* Integrate with existing pages and age gate.
* Show Price Per Seed prominently.
* Filters:
  * Price per Seed: slider + Min/Max inputs
  * Seed Type: checkboxes (Regular, Feminized, Autoflower)
  * Cannabis Type: checkboxes (Sativa, Indica, Mix)
  * THC/CBD Range: slider + numeric inputs

### 2.5 Admin Panel

* Kill Switch to hide a seller.
* Buttons to run or pause scrapers.
* Dashboard for last run time, success, errors.
* Scraper failure alerts to admin.

### 2.6 Infrastructure

* Database: SQL (Postgres/MySQL/MariaDB)
* Hosting: AWS
* Caching: Cloudflare
* Logging: Sentry or CloudWatch

---

## 3. Scraper Rules

* One file per site.
* Wait 2-5 seconds between requests.
* Take lowest price if a range is shown.
* Capture pack size.
* Log errors but do not break search.
* Support proxies.
* Send alerts if scraper fails.

---

## 4. Full Version (Later)

### 4.1 Accounts

* Login: Google, Facebook, Email.
* Email verification and reset.
* Store preferences: marketing emails and price alerts.

### 4.2 Favorites & Lists

* Heart button to save.
* Custom lists per user.
* Sync across devices.

### 4.3 Notifications

* Price drop or back in stock emails.

### 4.4 Admin

* Manage users (view, ban, delete).
* Export user emails with filters.
* Edit homepage/FAQ text.

---

## 5. Summary

**MVP:**

* Database-first, background scrapers, fast search
* SSR frontend, Age Gate integration
* Price per seed, affiliate links, filters
* Admin: kill switch, scraper health + alerts
* AWS backend, Cloudflare caching

**Full Version:**

* User accounts, favorites, lists
* Email notifications for price changes
* Admin: segmented export for marketing