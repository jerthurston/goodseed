/**
 * Seed Supreme Full Scraper - Integrated Category + Product
 * 
 * Combines category and product scrapers into a single pipeline:
 * 1. Scrape category pages → Get product URLs
 * 2. Scrape each product detail page → Get full product data
 * 3. Return enriched products with all details
 * 
 * Uses Crawlee for queue management, retries, and rate limiting
 */

import { SeedSupremeCategoryScraper } from './category-scraper';
import { SeedSupremeProductScraper } from './product-scraper';
import { ProductDetailData } from './types';

export class SeedSupremeFullScraper {
    private categoryScraper: SeedSupremeCategoryScraper;
    private productScraper: SeedSupremeProductScraper;

    constructor() {
        this.categoryScraper = new SeedSupremeCategoryScraper();
        this.productScraper = new SeedSupremeProductScraper();
    }

    /**
     * Full scraping pipeline: Category → Products
     * 
     * @param categorySlug - Category URL slug (e.g., 'feminized-seeds')
     * @param maxPages - Maximum category pages to scrape
     * @param maxProducts - Maximum products to scrape (0 = all)
     * @returns Array of fully detailed products
     */
    async scrapeCategory(
        categorySlug: string,
        maxPages: number = 1,
        maxProducts: number = 0
    ): Promise<ProductDetailData[]> {
        console.log('\n============================================================');
        console.log('🚀 Seed Supreme Full Scraper - Starting Pipeline');
        console.log('============================================================');
        console.log(`Category: ${categorySlug}`);
        console.log(`Max Pages: ${maxPages}`);
        console.log(`Max Products: ${maxProducts === 0 ? 'All' : maxProducts}`);
        console.log('');

        const startTime = Date.now();

        // Step 1: Scrape category pages to get product URLs
        console.log('📋 Step 1/2: Scraping category pages...\n');
        const categoryResult = await this.categoryScraper.scrapeCategory(categorySlug, maxPages);

        let productUrls = categoryResult.products.map(p => p.url);
        console.log(`\n✓ Found ${productUrls.length} products from ${categoryResult.totalPages} page(s)`);

        // Limit products if maxProducts specified
        if (maxProducts > 0 && productUrls.length > maxProducts) {
            productUrls = productUrls.slice(0, maxProducts);
            console.log(`  → Limited to first ${maxProducts} products`);
        }

        // Step 2: Scrape product details
        console.log(`\n📦 Step 2/2: Scraping ${productUrls.length} product detail pages...\n`);
        const products = await this.productScraper.scrapeProducts(productUrls);

        const duration = Date.now() - startTime;

        // Summary
        console.log('\n============================================================');
        console.log('✅ Pipeline Complete!');
        console.log('============================================================');
        console.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`);
        console.log(`Category Pages: ${categoryResult.totalPages}`);
        console.log(`Products Found: ${categoryResult.products.length}`);
        console.log(`Products Scraped: ${products.length}`);
        console.log(`Average Time: ${(duration / products.length / 1000).toFixed(2)}s per product`);

        // Data quality metrics
        const withPackOptions = products.filter(p => p.packOptions.length > 0);
        const withSpecs = products.filter(p => p.specs.variety || p.specs.thcContent);

        console.log('\n📊 Data Quality:');
        console.log(`  With Pack Options: ${withPackOptions.length}/${products.length} (${Math.round(withPackOptions.length / products.length * 100)}%)`);
        console.log(`  With Specifications: ${withSpecs.length}/${products.length} (${Math.round(withSpecs.length / products.length * 100)}%)`);

        console.log('\n💾 Storage: ./storage/datasets/default/');
        console.log('============================================================\n');

        return products;
    }

    /**
     * Scrape multiple categories
     */
    async scrapeMultipleCategories(
        categories: Array<{ slug: string; maxPages?: number }>,
        maxProductsPerCategory: number = 0
    ): Promise<Map<string, ProductDetailData[]>> {
        console.log('\n============================================================');
        console.log('🚀 Seed Supreme Multi-Category Scraper');
        console.log('============================================================');
        console.log(`Categories: ${categories.length}`);
        console.log('');

        const results = new Map<string, ProductDetailData[]>();
        const startTime = Date.now();

        for (const [index, category] of categories.entries()) {
            console.log(`\n[${index + 1}/${categories.length}] Processing: ${category.slug}`);
            console.log('─'.repeat(60));

            const products = await this.scrapeCategory(
                category.slug,
                category.maxPages || 1,
                maxProductsPerCategory
            );

            results.set(category.slug, products);

            // Delay between categories to avoid rate limiting
            if (index < categories.length - 1) {
                const delay = 5000; // 5 seconds
                console.log(`\n⏳ Waiting ${delay / 1000}s before next category...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        const duration = Date.now() - startTime;
        const totalProducts = Array.from(results.values()).reduce((sum, products) => sum + products.length, 0);

        console.log('\n============================================================');
        console.log('✅ Multi-Category Scraping Complete!');
        console.log('============================================================');
        console.log(`Total Duration: ${(duration / 1000 / 60).toFixed(2)} minutes`);
        console.log(`Categories Processed: ${results.size}`);
        console.log(`Total Products: ${totalProducts}`);
        console.log('');

        // Summary by category
        results.forEach((products, category) => {
            console.log(`  ${category}: ${products.length} products`);
        });

        console.log('============================================================\n');

        return results;
    }
}
