/**
 * Simple Pagination Test for Vancouver Seed Bank
 */

import 'dotenv/config';
import * as cheerio from 'cheerio';

async function testPaginationDetection() {
    console.log('🔍 Vancouver Seed Bank Pagination Test');
    console.log('======================================');

    const testUrl = 'https://vancouverseedbank.ca/shop';
    
    try {
        console.log(`📡 Fetching: ${testUrl}`);
        
        const response = await fetch(testUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        console.log('\n🔍 WooCommerce Pagination Analysis:');
        
        // Check .page-numbers
        const pageNumbers = $('.page-numbers');
        console.log(`Found ${pageNumbers.length} .page-numbers elements`);
        
        let maxPage = 0;
        pageNumbers.each((index, element) => {
            const $item = $(element);
            const href = $item.attr('href');
            const text = $item.text().trim();
            const isCurrent = $item.hasClass('current');
            
            console.log(`  [${index + 1}] text="${text}" href="${href || 'none'}" current=${isCurrent}`);
            
            // Extract page number from href
            if (href && href.includes('/page/')) {
                const match = href.match(/\/page\/(\d+)\//);
                if (match) {
                    const pageNum = parseInt(match[1]);
                    if (pageNum > maxPage) maxPage = pageNum;
                }
            }
            
            // Extract from text if numeric
            if (/^\d+$/.test(text)) {
                const pageNum = parseInt(text);
                if (pageNum > maxPage) maxPage = pageNum;
            }
        });
        
        console.log(`\n🎯 Max page from pagination: ${maxPage}`);
        
        // Check result count
        const resultCount = $('.woocommerce-result-count').text();
        console.log(`\n📊 Result count: "${resultCount}"`);
        
        // Calculate from total results
        const totalMatch = resultCount.match(/of (\d+[\d,]*) results/);
        if (totalMatch) {
            const totalResults = parseInt(totalMatch[1].replace(',', ''));
            const resultsPerPage = 16;
            const calculatedPages = Math.ceil(totalResults / resultsPerPage);
            console.log(`📊 Total products: ${totalResults}`);
            console.log(`📊 Per page: ${resultsPerPage}`);
            console.log(`📊 Calculated pages: ${calculatedPages}`);
        }
        
        // Look for "Next" button
        const nextButton = $('.page-numbers').filter(function() {
            return $(this).text().includes('›') || $(this).text().toLowerCase().includes('next');
        });
        console.log(`\n➡️ Next button found: ${nextButton.length > 0 ? '✅ Yes' : '❌ No'}`);
        if (nextButton.length > 0) {
            console.log(`   Next URL: ${nextButton.attr('href')}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testPaginationDetection().catch(console.error);