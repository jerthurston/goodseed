/**
 * Inspect price selectors on Vancouver Seed Bank
 */

import { CheerioCrawler } from 'crawlee';

const TEST_URL = 'https://vancouverseedbank.ca/shop/jsf/epro-archive-products/';

async function inspectPrices() {
    console.log('🔍 Inspecting price elements on Vancouver Seed Bank\n');

    const crawler = new CheerioCrawler({
        async requestHandler({ $, request }) {
            console.log(`Analyzing: ${request.url}\n`);

            // Find first product card
            const $card = $('li.product.type-product').first();

            if ($card.length === 0) {
                console.log('❌ No product cards found!');
                return;
            }

            const productName = $card.find('h3.prod_titles a').text().trim();
            console.log(`Product: ${productName}\n`);

            // Try different price selectors
            const priceSelectors = [
                '.price',
                '.woocommerce-Price-amount',
                '.amount',
                'span.price',
                '.price ins .amount',
                '.price del .amount',
                'bdi',
                '.price bdi',
                '.woocommerce-Price-amount bdi',
            ];

            console.log('Testing price selectors:\n');

            priceSelectors.forEach(selector => {
                const $price = $card.find(selector);
                if ($price.length > 0) {
                    console.log(`✅ ${selector}`);
                    console.log(`   HTML: ${$price.html()}`);
                    console.log(`   Text: ${$price.text()}`);
                    console.log('');
                }
            });

            // Show full price HTML
            const $priceContainer = $card.find('.price').first();
            if ($priceContainer.length > 0) {
                console.log('Full price container HTML:');
                console.log($priceContainer.html());
                console.log('');
            }

            // Check all text in product card that contains '$' or number
            console.log('All elements with price-like content:');
            $card.find('*').each((_, el) => {
                const text = $(el).text().trim();
                if (text.match(/\$|CAD|\d+\.\d{2}/)) {
                    const tagName = el.tagName;
                    const classes = $(el).attr('class') || '';
                    console.log(`  ${tagName}.${classes}: ${text.substring(0, 100)}`);
                }
            });
        },
        maxRequestsPerMinute: 10,
    });

    await crawler.run([TEST_URL]);
}

inspectPrices().catch(console.error);
