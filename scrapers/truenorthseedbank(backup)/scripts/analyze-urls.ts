/**
 * 🔍 URL ANALYSIS - Check what URLs are being extracted
 */

import { SimplePoliteCrawler } from '@/lib/utils/polite-crawler';
import { ACCEPTLANGUAGE, USERAGENT } from '@/scrapers/(common)/constants';
import { extractProductUrlsFromCatLink } from '../utils/extractProductUrlsFromCatLink';

async function analyzeExtractedUrls() {
    console.log('🔍 ANALYZING EXTRACTED URLs\n');

    const baseUrl = 'https://www.truenorthseedbank.com';
    
    const politeCrawler = new SimplePoliteCrawler({
        userAgent: USERAGENT,
        acceptLanguage: ACCEPTLANGUAGE,
        minDelay: 1000,
        maxDelay: 2000
    });

    const robotsRules = await politeCrawler.parseRobots(baseUrl);
    
    // Test with the exact URL from logs
    const testUrl = "https://www.truenorthseedbank.com/cannabis-seeds/regular-seeds";
    
    console.log(`🌐 Extracting from: ${testUrl}\n`);
    const productUrls = await extractProductUrlsFromCatLink(testUrl, 1, robotsRules);
    
    console.log(`📊 Total URLs found: ${productUrls.length}\n`);
    
    // Analyze the URLs
    const validUrls: string[] = [];
    const invalidUrls: { url: string; reason: string }[] = [];
    
    productUrls.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
        
        // Check if URL is valid product URL
        if (url.includes('#') && url.endsWith('#')) {
            invalidUrls.push({ url, reason: 'Fragment only (#)' });
        } else if (url.includes('#reviews')) {
            invalidUrls.push({ url, reason: 'Fragment link (#reviews)' });
        } else if (!url.includes('/product') && !url.includes('-seeds')) {
            invalidUrls.push({ url, reason: 'Not a product URL' });
        } else if (url === baseUrl + '/#') {
            invalidUrls.push({ url, reason: 'Homepage fragment' });
        } else {
            validUrls.push(url);
        }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ VALID PRODUCT URLs: ${validUrls.length}`);
    validUrls.forEach((url, i) => {
        console.log(`   ${i + 1}. ${url}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`❌ INVALID URLs: ${invalidUrls.length}`);
    invalidUrls.forEach(({ url, reason }, i) => {
        console.log(`   ${i + 1}. ${reason}: ${url}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`   Total extracted: ${productUrls.length}`);
    console.log(`   Valid products: ${validUrls.length}`);
    console.log(`   Invalid/filtered: ${invalidUrls.length}`);
    console.log(`   Success rate: ${((validUrls.length / productUrls.length) * 100).toFixed(1)}%`);
}

analyzeExtractedUrls().catch(console.error);