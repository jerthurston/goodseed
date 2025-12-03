/**
 * Royal Queen Seeds - API/Network Inspector
 * 
 * Check if the site uses API calls to load products
 * 
 * Usage:
 *   pnpm tsx scrapers/royalqueenseeds/scripts/check-api.ts
 */

async function main() {
    console.log('🔍 Royal Queen Seeds - API Inspector');
    console.log('='.repeat(60));

    const url = 'https://www.royalqueenseeds.com/us/33-feminized-cannabis-seeds';

    console.log(`\n📍 Fetching: ${url}`);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    });

    const html = await response.text();

    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📏 HTML Length: ${html.length} chars`);

    // Check for common patterns
    console.log('\n🔍 Analyzing content...');

    const checks = {
        'PrestaShop': html.includes('prestashop') || html.includes('PrestaShop'),
        'React/Vue App': html.includes('__NEXT_DATA__') || html.includes('app.js') || html.includes('main.js'),
        'Product JSON-LD': html.includes('"@type":"Product"'),
        'Product microdata': html.includes('itemtype="http://schema.org/Product"'),
        'AJAX products': html.includes('ajax') && html.includes('product'),
        'API endpoint': html.match(/api.*products/i) !== null,
    };

    console.log('\n📋 Detection Results:');
    for (const [check, result] of Object.entries(checks)) {
        console.log(`  ${result ? '✅' : '❌'} ${check}`);
    }

    // Try to find product data in JSON
    console.log('\n🔎 Searching for JSON data...');

    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (jsonLdMatches && jsonLdMatches.length > 0) {
        console.log(`\n✅ Found ${jsonLdMatches.length} JSON-LD scripts`);

        jsonLdMatches.slice(0, 2).forEach((match, i) => {
            try {
                const jsonText = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
                const data = JSON.parse(jsonText);
                console.log(`\n  [${i + 1}] Type: ${data['@type']}`);
                if (data['@type'] === 'Product' || data['@type'] === 'ItemList') {
                    console.log(`  Preview:`, JSON.stringify(data, null, 2).substring(0, 500));
                }
            } catch {
                console.log(`  [${i + 1}] Parse error`);
            }
        });
    }

    // Check for __NEXT_DATA__ or similar
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
        console.log('\n✅ Found Next.js data');
        try {
            const data = JSON.parse(nextDataMatch[1]);
            console.log('  Preview:', JSON.stringify(data, null, 2).substring(0, 500));
        } catch {
            console.log('  Parse error');
        }
    }

    // Look for product-related class patterns
    console.log('\n🔍 Looking for product HTML patterns...');

    const patterns = [
        /class="[^"]*product[^"]*"/gi,
        /class="[^"]*item[^"]*"/gi,
        /class="[^"]*card[^"]*"/gi,
        /id="product-\d+"/gi,
    ];

    patterns.forEach((pattern, i) => {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
            console.log(`\n  Pattern ${i + 1}: ${pattern}`);
            console.log(`  Matches: ${matches.length}`);
            console.log(`  Sample: ${matches.slice(0, 3).join(', ')}`);
        }
    });

    // Check for PrestaShop specific structures
    if (checks['PrestaShop']) {
        console.log('\n🛒 PrestaShop detected - checking structure...');

        const psPatterns = {
            'Product container': /<div[^>]*class="[^"]*js-product[^"]*"/gi,
            'Product miniature': /<article[^>]*class="[^"]*product-miniature[^"]*"/gi,
            'Product thumbnail': /<div[^>]*class="[^"]*thumbnail-container[^"]*"/gi,
        };

        for (const [name, pattern] of Object.entries(psPatterns)) {
            const matches = html.match(pattern);
            if (matches) {
                console.log(`  ✅ ${name}: ${matches.length} found`);
                console.log(`     Sample: ${matches[0].substring(0, 100)}...`);
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 Next steps:');
    console.log('1. If PrestaShop: Use .product-miniature or .js-product');
    console.log('2. If JSON-LD found: Extract from structured data');
    console.log('3. If API: Find the API endpoint');
    console.log('4. Otherwise: May need browser automation');
}

main().catch(console.error);
