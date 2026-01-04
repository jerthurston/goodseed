import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';
import { extractCategoryLinksFromHomepage } from '../utils/extractCatLinkFromHeader';

/**
 * Test extractCategoryLinksFromHomepage với robots.txt compliance
 */
async function testExtractCatLinksWithRobots() {
    console.log('🧪 Testing extractCategoryLinksFromHomepage with robots.txt compliance...\n');
    
    const baseUrl = 'https://www.canukseeds.com';
    
    // Setup polite crawler
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE,
        minDelay: 2000,
        maxDelay: 5000
    });
    
    try {
        console.log('📋 Step 1: Parse robots.txt rules');
        const robotsRules = await politeCrawler.parseRobots(baseUrl);
        console.log(`✅ Parsed robots.txt - crawl delay: ${robotsRules.crawlDelay}ms`);
        
        console.log('\n🌐 Step 2: Extract category links với robots.txt compliance');
        const startTime = Date.now();
        
        const categoryLinks = await extractCategoryLinksFromHomepage(baseUrl, robotsRules);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('\n📊 RESULTS:');
        console.log('='.repeat(60));
        console.log(`✅ Total category links extracted: ${categoryLinks.length}`);
        console.log(`⏱️ Extraction duration: ${duration}ms`);
        console.log(`🤖 User-Agent used: ${robotsRules.userAgent}`);
        
        console.log('\n📋 Sample category links:');
        categoryLinks.slice(0, 10).forEach((link, index) => {
            console.log(`   ${index + 1}. ${link}`);
        });
        
        if (categoryLinks.length > 10) {
            console.log(`   ... và ${categoryLinks.length - 10} links khác`);
        }
        
        // Verify robots.txt compliance
        console.log('\n🔍 ROBOTS.TXT COMPLIANCE VERIFICATION:');
        console.log('='.repeat(60));
        
        let blockedCount = 0;
        let allowedCount = 0;
        
        for (const link of categoryLinks) {
            const linkPath = new URL(link).pathname;
            
            // Kiểm tra với disallowed paths
            const isBlocked = robotsRules.disallowedPaths.some(disallowedPath => {
                return linkPath === disallowedPath || linkPath.startsWith(disallowedPath);
            });
            
            if (isBlocked) {
                blockedCount++;
                console.log(`❌ BLOCKED link found: ${link}`);
            } else {
                allowedCount++;
            }
        }
        
        console.log(`✅ Allowed links: ${allowedCount}`);
        console.log(`❌ Blocked links: ${blockedCount}`);
        
        if (blockedCount === 0) {
            console.log('🎉 PERFECT! All extracted links comply with robots.txt');
        } else {
            console.log('⚠️ WARNING: Some links violate robots.txt rules');
        }
        
        // Test với robots.txt delay
        if (robotsRules.crawlDelay > 0) {
            console.log(`\n⏱️ Verifying crawl delay compliance: ${robotsRules.crawlDelay}ms`);
            console.log('   Expected: Function should apply delay before crawling');
            console.log('   Actual: Check logs above for "Applying robots.txt crawl delay"');
        }
        
        console.log('\n🎯 Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error testing extractCategoryLinksFromHomepage:', error);
    }
}

testExtractCatLinksWithRobots();