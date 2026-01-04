import CANUK_SEEDS_PRODUCT_SELECTORS from '../core/selectors';
import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler.bk';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';

/**
 * Test robots.txt compliance cho Canuk Seeds
 */
async function testRobotsTxtCompliance() {
    console.log('🧪 Testing Canuk Seeds Robots.txt Compliance...\n');
    
    const baseUrl = 'https://www.canukseeds.com';
    const testUrls = [
        'https://www.canukseeds.com',
        'https://www.canukseeds.com/buy-canuk-seeds/feminized-seeds',
        'https://www.canukseeds.com/2046-fast-version-feminized-seeds-canuk-seeds'
    ];
    
    // Setup polite crawler
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE,
        minDelay: 2000,
        maxDelay: 5000
    });
    
    console.log('🤖 Testing robots.txt compliance...\n');
    
    try {
        for (const url of testUrls) {
            console.log(`🔍 Testing URL: ${url}`);
            
            // Check if URL is allowed
            const isAllowed = await politeCrawler.isAllowed(url);
            console.log(`  ✅ Allowed: ${isAllowed}`);
            
            // Get crawl delay
            const crawlDelay = await politeCrawler.getCrawlDelay(url);
            console.log(`  ⏱️  Crawl delay: ${crawlDelay}ms`);
            
            console.log(''); // Empty line
        }
        
        console.log('🎉 Robots.txt compliance test completed!');
        console.log('\n📊 Summary:');
        console.log('- All URLs checked for robots.txt compliance');
        console.log('- Crawl delays retrieved for polite crawling');
        console.log('- Ready to implement in main scraper');
        
    } catch (error) {
        console.error('❌ Robots.txt test failed:', error);
    }
}

testRobotsTxtCompliance();