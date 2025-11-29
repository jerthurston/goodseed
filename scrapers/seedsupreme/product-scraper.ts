/**
 * Seed Supreme Product Scraper (Crawlee Version)
 * 
 * Scrapes detailed product information from individual product pages using Crawlee
 * Features:
 * - Automatic request queue management
 * - Built-in retries & error handling
 * - Rate limiting & concurrency control
 * - Dataset storage
 * - CheerioCrawler for fast HTTP-based scraping
 */

import { CheerioCrawler, Dataset, type CheerioAPI } from 'crawlee';
import { PackOption, ProductDetailData, ProductSpecs } from './types';

export class SeedSupremeProductScraper {
    /**
     * Scrape multiple product URLs using Crawlee
     */
    async scrapeProducts(productUrls: string[]): Promise<ProductDetailData[]> {
        const startTime = Date.now();
        const results: ProductDetailData[] = [];

        // Create new dataset for this scrape
        const datasetName = `products-${Date.now()}`;
        const dataset = await Dataset.open(datasetName);

        const crawler = new CheerioCrawler({
            // Request handler for each product page
            async requestHandler({ request, $, log }) {
                log.info(`[Product] Scraping: ${request.url}`);

                try {
                    // Extract product data using Cheerio
                    const productData = extractProductData($, request.url);

                    // Save to dataset
                    await dataset.pushData(productData);

                    log.info(`[Product] ✓ Scraped: ${productData.name}`);
                } catch (error) {
                    log.error(`[Product] Error scraping ${request.url}:`, { error });
                    throw error;
                }
            },

            // Rate limiting
            maxRequestsPerMinute: 30,
            maxConcurrency: 2, // Scrape 2 products in parallel

            // Retries
            maxRequestRetries: 3,

            // Error handling
            failedRequestHandler({ request, log }, error) {
                log.error(`[Product] Request failed after retries: ${request.url}`, error);
            },
        });

        // Add product URLs to queue
        await crawler.addRequests(productUrls.map(url => ({ url })));

        // Run the crawler
        await crawler.run();

        // Collect results from dataset
        const { items } = await dataset.getData();
        results.push(...(items as ProductDetailData[]));

        const duration = Date.now() - startTime;
        console.log(`\n[Product] Scraping complete: ${results.length} products in ${(duration / 1000).toFixed(2)}s`);

        return results;
    }
}

/**
 * Extract product data from HTML using Cheerio
 */
function extractProductData($: CheerioAPI, url: string): ProductDetailData {
    // Extract basic info
    const name = $('h1.page-title, h1').first().text().trim();
    const slug = url.split('/').pop()?.replace('.html', '') || '';

    // Extract images
    const imageUrl = $('.product-image-photo').first().attr('src') ||
        $('.fotorama__img').first().attr('src');

    // Extract description
    const description = $('.product-description, .product.attribute.overview').first().text().trim();

    // Extract pack options
    const packOptions = extractPackOptions($);

    // Extract specifications
    const specs = extractSpecifications($);

    // Extract price (base price from first pack or main price)
    let basePrice: string | undefined;
    let basePriceNum: number | undefined;

    if (packOptions.length > 0) {
        basePriceNum = packOptions[0].totalPrice;
        basePrice = `$${basePriceNum.toFixed(2)}`;
    } else {
        const priceText = $('.price').first().text().trim();
        const priceMatch = priceText.match(/\$(\d+(?:\.\d{2})?)/);
        if (priceMatch) {
            basePrice = priceMatch[0];
            basePriceNum = parseFloat(priceMatch[1]);
        }
    }

    return {
        name,
        url,
        slug,
        imageUrl,
        description: description || undefined,
        basePrice,
        basePriceNum,
        packOptions,
        specs: {
            variety: specs.variety,
            thcContent: specs.thcContent,
            geneticProfile: specs.geneticProfile,
            floweringPeriod: specs.floweringPeriod,
            floweringType: specs.floweringType,
            cbdContent: specs.cbdContent,
            yieldIndoor: specs.yieldIndoor,
            yieldOutdoor: specs.yieldOutdoor,
        },
        variety: specs.variety,
        thcLevel: specs.thcContent,
        scrapedAt: new Date(),
    };
}

