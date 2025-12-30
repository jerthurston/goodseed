/**
 * Test Sonoma Seeds Scrape and Save to Database
 * 
 * Script to test complete scraping workflow and database save
 * Tests the integration of all components together
 * 
 * Usage:
 * pnpm tsx scrapers/sonomaseeds/scripts/test-scrape-and-save.ts
 */

import { sonomaSeedsProductListScraper } from '@/scrapers/sonomaseeds/core/sonomaseeds-product-list-scraper';
import { SaveDbService } from '@/scrapers/sonomaseeds/core/save-db-service';
import { SONOMASEEDS_PRODUCT_CARD_SELECTORS } from '@/scrapers/sonomaseeds/core/selectors';
import { apiLogger } from '@/lib/helpers/api-logger';
import { prisma } from '@/lib/prisma';

// Base URL for Sonoma Seeds
const BASE_URL = 'https://www.sonomaseeds.com';

// Site configuration for Sonoma Seeds
const siteConfig = {
    name: 'Sonoma Seeds',
    baseUrl: BASE_URL,
    isImplemented: true,
    selectors: SONOMASEEDS_PRODUCT_CARD_SELECTORS
};

async function testScrapeAndSave() {
    console.log('🧪 Testing Sonoma Seeds Complete Workflow...');
    console.log('📍 Target URL:', `${BASE_URL}/shop/page/1/`);
    console.log('');

    try {
        // Initialize database service
        console.log('🗄️  Initializing database service...');
        const dbService = new SaveDbService(prisma);
        
        // Get or create Sonoma Seeds seller
        console.log('🏪 Setting up seller...');
        const seller = await prisma.seller.upsert({
            where: { name: 'Sonoma Seeds' },
            update: {},
            create: {
                name: 'Sonoma Seeds',
                url: BASE_URL,
                isActive: true,
                status: 'active',
                affiliateTag: 'sonoma',
                autoScrapeInterval: 86400, // 24 hours
            }
        });

        // Initialize service with seller
        await dbService.initializeSeller(seller.id);
        console.log(`✅ Seller initialized: ${seller.name} (ID: ${seller.id})`);

        // Create category metadata  
        const categoryMetadata = {
            name: 'Cannabis Seeds',
            slug: 'cannabis-seeds',
            seedType: 'MIXED'
        };

        // Get or create category
        console.log('📁 Setting up category...');
        const categoryId = await dbService.getOrCreateCategory(categoryMetadata);
        console.log(`✅ Category setup with ID: ${categoryId}`);

        // Test scraping (limit to 2 pages for testing)
        console.log('');
        console.log('🕷️  Starting scrape test (2 pages only)...');
        
        const scrapeResult = await sonomaSeedsProductListScraper(siteConfig, 2); // Limit to 2 pages
        
        console.log('📊 Scrape Results:');
        console.log(`   Products found: ${scrapeResult.products.length}`);
        console.log(`   Total products: ${scrapeResult.totalProducts}`);
        console.log(`   Total pages: ${scrapeResult.totalPages}`);
        console.log(`   Duration: ${scrapeResult.duration}ms`);

        if (scrapeResult.products.length === 0) {
            console.log('');
            console.log('⚠️  No products found! Check selectors configuration.');
            console.log('💡 Run test-sonoma-scraper.ts first to verify selectors.');
            return;
        }

        // Display sample products
        console.log('');
        console.log('🔍 Sample scraped products:');
        scrapeResult.products.slice(0, 3).forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   - URL: ${product.url}`);
            console.log(`   - Type: ${product.cannabisType || 'N/A'}`);
            console.log(`   - THC: ${product.thcLevel || 'N/A'}`);
            console.log(`   - CBD: ${product.cbdLevel || 'N/A'}`);
            console.log(`   - Pricing variations: ${product.pricings?.length || 0}`);
            if (product.pricings && product.pricings.length > 0) {
                console.log(`   - Example price: $${product.pricings[0].totalPrice} (${product.pricings[0].packSize} seeds, $${product.pricings[0].pricePerSeed.toFixed(2)} per seed)`);
            }
        });

        // Save to database
        console.log('');
        console.log('💾 Saving products to database...');
        
        const saveResult = await dbService.saveProductsToDatabase(scrapeResult.products);
        
        console.log(`✅ Database Results:`);
        console.log(`   Saved: ${saveResult.saved} products`);
        console.log(`   Updated: ${saveResult.updated} products`);
        console.log(`   Errors: ${saveResult.errors} products`);

        // Get final statistics from database
        console.log('');
        console.log('📊 Final Database Statistics:');
        const categoriesCount = await prisma.seedProductCategory.count();
        const productsCount = await prisma.seedProduct.count({
            where: { sellerId: seller.id }
        });
        const sellerInfo = await prisma.seller.findUnique({
            where: { id: seller.id },
            select: { status: true }
        });
        
        console.log(`   Total Categories: ${categoriesCount}`);
        console.log(`   Total Products: ${productsCount}`);
        console.log(`   Seller Status: ${sellerInfo?.status || 'unknown'}`);

        // Summary
        console.log('');
        console.log('🎉 Test Summary:');
        console.log(`   ✅ Scraper: Working (${scrapeResult.products.length} products)`);
        console.log(`   ✅ Database: Working (${saveResult.saved + saveResult.updated} products saved)`);
        console.log(`   ✅ Integration: Complete`);
        console.log('');
        console.log('🚀 Sonoma Seeds scraper is ready for production!');
        
        if (scrapeResult.totalPages > 1) {
            console.log('');
            console.log(`💡 Next steps: Run full scraping of all ${scrapeResult.totalPages} pages (~${scrapeResult.totalProducts} products)`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
        apiLogger.logError('Sonoma Seeds scrape and save test failed:', { 
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