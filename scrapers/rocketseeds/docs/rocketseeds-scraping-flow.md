 Scraping Source: https://rocketseeds.com/product-brand/rocketseeds/
- step 1: crawling link https://rocketseeds.com/product-brand/rocketseeds/ => để lấy productUrls
- step 2: loop qua từng productUrl để exactHTML trang detail product page => lấy productData (name, image, pricing...)
- step 3: save dataset 
- step 4 collect array productdata => push và return ở file scraper
- xử lý tiếp => save db =>...