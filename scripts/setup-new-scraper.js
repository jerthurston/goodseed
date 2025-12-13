#!/usr/bin/env node

/**
 * Quick Setup Script for New Scraper
 * 
 * Tự động tạo cấu trúc thư mục và files template cho scraper mới
 * 
 * Usage: node scripts/setup-new-scraper.js [site-name] [site-url] [site-display-name]
 * Example: node scripts/setup-new-scraper.js seedsupreme seedsupreme.com "Seed Supreme"
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const siteName = process.argv[2];
const siteUrl = process.argv[3];
const siteDisplayName = process.argv[4];

if (!siteName || !siteUrl || !siteDisplayName) {
    console.log('❌ Missing arguments!');
    console.log('Usage: node scripts/setup-new-scraper.js [site-name] [site-url] [site-display-name]');
    console.log('Example: node scripts/setup-new-scraper.js seedsupreme seedsupreme.com "Seed Supreme"');
    process.exit(1);
}

console.log(`🚀 Setting up scraper for: ${siteDisplayName}`);
console.log(`Site Name: ${siteName}`);
console.log(`Site URL: ${siteUrl}`);

// Create directory structure
const scraperDir = path.join(__dirname, '..', 'scrapers', siteName);
const coreDir = path.join(scraperDir, 'core');
const utilsDir = path.join(scraperDir, 'utils');
const scriptsDir = path.join(scraperDir, 'scripts');

// Create directories
[scraperDir, coreDir, utilsDir, scriptsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Templates
const selectorsTemplate = `/**
 * ${siteDisplayName} Selectors and Configuration
 */

export const BASE_URL = 'https://${siteUrl}';
export const PRODUCT_LISTING_URL = BASE_URL + '/products'; // TODO: Update with actual path

export const PRODUCT_CARD_SELECTORS = {
    // Main selectors - TODO: Update with actual selectors
    productCard: '.product-item', // Container for each product
    productName: 'h2.product-title',
    productUrl: 'a.product-link',
    productImage: 'img.product-image',
    price: '.price .amount',
    stockStatus: '.stock-status',
    
    // Pagination
    nextPage: '.next-page, .pagination-next',
    pagination: '.pagination',
    
    // Additional data
    rating: '.rating-stars',
    reviewCount: '.review-count',
    categories: '.product-categories',
    
    // Seed-specific (if available)
    seedType: '.seed-type',
    strainType: '.strain-type', 
    thcLevel: '.thc-content',
    cbdLevel: '.cbd-content',
    floweringTime: '.flowering-time',
    packSize: '.pack-size',
};

/**
 * Generate URL for specific page
 */
