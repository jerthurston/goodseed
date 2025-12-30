/**
 * Test script for Sonoma Seeds scraper
 * 
 * Quick test to verify extractProductsFromHTML.ts is working correctly
 * Usage: pnpm tsx scrapers/sonomaseeds/script/test-sonoma-scraper.ts
 */

import { CheerioCrawler } from 'crawlee';
import { apiLogger } from '@/lib/helpers/api-logger';
import { extractProductsFromHTML } from '@/scrapers/sonomaseeds/utils/extractProductsFromHTML';
import { SONOMASEEDS_PRODUCT_CARD_SELECTORS } from '@/scrapers/sonomaseeds/core/selectors';

const TEST_URL = 'https://www.sonomaseeds.com/shop/';
const BASE_URL = 'https://www.sonomaseeds.com';

async function testSonomaSeedsScraper() {
    console.log('🧪 Testing Sonoma Seeds Scraper...');
    console.log('📍 Target URL:', TEST_URL);
    console.log('');

    const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: 1,
        requestHandlerTimeoutSecs: 30,
        navigationTimeoutSecs: 30,

        async requestHandler({ $, request }) {
            try {
                apiLogger.info('📥 Crawling page:', { url: request.loadedUrl });

                // Test extractProductsFromHTML function
                const result = extractProductsFromHTML($, SONOMASEEDS_PRODUCT_CARD_SELECTORS, BASE_URL);

                console.log('✅ Extraction Results:');
                console.log('📊 Total products found:', result.products.length);
                console.log('📄 Max pages detected:', result.maxPages);
                console.log('');

                // Display first 3 products for verification
                if (result.products.length > 0) {
                    console.log('🔍 Sample Products:');
                    result.products.slice(0, 3).forEach((product, index) => {
                        console.log(`\n${index + 1}. ${product.name}`);
                        console.log(`   URL: ${product.url}`);
                        console.log(`   Image: ${product.imageUrl || 'N/A'}`);
                        console.log(`   Cannabis Type: ${product.cannabisType || 'N/A'}`);
                        console.log(`   Seed Type: ${product.seedType || 'N/A'}`);
                        console.log(`   THC Level: ${product.thcLevel || 'N/A'}`);
                        console.log(`   THC Min/Max: ${product.thcMin || 'N/A'} - ${product.thcMax || 'N/A'}`);
                        console.log(`   CBD Level: ${product.cbdLevel || 'N/A'}`);
                        console.log(`   CBD Min/Max: ${product.cbdMin || 'N/A'} - ${product.cbdMax || 'N/A'}`);
                        console.log(`   Flowering: ${product.floweringTime || 'N/A'}`);
                        console.log(`   Growing Level: ${product.growingLevel || 'N/A'}`);
                        console.log(`   Rating: ${product.rating || 'N/A'}`);
                        console.log(`   Review Count: ${product.reviewCount || 'N/A'}`);
                        console.log(`   Badge: ${product.badge || 'N/A'}`);
                        
                        if (product.pricings && product.pricings.length > 0) {
                            console.log(`   Pricing variations:`);
                            product.pricings.forEach(pricing => {
                                console.log(`     - ${pricing.packSize} seeds: $${pricing.totalPrice} ($${pricing.pricePerSeed.toFixed(2)}/seed)`);
                            });
                        }
                    });
                }

                // Test specific selectors
                console.log('\n🔧 Selector Tests:');
                console.log('Product cards found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.productCard).length);
                console.log('Product links found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.productLink).length);
                console.log('Product images found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.productImage).length);
                console.log('Strain types found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.strainType).length);
                console.log('THC levels found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.thcLevel).length);
                console.log('CBD levels found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.cbdLevel).length);
                console.log('Flowering times found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.floweringTime).length);
                console.log('Growing levels found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.growingLevel).length);
                console.log('Variation inputs found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.variationInputs).length);
                console.log('Pack sizes found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.packSizes).length);
                console.log('Buy buttons found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.buyButton).length);
                
                // Test pagination selectors
                console.log('\n📄 Pagination Tests:');
                console.log('Pagination container found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.paginationContainer).length);
                console.log('Pagination items found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.paginationItems).length);
                console.log('Next page button found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.nextPage).length);
                console.log('Current page found:', $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.currentPage).length);

                // Debug pagination structure
                const $paginationContainer = $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.paginationContainer);
                if ($paginationContainer.length > 0) {
                    console.log('\n🔍 Pagination Debug:');
                    
                    // Log the raw HTML structure (truncated)
                    const paginationHtml = $paginationContainer.html();
                    console.log('Raw pagination HTML (first 800 chars):');
                    console.log(paginationHtml?.substring(0, 800));
                    
                    console.log('\nTesting different WooCommerce selectors:');
                    console.log('.page-numbers:', $('.page-numbers').length);
                    console.log('.page-numbers[href]:', $('.page-numbers[href]').length);
                    console.log('.page-numbers.current:', $('.page-numbers.current').length);
                    console.log('.wp-pagenavi:', $('.wp-pagenavi').length);
                    
                    // Try to find any pagination elements
                    console.log('Items found in container:', $paginationContainer.find('*').length);
                    console.log('Direct children:', $paginationContainer.children().length);
                    
                    // Check for WooCommerce pagination classes
                    const allLinks = $('a[href*="/page/"]');
                    console.log('All page links found:', allLinks.length);
                    
                    allLinks.each((index, element) => {
                        const $link = $(element);
                        const href = $link.attr('href');
                        const text = $link.text().trim();
                        const classes = $link.attr('class');
                        if (index < 5) { // Show only first 5
                            console.log(`   Link ${index + 1}: href="${href}" text="${text}" classes="${classes}"`);
                        }
                    });
                    
                } else {
                    console.log('   No pagination container found');
                    
                    // Search for any pagination indicators
                    console.log('   Searching for alternative pagination...');
                    console.log('   .woocommerce-pagination:', $('.woocommerce-pagination').length);
                    console.log('   .pagination:', $('.pagination').length);
                    console.log('   [class*="page"]:', $('[class*="page"]').length);
                }

                // Debug product structure for first product
                const $firstProduct = $(SONOMASEEDS_PRODUCT_CARD_SELECTORS.productCard).first();
                if ($firstProduct.length > 0) {
                    console.log('\n🔍 First Product Card Debug:');
                    console.log('Product card HTML (first 1000 chars):');
                    console.log($firstProduct.html()?.substring(0, 1000));
                    
                    // Test individual selectors on first product
                    console.log('\nIndividual selector tests on first product:');
                    console.log('  Product name:', $firstProduct.find(SONOMASEEDS_PRODUCT_CARD_SELECTORS.productName).text().trim());
                    console.log('  Product link:', $firstProduct.find(SONOMASEEDS_PRODUCT_CARD_SELECTORS.productLink).attr('href'));
                    console.log('  Image src:', $firstProduct.find(SONOMASEEDS_PRODUCT_CARD_SELECTORS.productImage).attr('src'));
                    console.log('  Image data-src:', $firstProduct.find(SONOMASEEDS_PRODUCT_CARD_SELECTORS.productImage).attr('data-src'));
                    console.log('  Strain type:', $firstProduct.find(SONOMASEEDS_PRODUCT_CARD_SELECTORS.strainType).text().trim());
                    console.log('  Price display:', $firstProduct.find(SONOMASEEDS_PRODUCT_CARD_SELECTORS.priceDisplay).text().trim());
                }

                console.log('\n✅ Test completed successfully!');

            } catch (error) {
                console.error('❌ Test failed:', error);
                apiLogger.logError('Test scraper error', error as Error, {
                    message: 'Error during Sonoma Seeds scraper test'
                });
            }
        },

        failedRequestHandler({ request, error }) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            apiLogger.logError('Request failed', error as Error, {
                url: request.url,
                message: errorMessage
            });
            console.error('❌ Request failed:', request.url, errorMessage);
        }
    });

    await crawler.run([TEST_URL]);
}

// Run the test
testSonomaSeedsScraper()
    .then(() => {
        console.log('🏁 Test script finished');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test script failed:', error);
        process.exit(1);
    });