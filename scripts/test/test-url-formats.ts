/**
 * Test Vancouver Seed Bank URL formats
 */

import 'dotenv/config';

async function testUrlFormats() {
    console.log('🧪 Testing Vancouver Seed Bank URL Formats');
    console.log('==========================================');

    const urls = [
        'https://vancouverseedbank.ca/shop/',  // Page 1
        'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/pagenum/2/',  // Page 2
        'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/pagenum/154/',  // Page 154
    ];

    for (const url of urls) {
        try {
            console.log(`\n📡 Testing: ${url}`);
            
            const response = await fetch(url);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const html = await response.text();
                
                // Quick check for products
                const hasProducts = html.includes('li.product.type-product');
                console.log(`   Has products: ${hasProducts ? '✅ Yes' : '❌ No'}`);
                
                // Quick check for pagination
                const hasPagination = html.includes('page-numbers');
                console.log(`   Has pagination: ${hasPagination ? '✅ Yes' : '❌ No'}`);
                
                // Extract page info
                const match = html.match(/Showing \d+–\d+ of (\d+[\d,]*) results/);
                if (match) {
                    console.log(`   Total products found in text: ${match[1]}`);
                }
                
            } else {
                console.log(`   ❌ Failed to load`);
            }
            
        } catch (error) {
            console.error(`   ❌ Error:`, error);
        }
    }
}

testUrlFormats().catch(console.error);