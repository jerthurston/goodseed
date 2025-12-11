/**
 * Vancouver Seed Bank - Batch Scraper
 * 
 * Scrape specific page range to avoid re-crawling
 * 
 * Usage:
 *   pnpm tsx scrapers/vancouverseedbank/scripts/scrape-batch.ts <startPage> <endPage>
 * 
 * Example:
 *   # Batch 1: Page 1-10
 *   pnpm tsx scrapers/vancouverseedbank/scripts/scrape-batch.ts 1 10
 * 
 *   # Batch 2: Page 11-20
 *   pnpm tsx scrapers/vancouverseedbank/scripts/scrape-batch.ts 11 20
 * 
 *   # Batch 3: Page 21-30
 *   pnpm tsx scrapers/vancouverseedbank/scripts/scrape-batch.ts 21 30
 */

import { prisma } from '@/lib/prisma';
import type { ProductCardData } from '@/scrapers/royalqueenseeds/core/types';
import { extractProductsFromHTML } from '@/scrapers/vancouverseedbank/utils/extractProductsFromHTML';
import { CheerioCrawler, Dataset } from 'crawlee';
import 'dotenv/config';
import { SaveDbService } from '../core/save-db-service';
import { getCategoryUrl } from '../core/selectors';

const LISTING_URL = 'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/';

async function main() {
    const startPage = parseInt(process.argv[2] || '1');
    const endPage = parseInt(process.argv[3] || '10');

    if (startPage < 1 || endPage < startPage) {
        console.error('❌ Invalid page range. Usage: scrape-batch.ts <startPage> <endPage>');
        console.error('   Example: scrape-batch.ts 1 10');
        process.exit(1);
    }

    const totalPages = endPage - startPage + 1;
    const startTime = Date.now();

    console.log('='.repeat(70));
    console.log('🌱 Vancouver Seed Bank - Batch Scraper');
    console.log('='.repeat(70));
    console.log(`Page Range: ${startPage} - ${endPage} (${totalPages} pages)`);
    console.log(`URL: ${LISTING_URL}`);
    console.log('');

    const dbService = new SaveDbService(prisma);
    const datasetName = `vsb-batch-${Date.now()}`;
    const dataset = await Dataset.open(datasetName);

    try {
        // Initialize seller and category
        console.log('📦 Initializing seller and category...');
        const sellerId = await dbService.initializeSeller();
        const categoryId = await dbService.getOrCreateCategory(sellerId, {
            name: 'All Products',
            slug: 'all-products',
            url: LISTING_URL,
        });
        console.log(`✅ Seller ID: ${sellerId}`);
        console.log(`✅ Category ID: ${categoryId}`);
        console.log('');

        // Generate URLs for page range
        const urls: string[] = [];
        for (let page = startPage; page <= endPage; page++) {
            urls.push(getCategoryUrl(LISTING_URL, page));
        }

        console.log(`🚀 Scraping ${totalPages} pages...`);

        // Crawl pages
        const crawler = new CheerioCrawler({
            async requestHandler({ $, request, log }) {
                const pageNum = request.url.match(/pagenum\/(\d+)/)?.[1] || '1';
                log.info(`[Batch] Page ${pageNum}: ${request.url}`);

                const products = extractProductsFromHTML($);
                log.info(`[Batch] Page ${pageNum}: Extracted ${products.length} products`);

                await dataset.pushData({ products, page: pageNum });
            },
            maxRequestsPerMinute: 30,
            maxConcurrency: 2,
            maxRequestRetries: 3,
        });

        await crawler.run(urls);

        // Collect and save products
        const results = await dataset.getData();
        const allProducts: ProductCardData[] = [];
        results.items.forEach((item) => {
            allProducts.push(...(item as { products: ProductCardData[] }).products);
        });

        console.log(`\n✅ Scraped ${allProducts.length} products`);
        console.log('💾 Saving to database...');

        const saveResult = await dbService.saveProductsToCategory(categoryId, allProducts);

        const duration = Math.round((Date.now() - startTime) / 1000);
        await dbService.logScrapeActivity(sellerId, 'success', allProducts.length, duration);

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('✅ BATCH COMPLETE');
        console.log('='.repeat(70));
        console.log(`Pages: ${startPage} - ${endPage} (${totalPages} pages)`);
        console.log(`Total Products: ${allProducts.length}`);
        console.log(`Saved: ${saveResult.saved}`);
        console.log(`Updated: ${saveResult.updated}`);
        console.log(`Errors: ${saveResult.errors}`);
        console.log(`Duration: ${duration}s`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
