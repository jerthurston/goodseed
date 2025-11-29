/**
 * Inspect Seed Supreme HTML Structure
 * 
 * This script helps identify CSS selectors for scraping
 * Run: pnpm tsx scripts/test/inspect-seedsupreme-html.ts
 */

import { log } from '@/lib/utils';
import { CheerioCrawler } from 'crawlee';

interface SampleData {
    name?: string;
    href?: string;
    price?: string;
    imageUrl?: string;
    variety?: string;
    thc?: string;
    cbd?: string;
    flowering?: string;
    genetic?: string;
}

interface InspectionResult {
    url: string;
    type: 'category' | 'product';
    selectors: {
        found: string[];
        notFound: string[];
    };
    sampleData?: SampleData;
}

async function inspectCategoryPage(url: string): Promise<InspectionResult> {
    log(`\n=== Inspecting Category Page ===`);
    log(`URL: ${url}`);

    let inspectionResult: InspectionResult | null = null;

    const crawler = new CheerioCrawler({
        async requestHandler({ request, $, log: crawlerLog }) {
            crawlerLog.info(`Inspecting: ${request.url}`);

            // Test different product card selectors
            const PRODUCT_SELECTORS = [
                '.product-item',
                '.product-card',
                '.product',
                '.item',
                'li.product',
                'div[class*="product"]',
                'article',
            ];

            const found: string[] = [];
            const notFound: string[] = [];

            log(`\n--- Testing Product Card Selectors ---`);
            for (const selector of PRODUCT_SELECTORS) {
                const count = $(selector).length;
                if (count > 0) {
                    found.push(selector);
                    log(`✅ ${selector}: Found ${count} elements`);
                } else {
                    notFound.push(selector);
                    log(`❌ ${selector}: Not found`);
                }
            }

            // Try to extract sample product data
            const sampleData: SampleData = {};
            if (found.length > 0) {
                const firstProductSelector = found[0];
                const $firstProduct = $(firstProductSelector).first();

                log(`\n--- Sample Product Data (using ${firstProductSelector}) ---`);

                // Try to find product name
                const nameCandidates = [
                    '.product-name',
                    '.product-item-name',
                    'h2',
                    'h3',
                    'a[class*="name"]',
                    '.name',
                ];

                const name = nameCandidates
                    .map(sel => $firstProduct.find(sel).first().text().trim())
                    .find(text => text.length > 0);

                // Try to find product link
                const linkCandidates = [
                    'a.product-item-link',
                    'a.product-link',
                    'a[href*=".html"]',
                    'a',
                ];

                const href = linkCandidates
                    .map(sel => $firstProduct.find(sel).first().attr('href'))
                    .find(h => h && h.length > 0);

                // Try to find price
                const priceCandidates = [
                    '.price',
                    '[class*="price"]',
                    '.special-price',
                    '.regular-price',
                ];

                const price = priceCandidates
                    .map(sel => $firstProduct.find(sel).first().text().trim())
                    .find(text => text.includes('$'));

                // Try to find image
                const imgCandidates = [
                    'img.product-image-photo',
                    'img[class*="product"]',
                    'img',
                ];

                const imgSrc = imgCandidates
                    .map(sel => $firstProduct.find(sel).first().attr('src') || $firstProduct.find(sel).first().attr('data-src'))
                    .find(src => src && src.length > 0);

                sampleData.name = name || 'NOT FOUND';
                sampleData.href = href || 'NOT FOUND';
                sampleData.price = price || 'NOT FOUND';
                sampleData.imageUrl = imgSrc || 'NOT FOUND';

                log(`Name: ${sampleData.name}`);
                log(`URL: ${sampleData.href}`);
                log(`Price: ${sampleData.price}`);
                log(`Image: ${sampleData.imageUrl}`);

                // Print first product HTML for manual inspection
                log(`\n--- First Product HTML (first 500 chars) ---`);
                const productHtml = $firstProduct.html()?.substring(0, 500);
                log(productHtml || 'No HTML');
            } else {
                log('⚠️ No products found with any selector');
            }

            // Check for pagination
            log(`\n--- Pagination ---`);
            const paginationSelectors = [
                '.pages-item-next a',
                '.pagination-next',
                'a[rel="next"]',
                'a:contains("Next")',
            ];

            for (const sel of paginationSelectors) {
                const $el = $(sel);
                if ($el.length > 0) {
                    log(`✅ ${sel}: Found (href: ${$el.attr('href')})`);
                } else {
                    log(`❌ ${sel}: Not found`);
                }
            }

            inspectionResult = {
                url: request.url,
                type: 'category',
                selectors: { found, notFound },
                sampleData,
            };
        },
        maxRequestsPerCrawl: 1,
    });

    await crawler.run([url]);

    return inspectionResult!;
}

