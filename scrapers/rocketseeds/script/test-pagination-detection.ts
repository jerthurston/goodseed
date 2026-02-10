/**
 * 🧪 DEBUG PAGINATION DETECTION
 * Test to understand why we detect 39 pages instead of 51
 */

import { CheerioCrawler, RequestQueue } from 'crawlee';

async function testPaginationDetection() {
    console.log('🧪 Testing Pagination Detection');
    console.log('============================================================\n');

    const testUrl = 'https://rocketseeds.com/shop?swoof=1&product_brand=rocketseeds';
    
    const requestQueue = await RequestQueue.open('test-pagination');
    await requestQueue.addRequest({ url: testUrl });

    const crawler = new CheerioCrawler({
        requestQueue,
        maxConcurrency: 1,
        async requestHandler({ $, request, log }) {
            log.info(`Testing URL: ${request.url}`);

            // Check result count text
            const resultCountText = $('.woocommerce-result-count').text();
            console.log('\n📊 Result Count Text:', resultCountText);

            // Parse total products
            const totalMatch = resultCountText.match(/of\s+(\d+)\s+results?/i);
            if (totalMatch) {
                const totalProducts = parseInt(totalMatch[1], 10);
                console.log(`   Total Products: ${totalProducts}`);
                console.log(`   Calculated Pages (÷16): ${Math.ceil(totalProducts / 16)}`);
                console.log(`   Calculated Pages (÷12): ${Math.ceil(totalProducts / 12)}`);
            }

            // Check pagination structure
            const paginationHTML = $('.woocommerce-pagination').html();
            console.log('\n🔍 Pagination HTML exists:', !!paginationHTML);

            // Find all page links
            const pageNumbers: number[] = [];
            $('.page-numbers:not(.prev):not(.next):not(.current)').each((_, element) => {
                const pageText = $(element).text().trim();
                if (pageText !== '…' && pageText !== '...' && pageText !== '....') {
                    const pageNum = parseInt(pageText, 10);
                    if (!isNaN(pageNum)) {
                        pageNumbers.push(pageNum);
                    }
                }
            });

            console.log('\n📄 Page Numbers Found:', pageNumbers);
            console.log(`   Min: ${Math.min(...pageNumbers)}`);
            console.log(`   Max: ${Math.max(...pageNumbers)}`);
            console.log(`   Count: ${pageNumbers.length}`);

            // Check current page
            const currentPageText = $('.page-numbers.current').text().trim();
            console.log(`\n📍 Current Page: ${currentPageText}`);

            // Count products on this page
            const productCards = $('.slidermn_best_seller_in').length;
            console.log(`\n🛒 Products on this page: ${productCards}`);

            // Final detection
            const maxPageFromLinks = Math.max(...pageNumbers, 1);
            const totalProducts = totalMatch ? parseInt(totalMatch[1], 10) : 0;
            const calculatedPages = totalProducts > 0 ? Math.ceil(totalProducts / productCards) : 0;
            
            console.log('\n🎯 Detection Results:');
            console.log(`   Method 1 (Page Links): ${maxPageFromLinks} pages`);
            console.log(`   Method 3 (Result Count): ${calculatedPages} pages`);
            console.log(`   Final: ${Math.max(maxPageFromLinks, calculatedPages)} pages`);
        }
    });

    await crawler.run();
}

testPaginationDetection().catch(console.error);
