/**
 * Test script for Canuk Seeds category link extractor
 * 
 * Usage:
 * npx tsx scrapers/canukseeds/scripts/test-extract-links.ts
 */

import { extractCategoryLinksFromHeaderFile } from '../utils/extractCatLinkFromHeader';

async function testExtractLinks(): Promise<void> {
    console.log('🧪 Testing Canuk Seeds Category Link Extractor...\n');
    
    try {
        const startTime = Date.now();
        
        // Extract links from header file (now async)
        const links = await extractCategoryLinksFromHeaderFile();
        
        const duration = Date.now() - startTime;
        
        console.log('📊 Extraction Results:');
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`🔗 Total Links Found: ${links.length}\n`);
        
        if (links.length > 0) {
            console.log('📝 Category Links:');
            links.forEach((link, index) => {
                console.log(`${index + 1}. ${link}`);
            });
        } else {
            console.log('⚠️  No links found!');
        }
        
        console.log('\n✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testExtractLinks();