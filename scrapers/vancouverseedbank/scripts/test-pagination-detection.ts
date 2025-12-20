/**
 * Test Pagination Detection
 * 
 * Script to debug pagination detection issue
 */

import 'dotenv/config';
import * as cheerio from 'cheerio';
import { extractProductsFromHTML } from '@/scrapers/vancouverseedbank/utils/extractProductsFromHTML';
import { VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS } from '@/scrapers/vancouverseedbank/core/selectors';

async function testPaginationDetection() {
    console.log('🔍 Testing Pagination Detection');
    console.log('================================');

    const testUrl = 'https://vancouverseedbank.ca/shop';
    
    try {
        console.log(`📡 Fetching: ${testUrl}`);
        
        // Fetch HTML
        const response = await fetch(testUrl);
        const html = await response.text();
        
        // Load with Cheerio
        const $ = cheerio.load(html);
        
        console.log('\n🔍 Analyzing pagination elements...');
        
        // Check pagination container
        const paginationContainer = $('.jet-filters-pagination');
        console.log(`Pagination container found: ${paginationContainer.length > 0 ? '✅ Yes' : '❌ No'}`);
        
        if (paginationContainer.length > 0) {
            console.log('📄 Pagination container HTML:');
            console.log(paginationContainer.html()?.substring(0, 500) + '...');
            
            // Check pagination items với WooCommerce standard
            const pageNumbers = $('.page-numbers');
            console.log(`\n🔢 Found ${pageNumbers.length} page number elements:`);
            
            let maxPage = 0;
            pageNumbers.each((index, element) => {
                const $item = $(element);
                const href = $item.attr('href');
                const text = $item.text().trim();
                const isCurrent = $item.hasClass('current');
                
                console.log(`  [${index + 1}] text="${text}" href="${href}" current=${isCurrent}`);
                
                // Extract page number from href or text
                if (href && href.includes('/page/')) {
                    const match = href.match(/\/page\/(\d+)\//);
                    if (match) {
                        const pageNum = parseInt(match[1]);
                        if (pageNum > maxPage) maxPage = pageNum;
                    }
                } else if (/^\d+$/.test(text)) {
                    const pageNum = parseInt(text);
                    if (pageNum > maxPage) maxPage = pageNum;
                }
            });
            
            console.log(`\n🎯 Max page detected from .page-numbers: ${maxPage}`);
            
            // Test với result count
            const resultCount = $('.woocommerce-result-count').text();
            console.log(`\n📊 Result count text: "${resultCount}"`);
            
            // Extract total results 
            const totalMatch = resultCount.match(/of (\d+) results/);
            if (totalMatch) {
                const totalResults = parseInt(totalMatch[1]);
                const resultsPerPage = 16; // From "Showing 1–16"
                const calculatedMaxPages = Math.ceil(totalResults / resultsPerPage);
                console.log(`📊 Calculated: ${totalResults} total / ${resultsPerPage} per page = ${calculatedMaxPages} pages`);
            }
            
            // Test extract function
            console.log('\n🧪 Testing extractProductsFromHTML...');
            const result = extractProductsFromHTML($, VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS);
            
            console.log(`Products found: ${result.products.length}`);
            console.log(`Max pages detected: ${result.maxPages}`);
            
        } else {
            console.log('\n❌ No pagination container found!');
            console.log('🔍 Looking for alternative selectors...');
            
            // Try different selectors
            const alternatives = [
                '.pagination',
                '.page-numbers',
                '.nav-links',
                '.paginate_links',
                '[class*="pagination"]',
                '[class*="page"]'
            ];
            
            alternatives.forEach(selector => {
                const found = $(selector);
                if (found.length > 0) {
                    console.log(`✅ Found with selector "${selector}": ${found.length} elements`);
                    console.log(`   HTML: ${found.first().html()?.substring(0, 200)}...`);
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testPaginationDetection().catch(console.error);