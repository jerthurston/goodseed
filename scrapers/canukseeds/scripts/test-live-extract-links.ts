/**
 * Test script for Canuk Seeds live homepage category link extractor
 * 
 * Usage:
 * npx tsx scrapers/canukseeds/scripts/test-live-extract-links.ts
 */

import { extractCategoryLinksFromHomepage, extractCategoryLinksFromHeaderFile } from '../utils/extractCatLinkFromHeader';

async function testLiveExtractLinks(): Promise<void> {
    console.log('🧪 Testing Canuk Seeds Live Category Link Extractor...\n');
    
    try {
        console.log('🔄 Testing live homepage extraction...');
        const startTime = Date.now();
        
        // Extract links from live homepage
        const liveLinks = await extractCategoryLinksFromHomepage();
        
        const liveDuration = Date.now() - startTime;
        
        console.log('📊 Live Homepage Results:');
        console.log(`⏱️  Duration: ${liveDuration}ms`);
        console.log(`🔗 Total Links Found: ${liveLinks.length}\n`);
        
        // Compare với local file
        console.log('🔄 Testing local file extraction for comparison...');
        const localStartTime = Date.now();
        
        const localLinks = await extractCategoryLinksFromHeaderFile();
        
        const localDuration = Date.now() - localStartTime;
        
        console.log('📊 Local File Results:');
        console.log(`⏱️  Duration: ${localDuration}ms`);
        console.log(`🔗 Total Links Found: ${localLinks.length}\n`);
        
        // So sánh kết quả
        console.log('🔍 Comparison:');
        console.log(`📈 Performance: Live ${liveDuration}ms vs Local ${localDuration}ms`);
        console.log(`📊 Data freshness: Live is always up-to-date vs Local may be outdated`);
        
        if (liveLinks.length > 0) {
            console.log('\n📝 Live Category Links (First 10):');
            liveLinks.slice(0, 10).forEach((link, index) => {
                console.log(`${index + 1}. ${link}`);
            });
            
            if (liveLinks.length > 10) {
                console.log(`... and ${liveLinks.length - 10} more links`);
            }
        } else {
            console.log('\n⚠️  No links found from live homepage!');
        }
        
        // Kiểm tra differences
        const newLinks = liveLinks.filter(link => !localLinks.includes(link));
        const removedLinks = localLinks.filter(link => !liveLinks.includes(link));
        
        if (newLinks.length > 0) {
            console.log(`\n🆕 New links found (${newLinks.length}):`);
            newLinks.forEach(link => console.log(`+ ${link}`));
        }
        
        if (removedLinks.length > 0) {
            console.log(`\n❌ Links removed (${removedLinks.length}):`);
            removedLinks.forEach(link => console.log(`- ${link}`));
        }
        
        if (newLinks.length === 0 && removedLinks.length === 0) {
            console.log('\n✅ Live and local data are identical');
        }
        
        console.log('\n✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testLiveExtractLinks();