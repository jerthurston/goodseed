/**
 * Test script for SunWest Genetics scraper
 * 
 * Quick test to verify extractProductsFromHTML.ts is working correctly
 * Usage: pnpm tsx scrapers/sunwestgenetics/scripts/test-sunwest-scraper.ts
 */

import { CheerioCrawler } from 'crawlee';
import { apiLogger } from '@/lib/helpers/api-logger';
import { extractProductsFromHTML } from '@/scrapers/sunwestgenetics/utils/extractProductsFromHTML';
import { SUNWESTGENETICS_SELECTORS } from '@/scrapers/sunwestgenetics/core/selectors';

const TEST_URL = 'https://www.sunwestgenetics.com/shop/';
const BASE_URL = 'https://www.sunwestgenetics.com';

async function testSunWestScraper() {
    console.log('🧪 Testing SunWest Genetics Scraper...');
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
                const result = extractProductsFromHTML($, SUNWESTGENETICS_SELECTORS, BASE_URL);

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
                        console.log(`   THC Level: ${product.thcLevel || 'N/A'}`);
                        console.log(`   CBD Level: ${product.cbdLevel || 'N/A'}`);
                        console.log(`   Flowering: ${product.floweringTime || 'N/A'}`);
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
                console.log('Product cards found:', $(SUNWESTGENETICS_SELECTORS.productCard).length);
                console.log('Product links found:', $(SUNWESTGENETICS_SELECTORS.productLink).length);
                console.log('Product images found:', $(SUNWESTGENETICS_SELECTORS.productImage).length);
                console.log('Strain types found:', $(SUNWESTGENETICS_SELECTORS.strainType).length);
                console.log('THC levels found:', $(SUNWESTGENETICS_SELECTORS.thcLevel).length);
                console.log('CBD levels found:', $(SUNWESTGENETICS_SELECTORS.cbdLevel).length);
                console.log('Flowering times found:', $(SUNWESTGENETICS_SELECTORS.floweringTime).length);
                console.log('Variation inputs found:', $(SUNWESTGENETICS_SELECTORS.variationInputs).length);
                
                // Test pagination selectors
                console.log('\n📄 Pagination Tests:');
                console.log('Pagination container found:', $(SUNWESTGENETICS_SELECTORS.paginationContainer).length);
                console.log('Pagination items found:', $(SUNWESTGENETICS_SELECTORS.paginationItems).length);
                console.log('Next button found:', $(SUNWESTGENETICS_SELECTORS.nextPage).length);
                console.log('Current page found:', $(SUNWESTGENETICS_SELECTORS.currentPage).length);

                // Debug pagination structure
                const $paginationContainer = $(SUNWESTGENETICS_SELECTORS.paginationContainer);
                if ($paginationContainer.length > 0) {
                    console.log('\n🔍 Pagination Debug:');
                    
                    // Log the raw HTML structure (truncated)
                    const paginationHtml = $paginationContainer.html();
                    console.log('Raw pagination HTML (first 800 chars):');
                    console.log(paginationHtml?.substring(0, 800));
                    
                    console.log('\nTesting different selectors:');
                    console.log('.jet-filters-pagination__item:', $('.jet-filters-pagination__item').length);
                    console.log('.jet-filters-pagination__item[data-value]:', $('.jet-filters-pagination__item[data-value]').length);
                    console.log('.jet-filters-pagination__item:not(.prev-next):', $('.jet-filters-pagination__item:not(.prev-next)').length);
                    
                    // Try to find any elements inside pagination container
                    console.log('Items found in container:', $paginationContainer.find('*').length);
                    console.log('Direct children:', $paginationContainer.children().length);
                    
                    // Check if pagination is dynamically loaded
                    const allDivs = $paginationContainer.find('div');
                    console.log('All divs in container:', allDivs.length);
                    
                    allDivs.each((index, element) => {
                        const $div = $(element);
                        const classes = $div.attr('class');
                        const text = $div.text().trim();
                        if (classes && text) {
                            console.log(`   Div ${index + 1}: classes="${classes}" text="${text}"`);
                        }
                    });
                    
                } else {
                    console.log('   No pagination container found');
                }

                console.log('\n✅ Test completed successfully!');

            } catch (error) {
                console.error('❌ Test failed:', error);
                apiLogger.logError('Test scraper error:', { error });
            }
        },

        failedRequestHandler({ request, error }) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            apiLogger.logError('Request failed:', {
                url: request.url,
                error: errorMessage
            });
            console.error('❌ Request failed:', request.url, errorMessage);
        }
    });

    await crawler.run([TEST_URL]);
}

// Run the test
testSunWestScraper()
    .then(() => {
        console.log('🏁 Test script finished');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test script failed:', error);
        process.exit(1);
    });