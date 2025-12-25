/**
 * Test extractProductsFromHTML with fixed pagination
 */

import 'dotenv/config';
import * as cheerio from 'cheerio';
import { extractProductsFromHTML } from '@/scrapers/vancouverseedbank/utils/extractProductsFromHTML';
import { VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS } from '@/scrapers/vancouverseedbank/core/selectors';

async function testExtractFunction() {
    console.log('🧪 Testing extractProductsFromHTML with fixed pagination');
    console.log('=======================================================');

    const testUrl = 'https://vancouverseedbank.ca/shop';
    
    try {
        console.log(`📡 Fetching: ${testUrl}`);
        
        const response = await fetch(testUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        console.log('\n🔧 Testing extractProductsFromHTML function...');
        
        const result = extractProductsFromHTML($, VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS, testUrl, 1 );
        
        console.log('\n📊 Results:');
        console.log(`Products found: ${result.products.length}`);
        console.log(`Max pages detected: ${result.maxPages}`);
        
        if (result.maxPages && result.maxPages > 1) {
            console.log(`\n✅ SUCCESS: Pagination detection working!`);
            console.log(`   Expected: ~154 pages`);
            console.log(`   Detected: ${result.maxPages} pages`);
        } else {
            console.log(`\n❌ FAILED: Pagination detection not working`);
        }
        
        console.log('\n📦 Sample products:');
        result.products.slice(0, 3).forEach((product, i) => {
            console.log(`  [${i + 1}] ${product.name}`);
            console.log(`      URL: ${product.url}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testExtractFunction().catch(console.error);