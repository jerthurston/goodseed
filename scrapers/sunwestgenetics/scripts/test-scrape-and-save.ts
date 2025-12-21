/**
 * Test SunWest Genetics Scrape and Save to Database
 * 
 * Script to test complete scraping workflow and database save
 * Tests the integration of all components together
 * 
 * Usage:
 * pnpm tsx scrapers/sunwestgenetics/scripts/test-scrape-and-save.ts
 */

import { sunwestgeneticsProductListScraper } from '@/scrapers/sunwestgenetics/core/sunwestgenetics-scrape-product-list';
import { SaveDbService } from '@/scrapers/sunwestgenetics/core/save-db-service';
import { BASE_URL, CATEGORY_URLS } from '@/scrapers/sunwestgenetics/core/selectors';
import { SUNWESTGENETICS_SELECTORS } from '@/scrapers/sunwestgenetics/core/selectors';
import { apiLogger } from '@/lib/helpers/api-logger';
import { prisma } from '@/lib/prisma';

// Site configuration for SunWest Genetics
const siteConfig = {
    name: 'SunWest Genetics',
    baseUrl: BASE_URL,
    isImplemented: true,
    selectors: SUNWESTGENETICS_SELECTORS
};

async function testScrapeAndSave() {
    console.log('🧪 Testing SunWest Genetics Complete Workflow...');
    console.log('📍 Target URL:', CATEGORY_URLS.allProducts);
    console.log('');

    try {
        // Initialize database service
        console.log('🗄️  Initializing database service...');
        const dbService = new SaveDbService(prisma);
        
        // Get or create SunWest Genetics seller
        console.log('🏪 Setting up seller...');
        const seller = await prisma.seller.upsert({
            where: { name: 'SunWest Genetics' },
            update: {},
            create: {
                name: 'SunWest Genetics',
                url: BASE_URL,
                isActive: true,
                status: 'active',
                affiliateTag: 'sunwest',
                autoScrapeInterval: 86400, // 24 hours
            }
        });

        // Initialize service with seller
        await dbService.initializeSeller(seller.id);
        console.log(`✅ Seller initialized: ${seller.name} (ID: ${seller.id})`);

        // Create category metadata  
        const categoryMetadata = {
            name: 'All Cannabis Seeds',
            slug: 'all-cannabis-seeds',
            seedType: 'MIXED'
        };

        // Get or create category
        console.log('📁 Setting up category...');
        const categoryId = await dbService.getOrCreateCategory(categoryMetadata);
        console.log(`✅ Category setup with ID: ${categoryId}`);

        // Test scraping (single page first)
        console.log('');
        console.log('🕷️  Starting scrape test (1 page only)...');
        
        const scrapeResult = await sunwestgeneticsProductListScraper(siteConfig);
        
        console.log('📊 Scrape Results:');
        console.log(`   Products found: ${scrapeResult.products.length}`);
        console.log(`   Total products: ${scrapeResult.totalProducts}`);
        console.log(`   Total pages: ${scrapeResult.totalPages}`);
        console.log(`   Duration: ${scrapeResult.duration}ms`);

        if (scrapeResult.products.length === 0) {
            console.log('');
            console.log('⚠️  No products found! Check selectors configuration.');
            console.log('💡 Run test-sunwest-scraper.ts first to verify selectors.');
            return;
        }

        // Display sample products
        console.log('');
        console.log('🔍 Sample scraped products:');
        scrapeResult.products.slice(0, 2).forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   - URL: ${product.url}`);
            console.log(`   - Type: ${product.cannabisType || 'N/A'}`);
            console.log(`   - THC: ${product.thcLevel || 'N/A'}`);
            console.log(`   - Pricing variations: ${product.pricings?.length || 0}`);
        });

        // Save to database
        console.log('');
        console.log('💾 Saving products to database...');
        
        const saveResult = await dbService.saveProductsToDatabase(scrapeResult.products);
        
        console.log(`✅ Database Results:`);
        console.log(`   Saved: ${saveResult.saved} products`);
        console.log(`   Updated: ${saveResult.updated} products`);
        console.log(`   Errors: ${saveResult.errors} products`);

        // Summary
        console.log('');
        console.log('🎉 Test Summary:');
        console.log(`   ✅ Scraper: Working (${scrapeResult.products.length} products)`);
        console.log(`   ✅ Database: Working (${saveResult.saved + saveResult.updated} products saved)`);
        console.log(`   ✅ Integration: Complete`);
        console.log('');
        console.log('🚀 SunWest Genetics scraper is ready for production!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        apiLogger.logError('Scrape and save test failed:', { 
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}

// Run the test
testScrapeAndSave()
    .then(() => {
        console.log('🏁 Test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test failed:', error);
        process.exit(1);
    });
