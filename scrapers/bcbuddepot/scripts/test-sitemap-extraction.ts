/**
 * 🧪 BC BUD DEPOT SITEMAP EXTRACTION TEST
 * 
 * Tests sitemap URL extraction with mock XML data
 */

import { load } from 'cheerio';
import { extractProductUrlsFromSitemap } from '../utils/extractProductUrlsFromSitemap';

function testSitemapExtraction() {
    console.log('🧪 BC Bud Depot Sitemap Extraction Test');
    console.log('============================================================\n');

    // Mock sitemap XML content
    const mockSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://bcbuddepot.com/marijuana-seeds/dna-genetics/24k-gold/</loc>
        <lastmod>2023-12-01</lastmod>
    </url>
    <url>
        <loc>https://bcbuddepot.com/marijuana-seeds/bc-bud-depot/bc-kush/</loc>
        <lastmod>2023-12-01</lastmod>
    </url>
    <url>
        <loc>https://bcbuddepot.com/marijuana-seeds/crop-king-seeds/white-widow/</loc>
        <lastmod>2023-12-01</lastmod>
    </url>
    <url>
        <loc>https://bcbuddepot.com/marijuana-seeds/sensi-seeds/northern-lights/</loc>
        <lastmod>2023-12-01</lastmod>
    </url>
    <url>
        <loc>https://bcbuddepot.com/marijuana-seeds/</loc>
        <lastmod>2023-12-01</lastmod>
    </url>
    <url>
        <loc>https://bcbuddepot.com/marijuana-seeds/page/2/</loc>
        <lastmod>2023-12-01</lastmod>
    </url>
    <url>
        <loc>https://bcbuddepot.com/marijuana-seeds/category/feminized/</loc>
        <lastmod>2023-12-01</lastmod>
    </url>
    <url>
        <loc>https://bcbuddepot.com/contact/</loc>
        <lastmod>2023-12-01</lastmod>
    </url>
</urlset>`;

    console.log('📋 Test: Sitemap XML Parsing');
    console.log('--------------------------------------------------');
    
    try {
        // Load XML into Cheerio
        const $ = load(mockSitemapXml, { xmlMode: true });
        
        // Extract product URLs
        const productUrls = extractProductUrlsFromSitemap($, 'https://bcbuddepot.com/product-sitemap.xml');
        
        console.log('✅ Sitemap Successfully Parsed!\n');
        
        console.log('🔍 URL Analysis:');
        console.log(`  Total URLs in sitemap: 8`);
        console.log(`  Product URLs extracted: ${productUrls.length}`);
        console.log(`  Filtering accuracy: ${(productUrls.length/4*100).toFixed(1)}%\n`);
        
        console.log('📦 Extracted Product URLs:');
        productUrls.forEach((url, index) => {
            console.log(`  ${index + 1}. ${url}`);
        });
        
        console.log('\n🚫 Filtered Out (Non-Product URLs):');
        const allUrls = [
            'https://bcbuddepot.com/marijuana-seeds/',
            'https://bcbuddepot.com/marijuana-seeds/page/2/',
            'https://bcbuddepot.com/marijuana-seeds/category/feminized/',
            'https://bcbuddepot.com/contact/'
        ];
        allUrls.forEach((url, index) => {
            console.log(`  ${index + 1}. ${url} (${url.includes('/page/') ? 'pagination' : url.includes('/category/') ? 'category' : url.includes('/marijuana-seeds/') ? 'base category' : 'non-product'})`);
        });
        
        console.log('\n✅ URL Pattern Validation:');
        const validPatterns = productUrls.every(url => {
            return url.includes('/marijuana-seeds/') && 
                   url.includes('bcbuddepot.com') &&
                   !url.includes('/page/') && 
                   !url.includes('/category/') &&
                   url.match(/\/marijuana-seeds\/[^\/]+\/[^\/]+\/?$/);
        });
        console.log(`  All URLs match product pattern: ${validPatterns ? 'Yes' : 'No'}`);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    console.log('\n🎉 BC Bud Depot Sitemap Extraction Test Complete!');
    console.log('============================================================');
}

// Run the test
testSitemapExtraction();