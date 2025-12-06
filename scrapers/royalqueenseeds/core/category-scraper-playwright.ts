/**
 * Royal Queen Seeds Category Scraper (Playwright - Infinite Scroll)
 * 
 * Uses browser automation to handle infinite scroll pagination
 */

import { Dataset, PlaywrightCrawler } from 'crawlee';
import { BASE_URL, CATEGORY_SELECTORS } from './selectors';
import { CategoryScrapeResult, ProductCardData } from './types';

export class RoyalQueenSeedsCategoryScraper {
    private baseUrl: string;

    constructor(baseUrl: string = BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Scrape a category with infinite scroll support
     */
    async scrapeCategory(categoryUrl: string, maxPages: number = 5): Promise<CategoryScrapeResult> {
        const startTime = Date.now();

        const datasetName = `rqs-${Date.now()}`;
        const dataset = await Dataset.open(datasetName);

        const crawler = new PlaywrightCrawler({
            async requestHandler({ page, request, log }) {
                log.info(`[Category] Scraping: ${request.url}`);

                // Wait for page to load
                await page.waitForLoadState('networkidle');
                await page.waitForSelector(CATEGORY_SELECTORS.productCard, { timeout: 10000 });

                log.info('[Category] Page loaded, starting infinite scroll...');

                // Scroll and load products
                let previousCount = 0;
                let stableCount = 0;
                let totalScrolls = 0;
                const maxScrolls = maxPages * 5; // Approximate scrolls needed

                while (totalScrolls < maxScrolls) {
                    // Count current products
                    const currentCount = await page.locator(CATEGORY_SELECTORS.productCard).count();

                    log.info(`[Category] Products visible: ${currentCount} (scroll ${totalScrolls + 1}/${maxScrolls})`);

                    // Check if we've loaded enough products (24 per page)
                    const estimatedPages = Math.ceil(currentCount / 24);
                    if (estimatedPages >= maxPages && currentCount >= maxPages * 24) {
                        log.info(`[Category] Reached target: ${estimatedPages} pages worth of products`);
                        break;
                    }

                    // Scroll to bottom
                    await page.evaluate(() => {
                        window.scrollTo(0, document.body.scrollHeight);
                    });

                    // Wait for new products to load
                    await page.waitForTimeout(2000);

                    const newCount = await page.locator(CATEGORY_SELECTORS.productCard).count();

                    // Check if products stopped loading
                    if (newCount === previousCount) {
                        stableCount++;
                        if (stableCount >= 3) {
                            log.info('[Category] No more products loading, stopping scroll');
                            break;
                        }
                    } else {
                        stableCount = 0;
                    }

                    previousCount = newCount;
                    totalScrolls++;
                }

                // Get HTML content and use Cheerio for faster extraction
                log.info('[Category] Extracting products using Cheerio...');
                const html = await page.content();

                // Import cheerio dynamically
                const { load } = await import('cheerio');
                const $ = load(html);

                const products = extractProductsFromHTML($);
                log.info(`[Category] Extracted ${products.length} products`);

                await dataset.pushData({ products });
            },

            headless: true,
            maxRequestsPerMinute: 10,
            maxConcurrency: 1,
            maxRequestRetries: 2,
            requestHandlerTimeoutSecs: 120, // Increase timeout to 2 minutes
        });

        // Start crawling
        await crawler.run([categoryUrl]);

        // Collect results from dataset
        const results = await dataset.getData();
        const allProducts: ProductCardData[] = [];

        results.items.forEach((item) => {
            allProducts.push(...(item as { products: ProductCardData[] }).products);
        });

        // Calculate pages based on 24 products per page
        const totalPages = Math.ceil(allProducts.length / 24);

        return {
            category: categoryUrl,
            totalProducts: allProducts.length,
            totalPages,
            products: allProducts,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        };
    }
}

/**
 * Extract products from HTML using Cheerio (faster than Playwright locators)
 */
function extractProductsFromHTML($: ReturnType<typeof import('cheerio').load>): ProductCardData[] {
    const products: ProductCardData[] = [];
    const seenUrls = new Set<string>();

    $(CATEGORY_SELECTORS.productCard).each((_, element) => {
        try {
            const $card = $(element);

            // Extract product link and URL
            const $link = $card.find(CATEGORY_SELECTORS.productLink).first();
            let url = $link.attr('href');
            if (!url) return;

            // Resolve relative URL
            if (!url.startsWith('http')) {
                url = url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`;
            }

            // Skip duplicates
            if (seenUrls.has(url)) return;
            seenUrls.add(url);

            // Extract basic info
            const name = $card.find(CATEGORY_SELECTORS.productName).text().trim();
            if (!name) return;

            // Extract image
            const imageUrl = $card.find(CATEGORY_SELECTORS.productImage).attr('src');

            // Extract pricing
            const priceText = $card.find(CATEGORY_SELECTORS.price).first().text().trim();
            const oldPriceText = $card.find(CATEGORY_SELECTORS.oldPrice).first().text().trim();

            // Extract rating
            const reviewCountText = $card.find(CATEGORY_SELECTORS.reviewCount).text().trim();
            const reviewCount = reviewCountText.match(/\d+/) ? parseInt(reviewCountText.match(/\d+/)![0]) : undefined;

            // Count rating stars
            const ratingStars = $card.find('.star-rating-on').length;
            const ratingHalf = $card.find('.star-rating-half').length;
            const rating = ratingStars + (ratingHalf * 0.5);

            // Extract THC level from feature props
            let thcLevel: string | undefined;
            let effects: string | undefined;
            let flavorText: string | undefined;

            $card.find('.atd-filter-feature-prop').each((_, prop) => {
                const $prop = $(prop);
                const label = $prop.find('.atd-filter-feature-prop-label').text().trim().toLowerCase();
                const value = $prop.find('.atd-filter-feature-prop-val').text().trim();

                if (label.includes('thc') && value) {
                    thcLevel = value;
                } else if (label.includes('effect') && value) {
                    effects = value;
                } else if (label.includes('flavor') && value) {
                    flavorText = value;
                }
            });

            // Combine effects and flavor
            const effectsArray: string[] = [];
            if (effects) effectsArray.push(effects);
            if (flavorText) effectsArray.push(`Flavor: ${flavorText}`);
            const effectsString = effectsArray.length > 0 ? effectsArray.join('; ') : undefined;

            // Extract pack size (default selected)
            const packSizeText = $card.find(CATEGORY_SELECTORS.packSizeDefault).text().trim();
            const packSizeMatch = packSizeText.match(/\d+/);
            const packSize = packSizeMatch ? parseInt(packSizeMatch[0]) : 3; // Default to 3 seeds

            // Generate slug
            const slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            // Parse price (handle US format: $11.80)
            const priceMatch = priceText.match(/[\d.]+/);
            let basePriceNum: number | undefined;
            if (priceMatch) {
                basePriceNum = parseFloat(priceMatch[0]);
            }

            // Calculate price per seed
            const pricePerSeed = basePriceNum ? basePriceNum / packSize : undefined;

            products.push({
                name,
                url,
                slug,
                imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`) : undefined,
                basePrice: priceText || undefined,
                basePriceNum,
                packSize,
                pricePerSeed,
                originalPrice: oldPriceText || undefined,
                thcLevel: thcLevel || undefined,
                effects: effectsString || undefined,
                rating: rating > 0 ? rating : undefined,
                reviewCount,
            });

        } catch (error) {
            console.error('[Category] Error parsing product card:', error);
        }
    });

    return products;
}
