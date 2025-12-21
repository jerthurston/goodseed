/**
 * Detailed URL Analysis
 */

import 'dotenv/config';
import * as cheerio from 'cheerio';

async function analyzeUrls() {
    console.log('🔍 Detailed URL Analysis');
    console.log('========================');

    const urls = [
        'https://vancouverseedbank.ca/shop/',
        'https://vancouverseedbank.ca/shop?page=1',  // From logs - working
        'https://vancouverseedbank.ca/shop/page/2/',  // Standard WooCommerce  
        'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/pagenum/2/',
    ];

    for (const url of urls) {
        try {
            console.log(`\n🌐 URL: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.ok) {
                const html = await response.text();
                const $ = cheerio.load(html);
                
                // Count products
                const products = $('li.product.type-product');
                console.log(`   Products found: ${products.length}`);
                
                // Check pagination  
                const pageNumbers = $('.page-numbers');
                console.log(`   Pagination elements: ${pageNumbers.length}`);
                
                if (pageNumbers.length > 0) {
                    // Extract max page from pagination
                    let maxPage = 0;
                    pageNumbers.each((_, element) => {
                        const $item = $(element);
                        const href = $item.attr('href');
                        if (href && href.includes('/page/')) {
                            const match = href.match(/\/page\/(\d+)\//);
                            if (match) {
                                const pageNum = parseInt(match[1]);
                                if (pageNum > maxPage) maxPage = pageNum;
                            }
                        }
                    });
                    console.log(`   Max page detected: ${maxPage}`);
                }
                
                // Show result count
                const resultCount = $('.woocommerce-result-count').text().trim();
                if (resultCount) {
                    console.log(`   Result count: "${resultCount}"`);
                }
                
            } else {
                console.log(`   Status: ${response.status} ${response.statusText}`);
            }
            
        } catch (error) {
            console.error(`   Error:`, error.message);
        }
    }
}

analyzeUrls().catch(console.error);