async function inspectProductPage(url: string): Promise<InspectionResult> {
    log(`\n=== Inspecting Product Detail Page ===`);
    log(`URL: ${url}`);

    let inspectionResult: InspectionResult | null = null;

    const crawler = new CheerioCrawler({
        async requestHandler({ request, $, log: crawlerLog }) {
            crawlerLog.info(`Inspecting: ${request.url}`);

            const found: string[] = [];
            const notFound: string[] = [];

            // Test pack option selectors - Seed Supreme uses table layout, not dropdown
            log(`\n--- Pack Options ---`);
            const packSelectors = [
                'table tr:contains("x")', // Table rows with pack sizes (6x, 12x, etc.)
                'table tbody tr', // All table body rows
                'tr:has(td:contains("x"))', // Rows with cells containing "x"
                'td:contains("Special Price")', // Cells with prices
                'select option', // Fallback: dropdown (if exists)
                '.pack-selector option',
            ];

            const foundSelectors: { packOptions?: string } = {};

            for (const sel of packSelectors) {
                const elements = $(sel);
                const count = elements.length;

                if (count > 0) {
                    found.push(sel);
                    log(`✅ ${sel}: Found ${count} elements`);

                    // Try to extract pack data
                    const packData: string[] = [];
                    elements.slice(0, 5).each((i, el) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const text = $(el as any).text().trim().replace(/\s+/g, ' ');
                        // Look for pack patterns: "6x", "12x", "24x", "36x"
                        if (text.match(/\d+x/i)) {
                            packData.push(text.substring(0, 100));
                        }
                    });

                    if (packData.length > 0) {
                        log(`   Pack data extracted:`);
                        packData.forEach((p, i) => log(`   ${i + 1}. ${p}`));
                        if (!foundSelectors.packOptions) {
                            foundSelectors.packOptions = sel;
                        }
                    }
                } else {
                    notFound.push(sel);
                }
            }

            if (!foundSelectors.packOptions) {
                log(`⚠️ No pack options found with any selector`);
            }

            // Test specification selectors - look for table structure with label + value
            log(`\n--- Specifications ---`);
            const specSelectors = {
                variety: [
                    'td:contains("Variety") + td', // Next sibling cell
                    'td:contains("Variety")',
                    '.variety',
                    '[class*="variety"]',
                ],
                thc: [
                    'td:contains("THC") + td',
                    'td:contains("THC content") + td',
                    'td:contains("THC")',
                    '[class*="thc"]',
                ],
                cbd: [
                    'td:contains("CBD") + td',
                    'td:contains("CBD")',
                    '[class*="cbd"]',
                ],
                flowering: [
                    'td:contains("Flowering") + td',
                    'td:contains("Flowering Type") + td',
                    'td:contains("Flowering")',
                    '[class*="flowering"]',
                ],
                genetic: [
                    'td:contains("Genetic") + td',
                    'td:contains("heritage") + td',
                    '.genetic-profile',
                ],
            };

            const sampleData: SampleData = {};

            for (const [key, selectors] of Object.entries(specSelectors)) {
                for (const sel of selectors) {
                    const text = $(sel).first().text().trim();
                    if (text.length > 0) {
                        found.push(sel);
                        log(`✅ ${key} (${sel}): ${text.substring(0, 100)}`);
                        if (key === 'variety') sampleData.variety = text;
                        if (key === 'thc') sampleData.thc = text;
                        if (key === 'cbd') sampleData.cbd = text;
                        if (key === 'flowering') sampleData.flowering = text;
                        if (key === 'genetic') sampleData.genetic = text;
                        break;
                    }
                }
            }

            // Check for price
            log(`\n--- Price ---`);
            const priceSelectors = [
                '.price',
                '.special-price',
                '[class*="price"]',
            ];

            for (const sel of priceSelectors) {
                const text = $(sel).first().text().trim();
                if (text.includes('$')) {
                    found.push(sel);
                    log(`✅ ${sel}: ${text}`);
                    sampleData.price = text;
                    break;
                }
            }

            // Check for product name
            log(`\n--- Product Name ---`);
            const nameSelectors = [
                'h1',
                '.product-name',
                '[class*="product"][class*="name"]',
            ];

            for (const sel of nameSelectors) {
                const text = $(sel).first().text().trim();
                if (text.length > 0) {
                    found.push(sel);
                    log(`✅ ${sel}: ${text}`);
                    sampleData.name = text;
                    break;
                }
            }

            inspectionResult = {
                url: request.url,
                type: 'product',
                selectors: { found, notFound },
                sampleData,
            };
        },
        maxRequestsPerCrawl: 1,
    });

    await crawler.run([url]);

    return inspectionResult!;
}

async function main() {
    log('='.repeat(60));
    log('Seed Supreme HTML Structure Inspector');
    log('='.repeat(60));

    try {
        // Inspect category page
        const categoryResult = await inspectCategoryPage(
            'https://seedsupreme.com/feminized-seeds.html'
        );

        log(`\n\n${'='.repeat(60)}`);

        // Inspect product detail page
        const productResult = await inspectProductPage(
            'https://seedsupreme.com/best-sellers-feminized-seed-mix.html'
        );

        // Summary
        log(`\n\n${'='.repeat(60)}`);
        log('=== SUMMARY ===');
        log('='.repeat(60));

        log(`\nCategory Page:`);
        log(`  Found selectors: ${categoryResult.selectors.found.length}`);
        log(`  Recommended: ${categoryResult.selectors.found[0] || 'NONE'}`);

        log(`\nProduct Detail Page:`);
        log(`  Found selectors: ${productResult.selectors.found.length}`);
        log(`  Recommended pack selector: ${productResult.selectors.found.find(s => s.includes('option')) || 'NONE'}`);

        log(`\n✅ Inspection complete!`);
        log(`\nNext steps:`);
        log(`1. Review the selectors above`);
        log(`2. Update scrapers/seedsupreme/seedsupreme-scraper.ts with correct selectors`);
        log(`3. Run test scraper: pnpm tsx scripts/test/test-seedsupreme-category.ts`);

    } catch (error) {
        console.error('Inspection failed:', error);
        process.exit(1);
    }
}

main();
