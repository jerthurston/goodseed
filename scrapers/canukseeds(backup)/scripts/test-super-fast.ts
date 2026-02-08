import { SiteConfig } from '@/lib/factories/scraper-factory';
import { canukSeedScraper } from '../core/canukseedsScraper';
import CANUK_SEEDS_PRODUCT_SELECTORS from '../core/selectors';

/**
 * 🚀 SUPER FAST TEST - 2 pages only
 * Test nhanh với chỉ 2 phân trang để có kết quả ngay
 */

async function superFastTest() {
    console.log('🚀 SUPER FAST TEST - 2 Pages Only\n');
    
    const startTime = Date.now();
    
    try {
        // Setup siteConfig
        const siteConfig: SiteConfig = {
            name: 'Canuk Seeds',
            baseUrl: 'https://www.canukseeds.com',
            isImplemented: true,
            selectors: CANUK_SEEDS_PRODUCT_SELECTORS
        };

        // Source context - limit to 2 pages
        const sourceContext = {
            scrapingSourceUrl: 'https://www.canukseeds.com',
            sourceName: 'canukseeds-fast-test',
            dbMaxPage: 2  // Only 2 pages!
        };

        console.log('⚙️ Configuration:');
        console.log(`   🏃 Fast Mode: ON`);
        console.log(`   📄 Pages: 2 only`);
        console.log(`   ⏱️  Quick extraction mode`);
        console.log('');

        // Call scraper with startPage=1, endPage=2 for super fast mode
        const result = await canukSeedScraper(
            siteConfig,
            1,  // startPage  
            2,  // endPage - only 2 pages
            sourceContext
        );

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log('\n🎉 SUPER FAST RESULTS:');
        console.log('='.repeat(40));
        console.log(`⏱️  Total Time: ${duration.toFixed(1)}s`);
        console.log(`📦 Products: ${result.totalProducts}`);
        console.log(`📄 Pages: 2 only`);
        console.log(`⚡ Speed: ${(result.totalProducts / duration).toFixed(1)} products/sec`);
        
        // Show top 5 products
        console.log('\n🌿 Sample Results:');
        result.products.slice(0, 5).forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.name}`);
            console.log(`      → Type: ${product.seedType || 'unknown'}`);
            console.log(`      → THC: ${product.thcLevel || 'N/A'}`);
            console.log(`      → Pricing: ${product.pricings?.length || 0} options`);
        });

        console.log('\n✅ FAST TEST ASSESSMENT:');
        console.log('='.repeat(40));
        if (result.totalProducts > 0) {
            console.log(`🎯 SUCCESS! Got ${result.totalProducts} products in ${duration.toFixed(1)}s`);
            console.log(`📊 Success rate: ${((result.totalProducts / Math.max(result.totalProducts, 10)) * 100).toFixed(0)}%`);
            console.log(`⚡ Performance: EXCELLENT`);
        } else {
            console.log('❌ No products found');
        }

    } catch (error) {
        console.error('❌ FAST TEST FAILED:', error);
    } finally {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n⏱️  Test completed in ${totalTime}s`);
    }
}

// Run super fast test
superFastTest();