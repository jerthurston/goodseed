/**
 * Inspect Royal Queen Seeds HTML Structure
 * 
 * Usage:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/inspect-html.ts
 */

import { CheerioCrawler } from 'crawlee';

async function main() {
    console.log('🔍 Royal Queen Seeds - HTML Inspector');
    console.log('='.repeat(60));

    const crawler = new CheerioCrawler({
        async requestHandler({ $, request, log }) {
            log.info(`Inspecting: ${request.url}`);

            // Try different product card selectors
            const selectors = [
                '.products-grid .product-item',
                '.product-listing .item',
                '.product-item',
                '.products .product',
                'article.product',
                '.product-card',
            ];

            console.log('\n🔍 Testing Product Card Selectors:');
            for (const selector of selectors) {
                const count = $(selector).length;
                console.log(`  ${selector}: ${count} items`);
            }

            // Find the best selector (one with products)
            let bestSelector = '';
            let maxCount = 0;
            for (const selector of selectors) {
                const count = $(selector).length;
                if (count > maxCount) {
                    maxCount = count;
                    bestSelector = selector;
                }
            }

            if (maxCount === 0) {
                console.log('\n❌ No product cards found with standard selectors');
                console.log('Page HTML structure:');
                console.log($('body').html()?.substring(0, 2000));
                return;
            }

            console.log(`\n✅ Best selector: ${bestSelector} (${maxCount} products)`);

            // Analyze first product
            const $firstProduct = $(bestSelector).first();
            console.log('\n📦 First Product Analysis:');

            // Product name selectors
            const nameSelectors = [
                '.product-name',
                'h2',
                'h3',
                '.title',
                'a[title]',
            ];

            console.log('\n  Name selectors:');
            for (const sel of nameSelectors) {
                const text = $firstProduct.find(sel).first().text().trim();
                if (text) {
                    console.log(`    ${sel}: "${text}"`);
                }
            }

            // Product link
            const linkSelectors = [
                'a.product-link',
                '.product-name a',
                'a[href*="/"]',
                'a',
            ];

            console.log('\n  Link selectors:');
            for (const sel of linkSelectors) {
                const href = $firstProduct.find(sel).first().attr('href');
                if (href) {
                    console.log(`    ${sel}: "${href}"`);
                }
            }

            // Product image
            const imageSelectors = [
                'img.product-image',
                '.product-photo img',
                'img',
            ];

            console.log('\n  Image selectors:');
            for (const sel of imageSelectors) {
                const src = $firstProduct.find(sel).first().attr('src');
                if (src) {
                    console.log(`    ${sel}: "${src}"`);
                }
            }

            // Price
            const priceSelectors = [
                '.price',
                '.product-price',
                '[class*="price"]',
                '.cost',
            ];

            console.log('\n  Price selectors:');
            for (const sel of priceSelectors) {
                const text = $firstProduct.find(sel).first().text().trim();
                if (text) {
                    console.log(`    ${sel}: "${text}"`);
                }
            }

            // THC Level
            const thcSelectors = [
                '[class*="thc"]',
                '.thc-content',
                '[class*="THC"]',
                '.characteristics',
            ];

            console.log('\n  THC selectors:');
            for (const sel of thcSelectors) {
                const text = $firstProduct.find(sel).first().text().trim();
                if (text) {
                    console.log(`    ${sel}: "${text}"`);
                }
            }

            // Pagination
            console.log('\n🔢 Pagination Analysis:');
            const paginationSelectors = [
                '.pagination',
                '.pages',
                '[class*="pag"]',
                '.next',
            ];

            for (const sel of paginationSelectors) {
                const count = $(sel).length;
                if (count > 0) {
                    console.log(`  ${sel}: ${count} elements`);
                    const text = $(sel).first().text().trim().substring(0, 100);
                    console.log(`    Text: "${text}"`);
                }
            }

            // Check for next page link
            const nextSelectors = [
                '.pagination .next a',
                '.pages .next a',
                'a[rel="next"]',
                'a:contains("Next")',
            ];

            console.log('\n  Next page link:');
            for (const sel of nextSelectors) {
                const href = $(sel).first().attr('href');
                if (href) {
                    console.log(`    ${sel}: "${href}"`);
                }
            }

            // Summary
            console.log('\n' + '='.repeat(60));
            console.log('📋 RECOMMENDED SELECTORS:');
            console.log('='.repeat(60));
            console.log(`productCard: '${bestSelector}'`);

            // Find best name selector
            const nameText = $firstProduct.find('h2').first().text().trim() ||
                $firstProduct.find('h3').first().text().trim() ||
                $firstProduct.find('.product-name').first().text().trim();
            if (nameText) {
                console.log(`productName: 'h2' or 'h3' or '.product-name'`);
            }

            // Find best link selector
            const linkHref = $firstProduct.find('a').first().attr('href');
            if (linkHref) {
                console.log(`productLink: 'a' (first link in card)`);
            }

            console.log('\n💡 Next step: Update scrapers/royalqueenseeds/core/selectors.ts');
        },
        maxRequestsPerMinute: 10,
    });

    // Test URL provided by user
    const testUrl = 'https://www.royalqueenseeds.com/us/33-feminized-cannabis-seeds';

    console.log(`\n🌐 Test URL: ${testUrl}`);
    console.log('');

    await crawler.run([testUrl]);
}

main().catch(console.error);
