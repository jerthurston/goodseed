/**
 * Royal Queen Seeds Category Scraper
 * 
 * Scrapes product cards from category listing pages using Crawlee
 */

import { CheerioCrawler, Dataset, type CheerioAPI } from 'crawlee';
import { BASE_URL, CATEGORY_SELECTORS, getCategoryUrl } from './selectors';
import { CategoryScrapeResult, ProductCardData } from './types';

export class RoyalQueenSeedsCategoryScraper {
    private baseUrl: string;

    constructor(baseUrl: string = BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Scrape a category with pagination support
     */
    async scrapeCategory(categoryUrl: string, maxPages: number = 5): Promise<CategoryScrapeResult> {
        const startTime = Date.now();
        let totalPages = 0;

        const datasetName = `rqs-${Date.now()}`;
        const dataset = await Dataset.open(datasetName);

        const crawler = new CheerioCrawler({
            async requestHandler({ request, $, log }) {
                const pageNum = (request.userData.pageNum as number) || 1;
                log.info(`[Category] Scraping page ${pageNum}: ${request.url}`);

                // Rate limiting: wait 2-5 seconds
                const delay = Math.random() * 3000 + 2000;
                log.info(`[Category] Waiting ${(delay / 1000).toFixed(2)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));

                // Extract products
                const products = extractProducts($);
                log.info(`[Category] Found ${products.length} products on page ${pageNum}`);

                if (products.length > 0) {
                    await dataset.pushData({ products, pageNum });
                }

                totalPages = pageNum;

                // Check for next page
                if (pageNum < maxPages) {
                    const hasNextPage = $(CATEGORY_SELECTORS.nextPage).length > 0;

                    if (hasNextPage) {
                        const nextPageUrl = getCategoryUrl(categoryUrl, pageNum + 1);
                        await crawler.addRequests([{
                            url: nextPageUrl,
                            userData: { pageNum: pageNum + 1 },
                        }]);
                    }
                }
            },

            maxRequestsPerMinute: 20,
            maxConcurrency: 1,
            maxRequestRetries: 3,
        });

        // Start crawling
        await crawler.run([{ url: categoryUrl, userData: { pageNum: 1 } }]);

        // Collect results from dataset
        const results = await dataset.getData();
        const allProducts: ProductCardData[] = [];

        results.items.forEach((item) => {
            allProducts.push(...(item as { products: ProductCardData[] }).products);
        });

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
 * Extract products from HTML using Cheerio
 */
function extractProducts($: CheerioAPI): ProductCardData[] {
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
