/**
 * Seed Supreme Category Scraper (Crawlee Version)
 * 
 * Scrapes product listings from category pages using Crawlee
 * Features:
 * - Automatic request queue management
 * - Built-in retries & error handling
 * - Rate limiting & concurrency control
 * - Dataset storage
 * - CheerioCrawler for fast HTTP-based scraping with built-in Cheerio
 */

import { CheerioCrawler, Dataset, type CheerioAPI } from 'crawlee';
import { BASE_URL, CATEGORY_SELECTORS, getCategoryUrl } from './selectors';
import { CategoryScrapeResult, ProductCardData } from './types';

export class SeedSupremeCategoryScraper {
    private baseUrl: string;

    constructor(baseUrl: string = BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Scrape a category with pagination support using Crawlee
     */
    async scrapeCategory(categorySlug: string, maxPages: number = 5): Promise<CategoryScrapeResult> {
        const startTime = Date.now();
        let totalPages = 0;

        // Create new dataset for this scrape
        const datasetName = `category-${categorySlug}-${Date.now()}`;
        const dataset = await Dataset.open(datasetName);

        const crawler = new CheerioCrawler({
            // Request handler for each page - $ (cheerio) is provided automatically
            async requestHandler({ request, $, log }) {
                const pageNum = (request.userData.pageNum as number) || 1;
                log.info(`[Category] Scraping page ${pageNum}: ${request.url}`);

                // Wait 2-5 seconds to mimic human behavior and avoid rate limiting
                const delay = Math.random() * 3000 + 2000; // 2000ms + random(0-3000ms) = 2-5 seconds
                log.info(`[Category] Waiting ${(delay / 1000).toFixed(2)}s before processing...`);
                await new Promise(resolve => setTimeout(resolve, delay));

                // Extract products using Cheerio ($ is provided by CheerioCrawler)
                const products = extractProductsWithCheerio($);

                log.info(`[Category] Found ${products.length} products on page ${pageNum}`);

                // Save products to dataset
                if (products.length > 0) {
                    await dataset.pushData({ products, pageNum });
                }

                totalPages = pageNum;

                // Check for next page if not reached maxPages
                if (pageNum < maxPages) {
                    const nextPageUrl = getCategoryUrl(BASE_URL, categorySlug, pageNum + 1);

                    // Check if next page link exists
                    const hasNextPage = $(CATEGORY_SELECTORS.nextPage).length > 0;

                    if (hasNextPage) {
                        // Add next page to queue
                        await crawler.addRequests([{
                            url: nextPageUrl,
                            userData: { pageNum: pageNum + 1 },
                        }]);
                    }
                }
            },

            // Rate limiting
            maxRequestsPerMinute: 30,
            maxConcurrency: 1, // Process pages sequentially for category scraping

            // Retries
            maxRequestRetries: 3,
        });

        // Add first page to queue
        const startUrl = getCategoryUrl(this.baseUrl, categorySlug, 1);
        await crawler.addRequests([{
            url: startUrl,
            userData: { pageNum: 1 },
        }]);

        // Run the crawler
        await crawler.run();

        // Collect all products from dataset
        const { items } = await dataset.getData();
        const allProducts: ProductCardData[] = [];
        const seenUrls = new Set<string>();

        // Flatten products and remove duplicates
        items.forEach((item: { products?: ProductCardData[]; pageNum?: number }) => {
            if (item.products) {
                item.products.forEach((product: ProductCardData) => {
                    if (!seenUrls.has(product.url)) {
                        seenUrls.add(product.url);
                        allProducts.push(product);
                    }
                });
            }
        });

        const duration = Date.now() - startTime;

        return {
            category: categorySlug,
            totalProducts: allProducts.length,
            totalPages,
            products: allProducts,
            timestamp: new Date(),
            duration,
        };
    }
}

/**
 * Extract products using Cheerio (provided by CheerioCrawler)
 */
function extractProductsWithCheerio($: CheerioAPI): ProductCardData[] {
    const products: ProductCardData[] = [];
    const seenUrls = new Set<string>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $(CATEGORY_SELECTORS.productCard).each((_: number, element: any) => {
        try {
            const $card = $(element);

            // Extract product link
            const $link = $card.find(CATEGORY_SELECTORS.productLink);
            const url = $link.attr('href');
            if (!url || seenUrls.has(url)) return;
            seenUrls.add(url);

            // Extract product name
            const name =
                $link.text().trim() ||
                $card.find(CATEGORY_SELECTORS.productName).text().trim();

            // Extract image
            const imageUrl = $card.find(CATEGORY_SELECTORS.productImage).attr('src');

            // Extract price
            const priceText = $card.find(CATEGORY_SELECTORS.price).first().text().trim();
            const priceMatch = priceText.match(/\$(\d+(?:\.\d{2})?)/);;
            const basePrice = priceMatch ? priceMatch[0] : undefined;
            const basePriceNum = priceMatch ? parseFloat(priceMatch[1]) : undefined;

            // Calculate price per seed (default pack size: 4 seeds)
            const packSize = 4; // Default assumption from Seed Supreme category pages
            const pricePerSeed = basePriceNum ? basePriceNum / packSize : undefined;

            // Extract variety and THC from text content
            const cardText = $card.text().replace(/\s+/g, ' ');
            let variety: string | undefined;
            let thcLevel: string | undefined;
            let stockStatus: string | undefined;

            // Extract stock status
            const stockText = $card.find(CATEGORY_SELECTORS.stockStatus).first().text().trim();
            if (stockText && stockText.toLowerCase().includes('stock')) {
                // Clean up duplicate text (e.g., "In stockIn stock" → "In Stock")
                stockStatus = stockText.match(/in stock/i) ? 'In Stock' :
                    stockText.match(/out of stock/i) ? 'Out of Stock' :
                        stockText;
            } else if (cardText.match(/in stock/i)) {
                stockStatus = 'In Stock';
            } else if (cardText.match(/out of stock/i)) {
                stockStatus = 'Out of Stock';
            }

            // Try combined pattern first
            const match = cardText.match(/Variety:\s*(.+?)\s+THC Content:\s*(.+?)(?=\s+In stock|$)/i);
            if (match) {
                variety = match[1].trim();
                thcLevel = match[2].trim();
            } else {
                // Fallback: extract separately
                const varietyMatch = cardText.match(/Variety:\s*([^\n]+?)(?=\s+(?:THC Content|In stock|$))/i);
                const thcMatch = cardText.match(/THC Content:\s*([^\n]+?)(?=\s+(?:In stock|$))/i);

                if (varietyMatch) variety = varietyMatch[1].trim();
                if (thcMatch) thcLevel = thcMatch[1].trim();
            }

            // Extract badges
            const badges: string[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            $card.find(CATEGORY_SELECTORS.badges).each((_: number, badge: any) => {
                const badgeText = $(badge).text().trim();
                if (badgeText) badges.push(badgeText);
            });

            // Create slug from URL
            const slug = url.split('/').pop()?.replace('.html', '') || '';

            // Resolve full URL
            const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
            const fullImageUrl = imageUrl && !imageUrl.startsWith('http')
                ? `${BASE_URL}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`
                : imageUrl;

            products.push({
                name,
                url: fullUrl,
                slug,
                imageUrl: fullImageUrl || undefined,
                basePrice,
                basePriceNum,
                packSize,
                pricePerSeed,
                stockStatus,
                variety,
                thcLevel,
                badges: badges.length > 0 ? badges : undefined,
            });
        } catch (error) {
            console.error('[Category] Error parsing product card:', error);
        }
    });

    return products;
}
