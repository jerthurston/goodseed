/**
 * Check pagination structure
 */

import { load } from 'cheerio';

async function main() {
    const url = 'https://www.royalqueenseeds.com/us/34-autoflowering-cannabis-seeds';

    console.log('🔍 Checking pagination structure...\n');

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });

    const html = await response.text();
    const $ = load(html);

    // Check for pagination
    console.log('📋 Pagination elements:');

    const paginationSelectors = [
        '.pagination',
        'ul.pagination',
        '.page-list',
        '.paginator',
        '[class*="pag"]',
    ];

    paginationSelectors.forEach(selector => {
        const count = $(selector).length;
        if (count > 0) {
            console.log(`\n✅ ${selector}: ${count} found`);
            const $elem = $(selector).first();
            console.log(`   HTML: ${$elem.html()?.substring(0, 500)}`);
        }
    });

    // Check for next page link
    console.log('\n\n🔍 Looking for "next" page link:');

    const nextSelectors = [
        '.pagination .next a',
        '.pagination li.next a',
        'ul.pagination li.pagination_next a',
        'a[rel="next"]',
        'a.next',
        'a:contains("Next")',
        'a:contains("›")',
        'a:contains("»")',
    ];

    nextSelectors.forEach(selector => {
        const $elem = $(selector).first();
        if ($elem.length > 0) {
            console.log(`\n✅ ${selector}:`);
            console.log(`   href: ${$elem.attr('href')}`);
            console.log(`   text: ${$elem.text()}`);
            console.log(`   HTML: ${$elem.html()}`);
        }
    });

    // Check total pages
    console.log('\n\n📊 Page numbers:');
    const pageLinks = $('.pagination a, ul.pagination a');
    pageLinks.each((i, el) => {
        const $link = $(el);
        const text = $link.text().trim();
        const href = $link.attr('href');
        if (text && href) {
            console.log(`  [${i + 1}] "${text}" → ${href}`);
        }
    });
}

main().catch(console.error);
