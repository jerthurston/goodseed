/**
 * Test Beaver Seed Product List Scraper
 * 
 * Test the complete scraper with jet-smart-filters pagination
 */

import { BeaverSeedProductListScraper } from '../core/beaver-product-list-scraper';
import { BEAVERSEED_PRODUCT_CARD_SELECTORS } from '../core/selector';
import { SiteConfig } from '@/lib/factories/scraper-factory';

async function testBeaverSeedScraper() {
    console.log('🧪 Testing Beaver Seed Product List Scraper...');
    
    // Configure site
    const siteConfig: SiteConfig = {
        name: 'Beaver Seed',
        baseUrl: 'https://beaverseed.com',
        selectors: BEAVERSEED_PRODUCT_CARD_SELECTORS,
        isImplemented: true
    };

    // Source context
    const sourceContext = {
        scrapingSourceUrl: 'https://beaverseed.com/shop/',
        sourceName: 'Beaver Seed Shop',
        dbMaxPage: 48 // From pagination HTML sample
    };

    try {
        const startTime = Date.now();
        
        console.log('📊 Testing with first 2 pages...');
        
        // Test mode: only crawl first 2 pages
        const result = await BeaverSeedProductListScraper(
            siteConfig,
            1,  // startPage
            2,  // endPage
            null, // fullSiteCrawl
            sourceContext
        );
        
        const duration = Date.now() - startTime;
        
        console.log('✅ Beaver Seed Scraper Test Results:');
        console.log(`📦 Total products: ${result.totalProducts}`);
        console.log(`📄 Total pages crawled: ${result.totalPages}`);
        console.log(`⏱️ Duration: ${duration}ms`);
        
        // Show first 5 products as examples
        console.log('🔍 Sample products:');
        result.products.slice(0, 5).forEach((product, index) => {
            console.log(`  ${index + 1}. ${product.name}`);
            console.log(`     URL: ${product.url}`);
            console.log(`     Type: ${product.cannabisType || 'N/A'}`);
            console.log(`     THC: ${product.thcLevel || 'N/A'}`);
            console.log(`     CBD: ${product.cbdLevel || 'N/A'}`);
            console.log(`     Rating: ${product.rating || 'N/A'} (${product.reviewCount || 0} reviews)`);
            console.log(`     Pricings: ${product.pricings?.length || 0} variations`);
            console.log('');
        });
        
        // Analyze field completeness
        const fieldStats = analyzeFieldCompleteness(result.products);
        console.log('📈 Field Completeness:');
        Object.entries(fieldStats).forEach(([field, percentage]) => {
            console.log(`  ${field}: ${percentage}%`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

function analyzeFieldCompleteness(products: any[]) {
    const fields = [
        'name', 'url', 'slug', 'imageUrl', 'cannabisType', 'badge',
        'rating', 'reviewCount', 'thcLevel', 'cbdLevel', 'floweringTime',
        'growingLevel', 'pricings'
    ];
    
    const stats: Record<string, string> = {};
    
    fields.forEach(field => {
        const filledCount = products.filter(p => {
            const value = p[field];
            if (Array.isArray(value)) return value.length > 0;
            return value !== undefined && value !== null && value !== '';
        }).length;
        
        const percentage = ((filledCount / products.length) * 100).toFixed(1);
        stats[field] = percentage;
    });
    
    return stats;
}

// Run test
testBeaverSeedScraper();