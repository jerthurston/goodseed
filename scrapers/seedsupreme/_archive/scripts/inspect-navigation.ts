/**
 * Inspect Seed Supreme Homepage Navigation
 * Debug tool to find correct selectors for navigation menu
 */

import { CheerioCrawler } from 'crawlee';

async function main() {
    console.log('🔍 Inspecting Seed Supreme Homepage Navigation');
    console.log('='.repeat(60));

    const crawler = new CheerioCrawler({
        async requestHandler({ $, log }) {
            log.info('Analyzing page structure...\n');

            // Try different navigation selectors
            const selectors = [
                'nav',
                'nav.navigation',
                '.navigation',
                'header nav',
                '[role="navigation"]',
                '.nav-menu',
                '.main-menu',
                'ul.level0',
                '.menu',
                'header .menu',
            ];

            console.log('Testing Selectors:');
            console.log('-'.repeat(60));
            selectors.forEach(selector => {
                const $el = $(selector);
                console.log(`${selector.padEnd(30)} → Found: ${$el.length}`);
            });

            // Find all links in header
            console.log('\n📋 All Links in <header>:');
            console.log('-'.repeat(60));
            $('header a').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && text && href.endsWith('.html')) {
                    console.log(`${i + 1}. "${text}" → ${href}`);
                }
            });

            // Find all .html links
            console.log('\n🔗 All .html Links (Top 30):');
            console.log('-'.repeat(60));
            const htmlLinks: Array<{text: string; href: string}> = [];
            $('a[href$=".html"]').each((_, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && text && !href.includes('javascript')) {
                    htmlLinks.push({ text, href });
                }
            });

            // Deduplicate and show first 30
            const unique = Array.from(new Map(htmlLinks.map(l => [l.href, l])).values());
            unique.slice(0, 30).forEach((link, i) => {
                console.log(`${i + 1}. "${link.text}" → ${link.href}`);
            });

            // Check for common patterns
            console.log('\n🎯 Potential Seed Category Links:');
            console.log('-'.repeat(60));
            const seedPatterns = ['seed', 'feminized', 'autoflower', 'strain', 'thc', 'cbd'];
            const potentialCategories = unique.filter(link => {
                const combined = (link.text + link.href).toLowerCase();
                return seedPatterns.some(p => combined.includes(p));
            });

            potentialCategories.slice(0, 20).forEach((link, i) => {
                console.log(`${i + 1}. "${link.text}"`);
                console.log(`   → ${link.href}`);
            });

            console.log(`\n✅ Found ${potentialCategories.length} potential seed categories`);
        },
    });

    await crawler.run(['https://seedsupreme.com/']);
}

main().catch(console.error);
