/**
 * Debug script to inspect Leafly Strains page structure
 * This will help us find the correct selectors
 */
import 'dotenv/config';
import puppeteer from 'puppeteer';

async function inspectLeaflyStrains() {
    console.log('\n🔍 Inspecting Leafly Strains Page Structure...\n');

    const browser = await puppeteer.launch({
        headless: false, // Show browser to see what's happening
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        console.log('📄 Loading: https://www.leafly.com/strains\n');
        await page.goto('https://www.leafly.com/strains', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait a bit for content to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extract page structure
        const pageInfo = await page.evaluate(() => {
            // Get all possible strain-related elements
            const allLinks = Array.from(document.querySelectorAll('a[href*="/strains/"]'));
            const allArticles = document.querySelectorAll('article');
            const allDivs = document.querySelectorAll('div[class*="strain"], div[class*="card"]');

            // Sample some HTML
            const sampleHTML = document.body.innerHTML.substring(0, 5000);

            // Get first strain link details if exists
            let firstStrainInfo = null;
            if (allLinks.length > 0) {
                const firstLink = allLinks[0];
                const parent = firstLink.closest('div, article, li');
                firstStrainInfo = {
                    href: (firstLink as HTMLAnchorElement).href,
                    text: firstLink.textContent?.trim(),
                    parentHTML: parent?.outerHTML.substring(0, 500),
                    parentClass: parent?.className,
                };
            }

            return {
                totalStrainLinks: allLinks.length,
                totalArticles: allArticles.length,
                totalCardDivs: allDivs.length,
                pageTitle: document.title,
                bodyClasses: document.body.className,
                firstStrainInfo,
                sampleHTML,
            };
        });

        console.log('📊 Page Analysis:');
        console.log('─────────────────────────────────────────');
        console.log(`Page Title: ${pageInfo.pageTitle}`);
        console.log(`Body Classes: ${pageInfo.bodyClasses}`);
        console.log(`\nElement Counts:`);
        console.log(`  Links to /strains/: ${pageInfo.totalStrainLinks}`);
        console.log(`  <article> tags: ${pageInfo.totalArticles}`);
        console.log(`  Card-like divs: ${pageInfo.totalCardDivs}`);

        if (pageInfo.firstStrainInfo) {
            console.log(`\n🎯 First Strain Found:`);
            console.log(`  URL: ${pageInfo.firstStrainInfo.href}`);
            console.log(`  Text: ${pageInfo.firstStrainInfo.text}`);
            console.log(`  Parent Class: ${pageInfo.firstStrainInfo.parentClass}`);
            console.log(`\n  Parent HTML (first 500 chars):`);
            console.log(`  ${pageInfo.firstStrainInfo.parentHTML}`);
        } else {
            console.log(`\n⚠️  No strain links found!`);
        }

        console.log(`\n📝 Sample HTML (first 5000 chars):`);
        console.log('─────────────────────────────────────────');
        console.log(pageInfo.sampleHTML);

        // Take screenshot
        await page.screenshot({
            path: 'd:/code/privated_project/cannabis/goodseed-app/debug-leafly-strains.png',
            fullPage: true
        });
        console.log('\n📸 Screenshot saved: debug-leafly-strains.png');

        // Keep browser open for manual inspection
        console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
        await new Promise(resolve => setTimeout(resolve, 30000));

    } catch (error) {
        console.error('\n❌ Error:', error);
    } finally {
        await browser.close();
    }
}

inspectLeaflyStrains()
    .then(() => {
        console.log('\n✅ Inspection complete!');
        process.exit(0);
    })
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    });