/**
 * Extract pack options from product page
 * Pack options are displayed in a table with format: "6x", "12x", etc.
 */
function extractPackOptions($: CheerioAPI): PackOption[] {
    const packOptions: PackOption[] = [];

    // Method 1: Find table rows containing pack size pattern (e.g., "6x", "12x")
    $('table tr').each((_, row) => {
        const $row = $(row);
        const rowText = $row.text();

        // Match pack size pattern: number followed by 'x' (e.g., "6x", "12x")
        const packMatch = rowText.match(/(\d+)\s*x/i);
        if (!packMatch) return;

        const packSize = parseInt(packMatch[1]);

        // Extract prices from the row
        const cells = $row.find('td');
        let totalPrice = 0;
        let originalPrice: number | undefined;

        cells.each((_, cell) => {
            const cellText = $(cell).text().trim();

            // Look for price patterns
            const priceMatches = cellText.match(/\$(\d+(?:\.\d{2})?)/g);
            if (priceMatches && priceMatches.length > 0) {
                // First price is usually the sale price
                const firstPrice = parseFloat(priceMatches[0].replace('$', ''));
                if (firstPrice > 0) {
                    totalPrice = firstPrice;
                }

                // Second price (if exists) is the original price
                if (priceMatches.length > 1) {
                    originalPrice = parseFloat(priceMatches[1].replace('$', ''));
                }
            }
        });

        // Only add if we found a valid price
        if (totalPrice > 0) {
            const pricePerSeed = totalPrice / packSize;
            const discount = originalPrice ? Math.round(((originalPrice - totalPrice) / originalPrice) * 100) : undefined;

            packOptions.push({
                packSize,
                totalPrice,
                originalPrice,
                pricePerSeed,
                discount,
            });
        }
    });

    // If no packs found, try alternative selector for select/option elements
    if (packOptions.length === 0) {
        $('select[name="options"] option, select option').each((_, option) => {
            const $option = $(option);
            const text = $option.text();

            // Match patterns like: "6 seeds - $52.00" or "12x - $87.20"
            const match = text.match(/(\d+)\s*(?:seeds|x)?\s*-?\s*\$(\d+(?:\.\d{2})?)/i);
            if (match) {
                const packSize = parseInt(match[1]);
                const totalPrice = parseFloat(match[2]);

                packOptions.push({
                    packSize,
                    totalPrice,
                    pricePerSeed: totalPrice / packSize,
                });
            }
        });
    }

    return packOptions;
}

/**
 * Extract product specifications from detail page
 * Uses sibling selector to get values: td:contains("Label") + td
 */
function extractSpecifications($: CheerioAPI): ProductSpecs {
    const specs: ProductSpecs = {};

    // Helper function to extract spec value using label
    const getSpec = (label: string): string | undefined => {
        // Try multiple patterns for the label
        const patterns = [
            `td:contains("${label}")`,
            `th:contains("${label}")`,
            `.spec-label:contains("${label}")`,
        ];

        for (const pattern of patterns) {
            const $label = $(pattern).first();
            if ($label.length > 0) {
                // Try sibling selector first
                let value = $label.next('td, .spec-value').text().trim();

                // If not found, try finding in same row
                if (!value) {
                    const $row = $label.closest('tr');
                    value = $row.find('td').last().text().trim();
                }

                if (value && value !== label) {
                    return value;
                }
            }
        }

        return undefined;
    };

    // Extract each specification
    specs.variety = getSpec('Variety');
    specs.thcContent = getSpec('THC') || getSpec('THC Content');
    specs.cbdContent = getSpec('CBD') || getSpec('CBD Content');
    specs.floweringType = getSpec('Flowering') || getSpec('Flowering Type');
    specs.floweringPeriod = getSpec('Flowering Time') || getSpec('Flowering Period');
    specs.geneticProfile = getSpec('Genetic') || getSpec('Genetics') || getSpec('Lineage');
    specs.yieldIndoor = getSpec('Yield Indoor') || getSpec('Indoor Yield');
    specs.yieldOutdoor = getSpec('Yield Outdoor') || getSpec('Outdoor Yield');

    return specs;
}
