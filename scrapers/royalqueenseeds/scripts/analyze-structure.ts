/**
 * Royal Queen Seeds - Detailed HTML Structure Analysis
 * 
 * Usage:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/analyze-structure.ts
 */

import { load, type Cheerio, type Element } from 'cheerio';

async function main() {
    console.log('🔍 Royal Queen Seeds - Detailed Structure Analysis');
    console.log('='.repeat(70));

    const url = 'https://www.royalqueenseeds.com/us/33-feminized-cannabis-seeds';

    console.log(`\n📍 Fetching: ${url}\n`);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });

    const html = await response.text();
    const $ = load(html);

    console.log('✅ HTML loaded, analyzing structure...\n');

    // Find all elements with "product" in class name
    const productElements = $('[class*="product"]');
    console.log(`📦 Elements with "product" in class: ${productElements.length}`);

    // Get unique classes
    const productClasses = new Set<string>();
    productElements.each((_, el) => {
        const classes = $(el).attr('class')?.split(' ') || [];
        classes.forEach(c => {
            if (c.includes('product')) {
                productClasses.add(c);
            }
        });
    });

    console.log('\n📋 Unique product-related classes:');
    Array.from(productClasses).slice(0, 20).forEach(c => {
        const count = $(`.${c}`).length;
        console.log(`  .${c} → ${count} elements`);
    });

    // Check for specific PrestaShop patterns
    console.log('\n🛒 PrestaShop Standard Patterns:');
    const psSelectors = {
        '.product-miniature': $('.product-miniature').length,
        '.js-product': $('.js-product').length,
        '.js-product-miniature': $('.js-product-miniature').length,
        'article.product-miniature': $('article.product-miniature').length,
        '.products .item': $('.products .item').length,
        '#products .item': $('#products .item').length,
        '[data-id-product]': $('[data-id-product]').length,
    };

    for (const [selector, count] of Object.entries(psSelectors)) {
        if (count > 0) {
            console.log(`  ✅ ${selector}: ${count}`);
        } else {
            console.log(`  ❌ ${selector}: 0`);
        }
    }

    // Analyze .item elements (we know there are 367)
    console.log('\n🔎 Analyzing .item elements:');
    const items = $('.item');
    console.log(`Total .item elements: ${items.length}`);

    // Get parent containers
    const itemParents = new Set<string>();
    items.each((_, el) => {
        const parent = $(el).parent();
        const parentClass = parent.attr('class') || parent[0]?.name || 'unknown';
        itemParents.add(parentClass);
    });

    console.log('\nParent containers of .item:');
    Array.from(itemParents).slice(0, 10).forEach(p => {
        console.log(`  ${p}`);
    });

    // Find items that look like product cards
    console.log('\n📦 Looking for product-like .item elements...');
    let productLikeCount = 0;
    let firstProductItem: Cheerio<Element> | null = null;

    items.each((_, el) => {
        const $item = $(el);
        const hasLink = $item.find('a').length > 0;
        const hasImage = $item.find('img').length > 0;
        const hasPrice = $item.text().match(/[\$€£]\s*\d+/) !== null;

        if (hasLink && hasImage && hasPrice) {
            productLikeCount++;
            if (!firstProductItem) {
                firstProductItem = $item;
            }
        }
    });

    console.log(`Found ${productLikeCount} items with link + image + price`);

    if (firstProductItem) {
        console.log('\n📋 First product-like item structure:');
        console.log('─'.repeat(70));

        const $first = firstProductItem;

        // Product name
        const name = $first.find('h3, h2, h4, .product-name, [class*="title"]').first().text().trim();
        console.log(`\nProduct Name: "${name}"`);
        console.log(`  Selector used: h3, h2, h4, .product-name`);

        // Product link
        const link = $first.find('a').first().attr('href');
        console.log(`\nProduct Link: "${link}"`);
        console.log(`  Selector used: a`);

        // Product image
        const img = $first.find('img').first().attr('src');
        console.log(`\nProduct Image: "${img?.substring(0, 80)}..."`);
        console.log(`  Selector used: img`);

        // Price
        const priceElements = $first.find('[class*="price"], .price, .cost');
        console.log(`\nPrice elements found: ${priceElements.length}`);
        priceElements.each((i: number, el: Element) => {
            const text = $(el).text().trim();
            const classes = $(el).attr('class');
            console.log(`  [${i + 1}] .${classes}: "${text}"`);
        });

        // Check for THC, genetics, etc.
        const characteristics = $first.find('[class*="thc"], [class*="characteristics"], [class*="info"]');
        if (characteristics.length > 0) {
            console.log(`\nCharacteristics found: ${characteristics.length}`);
            characteristics.each((i: number, el: Element) => {
                const text = $(el).text().trim();
                const classes = $(el).attr('class');
                if (text) {
                    console.log(`  [${i + 1}] .${classes}: "${text.substring(0, 50)}"`);
                }
            });
        }

        // Show HTML structure
        console.log('\n📄 HTML structure:');
        console.log('─'.repeat(70));
        const html = $first.html()?.substring(0, 1000);
        console.log(html + '...');
    }

    // Check for pagination
    console.log('\n\n🔢 Pagination Analysis:');
    console.log('─'.repeat(70));

    const paginationSelectors = {
        '.pagination': $('.pagination').length,
        '.page-list': $('.page-list').length,
        '.pages': $('.pages').length,
        '[class*="pag"]': $('[class*="pag"]').length,
    };

    for (const [selector, count] of Object.entries(paginationSelectors)) {
        if (count > 0) {
            console.log(`✅ ${selector}: ${count} found`);
            const $elem = $(selector);
            const text = $elem.first().text().trim().substring(0, 200);
            console.log(`   Text: "${text}"`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ Analysis complete!');
}

main().catch(console.error);
