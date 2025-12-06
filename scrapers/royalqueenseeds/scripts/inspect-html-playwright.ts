/**
 * Inspect Royal Queen Seeds HTML Structure (Playwright version)
 * 
 * Uses browser automation to handle JavaScript-rendered content
 * 
 * Usage:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/inspect-html-playwright.ts
 */

import { PlaywrightCrawler } from 'crawlee';

async function main() {
    console.log('🔍 Royal Queen Seeds - HTML Inspector (Playwright)');
    console.log('='.repeat(60));

    const crawler = new PlaywrightCrawler({
        async requestHandler({ page, request, log }) {
            log.info(`Inspecting: ${request.url}`);

            // Wait for page to load
            await page.waitForLoadState('networkidle');

            // Take screenshot for debugging
            await page.screenshot({ path: 'rqs-page.png', fullPage: false });
            log.info('Screenshot saved: rqs-page.png');

            // Try different product card selectors
            const selectors = [
                '.products-grid .product-item',
                '.product-listing .item',
                '.product-item',
                '.products .product',
                'article.product',
                '.product-card',
                '[class*="product"]',
                'article',
                '.item',
            ];

            console.log('\n🔍 Testing Product Card Selectors:');
            for (const selector of selectors) {
                const count = await page.locator(selector).count();
                if (count > 0) {
                    console.log(`  ✅ ${selector}: ${count} items`);
                } else {
                    console.log(`  ❌ ${selector}: 0 items`);
                }
            }

            // Find the best selector
            let bestSelector = '';
            let maxCount = 0;
            for (const selector of selectors) {
                const count = await page.locator(selector).count();
                if (count > maxCount && count < 200) { // Reasonable product count
                    maxCount = count;
                    bestSelector = selector;
                }
            }

            if (maxCount === 0) {
                console.log('\n❌ No product cards found');

                // Debug: Show page structure
                const bodyHTML = await page.locator('body').innerHTML();
                console.log('\n📄 Page HTML structure (first 3000 chars):');
                console.log(bodyHTML.substring(0, 3000));

                // Check for common e-commerce platforms
                const platform = await page.evaluate(() => {
                    const win = window as Window & {
                        Shopify?: unknown;
                        Magento?: unknown;
                        PrestaShop?: unknown;
                        WooCommerce?: unknown;
                    };
                    if (win.Shopify) return 'Shopify';
                    if (win.Magento) return 'Magento';
                    if (win.PrestaShop) return 'PrestaShop';
                    if (win.WooCommerce) return 'WooCommerce';
                    return 'Unknown';
                });
                console.log(`\n🛒 Detected platform: ${platform}`);

                return;
            }

            console.log(`\n✅ Best selector: ${bestSelector} (${maxCount} products)`);

            // Analyze first product
            const firstProduct = page.locator(bestSelector).first();
            console.log('\n📦 First Product Analysis:');

            // Try to find product name
            const nameSelectors = ['h2', 'h3', 'h4', '.product-name', '.title', '[class*="name"]', 'a'];
            console.log('\n  Product Name:');
            for (const sel of nameSelectors) {
                const text = await firstProduct.locator(sel).first().textContent().catch(() => '');
                if (text && text.trim()) {
                    console.log(`    ✅ ${sel}: "${text.trim().substring(0, 50)}"`);
                    break;
                }
            }

            // Try to find product link
            console.log('\n  Product Link:');
            const link = await firstProduct.locator('a').first().getAttribute('href').catch(() => '');
            if (link) {
                console.log(`    ✅ href: "${link}"`);
            }

            // Try to find product image
            console.log('\n  Product Image:');
            const img = await firstProduct.locator('img').first().getAttribute('src').catch(() => '');
            if (img) {
                console.log(`    ✅ src: "${img}"`);
            }

            // Try to find price
            const priceSelectors = ['.price', '[class*="price"]', '.cost', '[class*="cost"]'];
            console.log('\n  Price:');
            for (const sel of priceSelectors) {
                const text = await firstProduct.locator(sel).first().textContent().catch(() => '');
                if (text && text.trim()) {
                    console.log(`    ✅ ${sel}: "${text.trim()}"`);
                    break;
                }
            }

            // Check pagination
            console.log('\n🔢 Pagination:');
            const paginationSelectors = [
                '.pagination',
                '.pages',
                '[class*="pag"]',
                'nav[aria-label*="pagination"]',
            ];

            for (const sel of paginationSelectors) {
                const count = await page.locator(sel).count();
                if (count > 0) {
                    const text = await page.locator(sel).first().textContent();
                    console.log(`  ✅ ${sel}: Found`);
                    console.log(`     Text: "${text?.trim().substring(0, 100)}"`);
                    break;
                }
            }

            // Summary
            console.log('\n' + '='.repeat(60));
            console.log('📋 RECOMMENDED SELECTORS:');
            console.log('='.repeat(60));
            console.log(`productCard: '${bestSelector}'`);
            console.log('\n💡 Next step: Update scrapers/royalqueenseeds/core/selectors.ts');
        },

        headless: true,
        maxRequestsPerMinute: 10,
    });

    const testUrl = 'https://www.royalqueenseeds.com/us/33-feminized-cannabis-seeds';
    console.log(`\n🌐 Test URL: ${testUrl}`);
    console.log('');

    await crawler.run([testUrl]);
}

main().catch(console.error);
