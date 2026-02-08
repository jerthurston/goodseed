/**
 * 🚀 QUICK TEST RUNNER for True North Seed Bank Utils
 * 
 * Run this script to quickly test the problematic extractProductUrlsFromCatLink function
 */

import testExtractProductUrlsFromCatLink from './test-extractProductUrlsFromCatLink';

async function main() {
    console.log('🚀 Starting True North Seed Bank Utils Quick Test...\n');
    
    try {
        await testExtractProductUrlsFromCatLink();
        console.log('\n✅ Test completed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed:', error);
    }
}

main().catch(console.error);