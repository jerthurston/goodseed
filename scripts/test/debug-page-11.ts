import * as cheerio from 'cheerio';
import 'dotenv/config';
import puppeteer from 'puppeteer';

async function debugPage11() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: false, // Show browser to see what happens
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    const url = 'https://www.leafly.com/shop?page=300'; // Global shop page 300
    console.log(`Navigating to: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll to trigger lazy loading
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('\n=== Product Links ===');
    const productLinks = $('a[href*="/brands/"][href*="/products/"]');
    console.log(`Found ${productLinks.length} product links`);

    console.log('\n=== All Images on Page ===');
    const images = $('img');
    console.log(`Found ${images.length} img tags`);

    images.each((i, img) => {
        const src = $(img).attr('src');
        const dataSrc = $(img).attr('data-src');
        const alt = $(img).attr('alt');
        if (i < 10) { // First 10 images
            console.log(`${i + 1}. src: ${src || 'none'}`);
            console.log(`   data-src: ${dataSrc || 'none'}`);
            console.log(`   alt: ${alt || 'none'}\n`);
        }
    });

    console.log('\n=== Product Containers ===');
    productLinks.each((i, link) => {
        if (i < 5) { // First 5 products
            const href = $(link).attr('href');
            const $container = $(link).closest('div, li, article');
            const $img = $container.find('img').first();

            console.log(`${i + 1}. Product Link: ${href}`);
            console.log(`   Container: ${$container.prop('tagName')}`);
            console.log(`   Image src: ${$img.attr('src') || 'none'}`);
            console.log(`   Image data-src: ${$img.attr('data-src') || 'none'}`);
            console.log('');
        }
    });

    await browser.close();
}

debugPage11()
    .then(() => {
        console.log('\nDebug complete!');
        process.exit(0);
    })
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    });