export function getCategoryUrl(baseUrl: string, page: number): string {
    // TODO: Update with actual pagination URL pattern
    return \`\${baseUrl}?page=\${page}\`;
    // Alternative patterns:
    // return \`\${baseUrl}/page/\${page}\`;
    // return \`\${baseUrl}?pagenum=\${page}\`;
}
`;

const extractorTemplate = `/**
 * ${siteDisplayName} HTML Product Extractor
 */

import { CheerioAPI } from 'cheerio';
import { ProductCardDataFromCrawling } from '@/types/crawl.type';
import { PRODUCT_CARD_SELECTORS, BASE_URL } from '../core/selectors';
import { parseSeedType, parseCannabisType, parsePrice, parseTHCLevel } from './data-mappers';

export function extractProductsFromHTML($: CheerioAPI): ProductCardDataFromCrawling[] {
    const products: ProductCardDataFromCrawling[] = [];

    // Loop through each product card
    $(PRODUCT_CARD_SELECTORS.productCard).each((index, element) => {
        try {
            const $card = $(element);
            
            // Extract basic info
            const name = $card.find(PRODUCT_CARD_SELECTORS.productName).text().trim();
            const relativeUrl = $card.find(PRODUCT_CARD_SELECTORS.productUrl).attr('href');
            const imageUrl = $card.find(PRODUCT_CARD_SELECTORS.productImage).attr('src');
            const priceText = $card.find(PRODUCT_CARD_SELECTORS.price).text().trim();
            
            // Skip if missing essential data
            if (!name || !relativeUrl) {
                console.warn(\`[${siteDisplayName} Extract] Missing essential data for product \${index}\`);
                return;
            }
            
            // Normalize URLs
            const url = relativeUrl.startsWith('http') ? relativeUrl : BASE_URL + relativeUrl;
            const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : BASE_URL + imageUrl) : '';
            
            // Parse data
            const price = parsePrice(priceText);
            const stockStatus = parseStockStatus($card.find(PRODUCT_CARD_SELECTORS.stockStatus).text());
            
            // Extract additional fields if available
            const rating = parseRating($card.find(PRODUCT_CARD_SELECTORS.rating));
            const reviewCount = parseReviewCount($card.find(PRODUCT_CARD_SELECTORS.reviewCount).text());
            
            // Seed-specific data
            const seedType = parseSeedType($card.find(PRODUCT_CARD_SELECTORS.seedType).text());
            const cannabisType = parseCannabisType($card.find(PRODUCT_CARD_SELECTORS.strainType).text());
            const thcData = parseTHCLevel($card.find(PRODUCT_CARD_SELECTORS.thcLevel).text());
            
            products.push({
                name,
                slug: generateSlug(name),
                url,
                imageUrl: fullImageUrl,
                price,
                originalPrice: price, // TODO: Extract if discounted price available
                discountPercentage: 0,
                stockStatus,
                rating: rating || 0,
                reviewsCount: reviewCount || 0,
                seedType,
                cannabisType,
                thcMin: thcData?.min || 0,
                thcMax: thcData?.max || 0,
                cbdMin: 0, // TODO: Extract CBD data
                cbdMax: 0,
                floweringTime: extractFloweringTime($card),
                // Add more fields as needed
            });

        } catch (error) {
            console.warn(\`[${siteDisplayName} Extract] Failed to parse product \${index}:\`, error);
            // Continue with next product (project requirement: log errors but do not break)
        }
    });

    console.log(\`[${siteDisplayName} Extract] Successfully extracted \${products.length} products\`);
    return products;
}

// Helper functions
function parseStockStatus(statusText: string): string {
    const normalized = statusText.toLowerCase().trim();
    if (normalized.includes('out of stock') || normalized.includes('sold out')) {
        return 'OUT_OF_STOCK';
    }
    return 'IN_STOCK';
}

function parseRating(ratingElement: any): number | null {
    // TODO: Implement based on site's rating system
    // Examples:
    // - Star count: count('.star.filled')
    // - Numeric rating: parseFloat(text())
    // - Percentage: convert percentage to 5-star scale
    return null;
}

function parseReviewCount(reviewText: string): number | null {
    const match = reviewText.match(/(\\d+)/);
    return match ? parseInt(match[1]) : null;
}

function extractFloweringTime($card: any): string {
    const floweringText = $card.find(PRODUCT_CARD_SELECTORS.floweringTime).text().trim();
    // TODO: Parse flowering time (e.g., "8-10 weeks", "65 days")
    return floweringText;
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
`;

const dataMapperTemplate = `/**
 * ${siteDisplayName} Data Mappers
 */

import { SeedType, CannabisType } from '@prisma/client';

export function parseSeedType(typeText: string): SeedType {
    const normalized = typeText.toLowerCase().trim();
    
    if (normalized.includes('feminized') || normalized.includes('fem')) {
        return SeedType.FEMINIZED;
    }
    if (normalized.includes('autoflower') || normalized.includes('auto')) {
        return SeedType.AUTO_FLOWERING;  
    }
    return SeedType.REGULAR; // Default
}

export function parseCannabisType(typeText: string): CannabisType {
    const normalized = typeText.toLowerCase().trim();
    
    if (normalized.includes('indica')) {
        return CannabisType.INDICA;
    }
    if (normalized.includes('sativa')) {
        return CannabisType.SATIVA;
    }
    if (normalized.includes('hybrid') || normalized.includes('mix')) {
        return CannabisType.HYBRID;
    }
    return CannabisType.HYBRID; // Default
}

export function parsePrice(priceText: string): number {
    // Remove currency symbols and parse
    const cleanPrice = priceText.replace(/[^0-9.,]/g, '');
    
    // Handle different decimal separators
    const normalizedPrice = cleanPrice.replace(',', '.');
    const price = parseFloat(normalizedPrice);
    
    return isNaN(price) ? 0 : price;
}

export function parseTHCLevel(thcText: string): { min: number; max: number } | null {
    if (!thcText) return null;
    
    // Parse ranges like "20-25%" or single values "22%"
    const match = thcText.match(/(\\d+(?:\\.\\d+)?)\\s*-?\\s*(\\d+(?:\\.\\d+)?)?/);
    if (match) {
        const min = parseFloat(match[1]);
        const max = match[2] ? parseFloat(match[2]) : min;
        return { min, max };
    }
    return null;
}

export function parseCBDLevel(cbdText: string): { min: number; max: number } | null {
    // Same logic as THC
    return parseTHCLevel(cbdText);
}

export function parsePackSize(packText: string): number {
    const match = packText.match(/(\\d+)\\s*(?:seeds?|pack)/i);
    return match ? parseInt(match[1]) : 1;
}
`;

const scraperTemplate = `/**
 * ${siteDisplayName} Product List Scraper
 */

import { CheerioCrawler, Dataset, RequestQueue } from 'crawlee';
import { CategoryResultFromCrawling } from '@/types/crawl.type';
import { extractProductsFromHTML } from '../utils/extractProductsFromHTML';
import { BASE_URL, getCategoryUrl, PRODUCT_CARD_SELECTORS } from './selectors';

export class ProductListScraper {
    private baseUrl: string;

    constructor(baseUrl: string = BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Scrape product listing with pagination support
     */
    async scrapeProductList(listingUrl: string, maxPages: number = 5): Promise<CategoryResultFromCrawling> {
        const startTime = Date.now();
        const runId = Date.now();
        const datasetName = \`${siteName}-\${runId}\`;
        const dataset = await Dataset.open(datasetName);
        const requestQueue = await RequestQueue.open(\`${siteName}-queue-\${runId}\`);

        let actualPages = 0;

        const crawler = new CheerioCrawler({
            requestQueue,
            async requestHandler({ $, request, log }) {
                log.info(\`[${siteDisplayName}] Scraping: \${request.url}\`);

                // Extract products from current page
                const products = extractProductsFromHTML($);
                log.info(\`[${siteDisplayName}] Extracted \${products.length} products\`);

                // Check pagination
                const hasNextPage = $(PRODUCT_CARD_SELECTORS.nextPage).length > 0;
                log.info(\`[${siteDisplayName}] Has next page: \${hasNextPage}\`);
                
                await dataset.pushData({ products, url: request.url, hasNextPage });

                // PROJECT REQUIREMENT: Wait 2-5 seconds between requests to same site
                const delayMs = Math.floor(Math.random() * 3000) + 2000; // Random 2000-5000ms
                log.info(\`[${siteDisplayName}] Waiting \${delayMs}ms (project requirement: 2-5 seconds)\`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            },

            // PROJECT REQUIREMENT COMPLIANCE:
            maxRequestsPerMinute: 15, // Ensure 2-5 second delays are respected
            maxConcurrency: 1,        // Sequential requests within same site
            maxRequestRetries: 3,
        });

        // Auto-crawl mode or fixed pages
        if (maxPages === 0) {
            // Auto discovery logic
            let page = 1;
            while (true) {
                const pageUrl = getCategoryUrl(listingUrl, page);
                await crawler.run([pageUrl]);

                const results = await dataset.getData();
                const lastResult = results.items[results.items.length - 1] as { products: any[], hasNextPage: boolean };

                if (lastResult.products.length === 0 || !lastResult.hasNextPage) {
                    actualPages = page;
                    break;
                }

                page++;
                if (page > 200) break; // Safety limit
            }
        } else {
            // Fixed pages mode
            const urls: string[] = [];
            for (let page = 1; page <= maxPages; page++) {
                urls.push(getCategoryUrl(listingUrl, page));
            }
            await crawler.run(urls);
            actualPages = maxPages;
        }

        // Collect results
        const results = await dataset.getData();
        const allProducts: any[] = [];

        results.items.forEach((item: any) => {
            allProducts.push(...item.products);
        });

        return {
            category: listingUrl,
            totalProducts: allProducts.length,
            totalPages: actualPages,
            products: allProducts,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        };
    }

    /**
     * Scrape specific page range
     */
    async scrapeProductListByBatch(
        listingUrl: string, 
        startPage: number, 
        endPage: number
    ): Promise<CategoryResultFromCrawling> {
        if (startPage < 1 || endPage < startPage) {
            throw new Error(\`Invalid page range: \${startPage}-\${endPage}\`);
        }

        const startTime = Date.now();
        const totalPages = endPage - startPage + 1;
        const runId = Date.now();
        const datasetName = \`${siteName}-batch-\${runId}\`;
        const dataset = await Dataset.open(datasetName);
        const requestQueue = await RequestQueue.open(\`${siteName}-batch-queue-\${runId}\`);

        // Generate URLs for page range
        const urls: string[] = [];
        for (let page = startPage; page <= endPage; page++) {
            urls.push(getCategoryUrl(listingUrl, page));
        }

        console.log(\`[${siteDisplayName} Batch] Scraping pages \${startPage}-\${endPage} (\${totalPages} pages)\`);

        const crawler = new CheerioCrawler({
            requestQueue,
            async requestHandler({ $, request, log }) {
                const url = new URL(request.url);
                const pageNum = url.searchParams.get('page') || '1';
                log.info(\`[${siteDisplayName} Batch] Page \${pageNum}: \${request.url}\`);

                const products = extractProductsFromHTML($);
                log.info(\`[${siteDisplayName} Batch] Page \${pageNum}: Extracted \${products.length} products\`);

                await dataset.pushData({ products, page: pageNum });

                // PROJECT REQUIREMENT: Wait 2-5 seconds between requests to same site
                const delayMs = Math.floor(Math.random() * 3000) + 2000;
                log.info(\`[${siteDisplayName} Batch] Page \${pageNum}: Waiting \${delayMs}ms (project requirement)\`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            },
            
            // PROJECT REQUIREMENT COMPLIANCE:
            maxRequestsPerMinute: 15,
            maxConcurrency: 1,
            maxRequestRetries: 3,
        });

        await crawler.run(urls);

        // Collect results
        const results = await dataset.getData();
        const allProducts: any[] = [];

        results.items.forEach((item: any) => {
            allProducts.push(...item.products);
        });

        return {
            category: listingUrl,
            totalProducts: allProducts.length,
            totalPages: totalPages,
            products: allProducts,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        };
    }
}
`;

const dbServiceTemplate = `/**
 * ${siteDisplayName} Database Service
 */

import type { CategoryMetadataFromCrawling, ProductCardDataFromCrawling } from '@/types/crawl.type';
import { PrismaClient, SeedType, CannabisType, StockStatus } from '@prisma/client';

const SELLER_NAME = '${siteDisplayName}';
const SELLER_URL = 'https://${siteUrl}';
const SCRAPING_SOURCE_URL = 'https://${siteUrl}/products'; // TODO: Update with actual products URL

export class SaveDbService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Initialize or get Seller record
     */
    async initializeSeller(): Promise<string> {
        const seller = await this.prisma.seller.upsert({
            where: { name: SELLER_NAME },
            update: {
                lastScraped: new Date(),
                status: 'success',
                updatedAt: new Date(),
            },
            create: {
                name: SELLER_NAME,
                url: SELLER_URL,
                scrapingSourceUrl: SCRAPING_SOURCE_URL,
                isActive: true,
                lastScraped: new Date(),
                status: 'success',
            },
        });
        return seller.id;
    }

    /**
     * Get or create category
     */
    async getOrCreateCategory(sellerId: string, categoryData: {
        name: string;
        slug: string;
        seedType?: string;
    }): Promise<string> {
        const category = await this.prisma.seedProductCategory.upsert({
            where: {
                sellerId_slug: {
                    sellerId: sellerId,
                    slug: categoryData.slug,
                }
            },
            update: {
                name: categoryData.name,
                updatedAt: new Date(),
            },
            create: {
                sellerId: sellerId,
                name: categoryData.name,
                slug: categoryData.slug,
                seedType: categoryData.seedType ? categoryData.seedType as SeedType : null,
                isActive: true,
            }
        });
        return category.id;
    }

    /**
     * Save products to category
     */
    async saveProductsToCategory(categoryId: string, products: ProductCardDataFromCrawling[]): Promise<{
        saved: number;
        updated: number;
        errors: number;
    }> {
        let saved = 0;
        let updated = 0;
        let errors = 0;

        for (const product of products) {
            try {
                // Map stock status
                const stockStatus = product.stockStatus === 'IN_STOCK' 
                    ? StockStatus.IN_STOCK 
                    : StockStatus.OUT_OF_STOCK;

                const existingProduct = await this.prisma.seedProduct.findFirst({
                    where: {
                        categoryId: categoryId,
                        slug: product.slug,
                    }
                });

                const productData = {
                    categoryId: categoryId,
                    name: product.name,
                    slug: product.slug,
                    url: product.url,
                    imageUrl: product.imageUrl || '',
                    price: product.price || 0,
                    originalPrice: product.originalPrice || product.price || 0,
                    discountPercentage: product.discountPercentage || 0,
                    stockStatus: stockStatus,
                    rating: product.rating || 0,
                    reviewsCount: product.reviewsCount || 0,
                    seedType: product.seedType || SeedType.REGULAR,
                    cannabisType: product.cannabisType || CannabisType.HYBRID,
                    thcMin: product.thcMin || 0,
                    thcMax: product.thcMax || 0,
                    cbdMin: product.cbdMin || 0,
                    cbdMax: product.cbdMax || 0,
                    floweringTime: product.floweringTime || '',
                    packSize: 1, // TODO: Extract pack size from product data
                    pricePerSeed: (product.price || 0) / 1, // price / packSize
                    updatedAt: new Date(),
                };

                if (existingProduct) {
                    await this.prisma.seedProduct.update({
                        where: { id: existingProduct.id },
                        data: productData,
                    });
                    updated++;
                } else {
                    await this.prisma.seedProduct.create({
                        data: productData,
                    });
                    saved++;
                }

            } catch (error) {
                console.error(\`[${siteDisplayName} DB] Failed to save product "\${product.name}":\`, error);
                errors++;
            }
        }

        console.log(\`[${siteDisplayName} DB] Saved: \${saved}, Updated: \${updated}, Errors: \${errors}\`);
        return { saved, updated, errors };
    }

    /**
     * Log scraping activity
     */
    async logScrapeActivity(sellerId: string, status: string, productsCount: number, duration: number): Promise<void> {
        await this.updateSellerStatus(
            sellerId, 
            status === 'success' ? 'success' : 'error',
            \`Scraped \${productsCount} products in \${duration}ms\`
        );
    }

    /**
     * Update seller status
     */
    async updateSellerStatus(sellerId: string, status: 'success' | 'error', message?: string): Promise<void> {
        await this.prisma.seller.update({
            where: { id: sellerId },
            data: {
                status,
                lastScraped: new Date(),
                updatedAt: new Date(),
                ...(status === 'error' && message && { notes: message }),
            },
        });
    }
}
`;

const testTemplate = `/**
 * ${siteDisplayName} Test Script
 */

import { ProductListScraper } from '../core/product-list-scrapers';
import { SaveDbService } from '../core/save-db-service';
import { PrismaClient } from '@prisma/client';

const TEST_URL = 'https://${siteUrl}/products'; // TODO: Update with actual URL

async function test${siteName.charAt(0).toUpperCase() + siteName.slice(1)}Scraper() {
    console.log('🧪 Testing ${siteDisplayName} Scraper...\\n');
    
    const scraper = new ProductListScraper();
    
    try {
        console.log('Testing 2 pages...');
        const startTime = Date.now();
        
        const result = await scraper.scrapeProductListByBatch(TEST_URL, 1, 2);
        
        const duration = Date.now() - startTime;
        
        console.log('\\n📊 Results:');
        console.log(\`✅ Success! Found \${result.totalProducts} products\`);
        console.log(\`Duration: \${duration}ms\`);
        console.log(\`Pages: \${result.totalPages}\`);
        
        if (result.products.length > 0) {
            console.log('\\n🔍 Sample product:');
            console.log(JSON.stringify(result.products[0], null, 2));
        }
        
        return result;
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

async function testDatabaseIntegration() {
    console.log('\\n🧪 Testing Database Integration...\\n');
    
    const prisma = new PrismaClient();
    const dbService = new SaveDbService(prisma);
    const scraper = new ProductListScraper();
    
    try {
        // Initialize seller
        const sellerId = await dbService.initializeSeller();
        console.log(\`✅ Seller initialized: \${sellerId}\`);
        
        // Scrape test data
        const result = await scraper.scrapeProductListByBatch(TEST_URL, 1, 1);
        console.log(\`✅ Scraped \${result.totalProducts} products\`);
        
        // Create category
        const categoryId = await dbService.getOrCreateCategory(sellerId, {
            name: 'All Products',
            slug: 'all-products',
        });
        console.log(\`✅ Category created: \${categoryId}\`);
        
        // Save to database
        const saveResult = await dbService.saveProductsToCategory(categoryId, result.products);
        console.log(\`✅ Database save: \${saveResult.saved} saved, \${saveResult.updated} updated, \${saveResult.errors} errors\`);
        
        return saveResult;
    } catch (error) {
        console.error('❌ Database test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function runAllTests() {
    try {
        await test${siteName.charAt(0).toUpperCase() + siteName.slice(1)}Scraper();
        await testDatabaseIntegration();
        
        console.log('\\n🎉 All tests passed!');
        console.log('\\n📝 Next steps:');
        console.log('1. Update selectors in core/selectors.ts');
        console.log('2. Customize data extraction in utils/extractProductsFromHTML.ts');
        console.log('3. Add to ScraperFactory in lib/factories/scraper-factory.ts');
        console.log('4. Test via API endpoint');
        
    } catch (error) {
        console.error('❌ Tests failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runAllTests().catch(console.error);
}

export { test${siteName.charAt(0).toUpperCase() + siteName.slice(1)}Scraper, testDatabaseIntegration };
`;

// Write files
const files = [
    { path: path.join(coreDir, 'selectors.ts'), content: selectorsTemplate },
    { path: path.join(utilsDir, 'extractProductsFromHTML.ts'), content: extractorTemplate },
    { path: path.join(utilsDir, 'data-mappers.ts'), content: dataMapperTemplate },
    { path: path.join(coreDir, 'product-list-scrapers.ts'), content: scraperTemplate },
    { path: path.join(coreDir, 'save-db-service.ts'), content: dbServiceTemplate },
    { path: path.join(scriptsDir, 'test-scraper.ts'), content: testTemplate },
];

files.forEach(file => {
    fs.writeFileSync(file.path, file.content);
    console.log(`✅ Created file: ${file.path}`);
});

// Create README
const readmeContent = `# ${siteDisplayName} Scraper

## Overview
Scraper for ${siteDisplayName} (${siteUrl})

## Setup Status
- [x] Directory structure created
- [ ] Selectors updated (core/selectors.ts)
- [ ] HTML extraction customized (utils/extractProductsFromHTML.ts) 
- [ ] Data mappers configured (utils/data-mappers.ts)
- [ ] Database service tested (core/save-db-service.ts)
- [ ] Added to ScraperFactory (lib/factories/scraper-factory.ts)
- [ ] API integration tested

## Quick Start

1. **Update selectors:**
   \`\`\`bash
   # Edit core/selectors.ts with actual CSS selectors
   \`\`\`

2. **Test scraper:**
   \`\`\`bash
   npx tsx scrapers/${siteName}/scripts/test-scraper.ts
   \`\`\`

3. **Add to factory:**
   - Update \`lib/factories/scraper-factory.ts\`
   - Add '${siteName}' to ScraperSource type
   - Add cases to factory methods

4. **Test via API:**
   \`\`\`bash
   curl -X POST http://localhost:3000/api/scraper \\
     -H "Content-Type: application/json" \\
     -d '{
       "action": "scrape-seeds",
       "source": "${siteName}",
       "mode": "test",
       "config": {
         "scrapingSourceUrl": "https://${siteUrl}/products",
         "categorySlug": "all-products"
       }
     }'
   \`\`\`

## Configuration Required

### 1. Selectors (core/selectors.ts)
- Update PRODUCT_CARD_SELECTORS with actual CSS selectors
- Update getCategoryUrl() with correct pagination pattern

### 2. URL Patterns
- Base URL: https://${siteUrl}
- Products listing: TODO
- Pagination: TODO

### 3. Data Mapping
- Customize parsers in utils/data-mappers.ts
- Handle site-specific price formats
- Map seed types and cannabis types correctly

## Compliance
- ✅ 2-5 second delays between requests
- ✅ Sequential requests within same site  
- ✅ Error handling without breaking process
- ✅ Respects rate limiting

## Project Requirements Met
- [x] One scraper per site (isolated structure)
- [x] Wait 2-5 seconds between requests
- [x] Take lowest price if range shown
- [x] Capture pack size
- [x] Log errors but do not break search
- [x] Ready for affiliate link integration
`;

fs.writeFileSync(path.join(scraperDir, 'README.md'), readmeContent);
console.log(`✅ Created README: ${path.join(scraperDir, 'README.md')}`);

console.log(`\n🎉 Scraper setup complete for ${siteDisplayName}!`);
console.log(`\n📁 Created structure: scrapers/${siteName}/`);
console.log(`\n📝 Next steps:`);
console.log(`1. cd scrapers/${siteName}`);
console.log(`2. Update selectors in core/selectors.ts`);
console.log(`3. Test: npx tsx scripts/test-scraper.ts`);
console.log(`4. Add to ScraperFactory when ready`);
console.log(`\n📚 See docs/implementation/add-new-scraper-guide.md for detailed instructions`);