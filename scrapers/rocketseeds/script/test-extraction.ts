/**
 * 🧪 TEST EXTRACTION FROM PRODUCT DETAIL PAGE
 * 
 * Test extractProductFromDetailHTML with a real product URL
 */

import { CheerioCrawler } from 'crawlee';
import { extractProductFromDetailHTML } from '../utils/extractProductFromDetailHTML';
import { ROCKETSEEDS_PRODUCT_CARD_SELECTORS } from '../core/selector';

const TEST_URL = 'https://rocketseeds.com/product/fritter-cake-feminized-seeds/';

async function testExtraction() {
    console.log('🚀 Starting extraction test...');
    console.log(`📍 Testing URL: ${TEST_URL}\n`);

    const crawler = new CheerioCrawler({
        async requestHandler({ $, request }) {
            console.log('✅ Page loaded successfully');
            console.log(`📄 HTML length: ${$.html().length} characters\n`);

            // Check if key elements exist
            console.log('🔍 Checking key selectors:');
            console.log(`  - Product name (${ROCKETSEEDS_PRODUCT_CARD_SELECTORS.productName}): ${$(ROCKETSEEDS_PRODUCT_CARD_SELECTORS.productName).length} found`);
            console.log(`  - Product image (${ROCKETSEEDS_PRODUCT_CARD_SELECTORS.productImage}): ${$(ROCKETSEEDS_PRODUCT_CARD_SELECTORS.productImage).length} found`);
            console.log(`  - Strain type (${ROCKETSEEDS_PRODUCT_CARD_SELECTORS.strainType}): ${$(ROCKETSEEDS_PRODUCT_CARD_SELECTORS.strainType).length} found`);
            console.log(`  - THC level (${ROCKETSEEDS_PRODUCT_CARD_SELECTORS.thcLevel}): ${$(ROCKETSEEDS_PRODUCT_CARD_SELECTORS.thcLevel).length} found`);
            console.log(`  - CBD level (${ROCKETSEEDS_PRODUCT_CARD_SELECTORS.cbdLevel}): ${$(ROCKETSEEDS_PRODUCT_CARD_SELECTORS.cbdLevel).length} found`);
            console.log(`  - Genetics (${ROCKETSEEDS_PRODUCT_CARD_SELECTORS.genetics}): ${$(ROCKETSEEDS_PRODUCT_CARD_SELECTORS.genetics).length} found`);
            console.log(`  - Price rows (${ROCKETSEEDS_PRODUCT_CARD_SELECTORS.priceDisplay}): ${$(ROCKETSEEDS_PRODUCT_CARD_SELECTORS.priceDisplay).length} found\n`);

            // Check what's in the h1
            const h1Text = $('h1').text().trim();
            console.log(`📝 H1 text: "${h1Text}"`);
            
            // Check product_title class specifically
            const productTitleText = $('h1.product_title').text().trim();
            console.log(`📝 H1.product_title text: "${productTitleText}"`);
            
            // Check entry-title class
            const entryTitleText = $('h1.entry-title').text().trim();
            console.log(`📝 H1.entry-title text: "${entryTitleText}"`);
            
            // Check combined selector
            const combinedText = $('h1.product_title.entry-title').text().trim();
            console.log(`📝 H1.product_title.entry-title text: "${combinedText}"\n`);

            // Check for specification_individual divs
            const specDivs = $('.specification_individual');
            console.log(`🔍 Found ${specDivs.length} specification_individual divs`);
            if (specDivs.length > 0) {
                console.log('📋 Specification divs content:');
                specDivs.each((index, element) => {
                    const $el = $(element);
                    const img = $el.find('img').attr('src');
                    const text = $el.find('.specification_individual_text span').text().trim();
                    console.log(`  ${index + 1}. Image: ${img?.substring(img.lastIndexOf('/') + 1) || 'none'} | Text: "${text}"`);
                });
                console.log('');
            }

            // Check pricing table
            const priceRows = $('.pvt-tr');
            console.log(`💰 Found ${priceRows.length} price rows (.pvt-tr)`);
            if (priceRows.length > 0) {
                console.log('💰 Price rows content:');
                priceRows.each((index, row) => {
                    const $row = $(row);
                    const packText = $row.find('td[data-title="Packs"]').text().trim();
                    const priceText = $row.find('td[data-title="Price"]').text().trim();
                    console.log(`  ${index + 1}. Packs: "${packText}" | Price: "${priceText}"`);
                });
                console.log('');
            }

            // Now try extraction
            console.log('🎯 Attempting extraction with extractProductFromDetailHTML...\n');
            
            const siteConfig = {
                name: 'Rocket Seeds',
                selectors: ROCKETSEEDS_PRODUCT_CARD_SELECTORS,
                baseUrl: 'https://rocketseeds.com',
                isImplemented: true,
            };

            const product = extractProductFromDetailHTML($, siteConfig, request.url);

            if (product) {
                console.log('✅ EXTRACTION SUCCESS!');
                console.log('=====================================\n');
                console.log(JSON.stringify(product, null, 2));
            } else {
                console.log('❌ EXTRACTION FAILED - returned null');
            }
        },
        maxRequestsPerMinute: 10,
    });

    await crawler.run([TEST_URL]);
}

testExtraction().catch(console.error);
