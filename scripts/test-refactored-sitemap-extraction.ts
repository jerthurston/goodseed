/**
 * Test refactored BC Bud Depot sitemap extraction with Crawlee utility
 */

import { extractProductUrlsFromSitemap } from '../scrapers/bcbuddepot/utils/extractProductUrlsFromSitemap';
import { apiLogger } from '../lib/helpers/api-logger';

async function testRefactoredSitemapExtraction() {
    const sitemapUrl = 'https://bcbuddepot.com/sitemap_index.xml';
    
    console.log('🧪 Testing refactored sitemap extraction with Crawlee utility...');
    
    try {
        const startTime = Date.now();
        
        const productUrls = await extractProductUrlsFromSitemap(sitemapUrl);
        
        const duration = Date.now() - startTime;
        
        console.log('✅ Refactored Sitemap Extraction Results:');
        console.log(`📊 Total URLs found: ${productUrls.length}`);
        console.log(`⏱️ Duration: ${duration}ms`);
        
        // Show first 5 URLs as examples
        console.log('🔍 Sample URLs:');
        productUrls.slice(0, 5).forEach((url, index) => {
            console.log(`  ${index + 1}. ${url}`);
        });
        
        // Validate URL patterns
        const validPatternCount = productUrls.filter(url => 
            url.match(/\/marijuana-seeds\/[^\/]+\/[^\/]+\/?$/)
        ).length;
        
        console.log(`🎯 Valid pattern URLs: ${validPatternCount}/${productUrls.length} (${((validPatternCount/productUrls.length) * 100).toFixed(1)}%)`);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        apiLogger.logError('Test failed:', { error });
    }
}

// Run test
testRefactoredSitemapExtraction();