import { delay, log, slugify } from '@/lib/utils';
import * as cheerio from 'cheerio';
import { Page } from 'puppeteer';
import {
    DispensaryProductData,
    DispensaryProductScraper,
    DispensaryProductScraperConfig,
} from '../dispensary-product-scraper';

/**
 * Scraper for Leafly Shop (https://www.leafly.com/shop)
 * Scrapes products available at dispensaries near Edmonton, AB
 * 
 * Note: Products on Leafly are from multiple dispensaries
 * Each product listing shows which dispensary it's available at
 */
export class LeaflyShopScraper extends DispensaryProductScraper {
    private location?: string;

    constructor(
        config: Omit<DispensaryProductScraperConfig, 'name' | 'baseUrl'> & {
            location?: string;
        }
    ) {
        super({
            ...config,
            name: 'LeaflyShop',
            baseUrl: 'https://www.leafly.com',
            delayMs: config.delayMs || 4000, // 4 seconds delay
            maxRetries: config.maxRetries || 3,
        });
        this.location = config.location; // Optional location
    }

    protected getPageUrl(pageNumber: number): string {
        // If location is provided: https://www.leafly.com/shop?location=edmonton-ab-ca&page=1
        // If not: https://www.leafly.com/shop?page=300 (global shop)
        if (this.location) {
            return `${this.config.baseUrl}/shop?location=${this.location}&page=${pageNumber}`;
        }
        return `${this.config.baseUrl}/shop?page=${pageNumber}`;
    }

    protected extractProductsFromHtml(
        html: string,
        pageNumber: number
    ): DispensaryProductData[] {
        const $ = cheerio.load(html);
        const products: DispensaryProductData[] = [];

        /**
         * Leafly shop uses links with /brands/ in them for each product
         * Structure: <a href="/brands/{brand}/products/{product}">
         * We need to find all product links and extract data from surrounding HTML
         */

        // Try to find product links
        const productLinks = $('a[href*="/brands/"][href*="/products/"]');

        log(`[${this.config.name}] Found ${productLinks.length} product links on page ${pageNumber}`);

        // Group links by product URL to avoid duplicates
        const seenUrls = new Set<string>();

        productLinks.each((_, element) => {
            try {
                const $link = $(element);
                const productUrl = $link.attr('href');

                if (!productUrl || seenUrls.has(productUrl)) return;
                seenUrls.add(productUrl);

                // Find the container - go up several levels to get full product card
                const $container = $link.closest('div').parent().parent().parent();

                // Extract product name from URL as fallback
                // URL format: /brands/{brand}/products/{product-slug}
                const productSlugMatch = productUrl.match(/\/products\/([^/?]+)/);
                const productSlugFromUrl = productSlugMatch ? productSlugMatch[1] : '';

                // Try to get clean product name
                let name = '';

                // Method 1: Look for the product name in a heading within the link's parent
                const $parent = $link.parent();
                const $heading = $parent.find('h3, h4, h2').first();
                if ($heading.length && $heading.text().trim().length > 0) {
                    name = $heading.text().trim();
                } else {
                    // Method 2: Extract from product slug
                    name = productSlugFromUrl
                        .split('-')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ');
                }

                // Clean name
                name = name
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!name || name.length < 3) {
                    log(`[${this.config.name}] Skipping product with invalid name: ${productUrl}`);
                    return;
                }

                // Extract all text from container for parsing other fields
                const containerText = $container.text();

                // Extract brand from URL: /brands/{brand-name}/products/...
                const brandMatch = productUrl.match(/\/brands\/([^/]+)\//);
                const brandSlug = brandMatch ? brandMatch[1] : undefined;
                const brand = brandSlug ? this.formatBrandName(brandSlug) : this.extractBrandFromName(name);

                // Extract THC from container text
                const thcMatch = containerText.match(/THC\s+(\d+\.?\d*)%/i);
                const thc = thcMatch ? parseFloat(thcMatch[1]) : undefined;

                // Extract CBD
                const cbdMatch = containerText.match(/CBD\s+(\d+\.?\d*)%/i);
                const cbd = cbdMatch ? cbdMatch[0] : undefined;

                // Extract price - look for $ followed by numbers
                const priceMatch = containerText.match(/\$(\d+\.?\d*)/);
                const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

                // Extract weight/amount
                const weightMatch = containerText.match(/(\d+\.?\d*\s*(?:g|mg|ml|oz|ounce))/i);
                const weight = weightMatch ? weightMatch[0] : undefined;

                // Extract image - try multiple methods
                let imageUrl =
                    $container.find('img').first().attr('src') ||
                    $container.find('img').first().attr('data-src') ||
                    $container.find('img').first().attr('data-lazy-src') ||
                    $link.find('img').attr('src') ||
                    $link.find('img').attr('data-src') ||
                    $link.find('img').attr('data-lazy-src');

                // Try srcset if no src found
                if (!imageUrl) {
                    const srcset = $container.find('img').first().attr('srcset') ||
                        $container.find('img').first().attr('data-srcset') ||
                        $link.find('img').attr('srcset') ||
                        $link.find('img').attr('data-srcset');

                    if (srcset) {
                        // Extract first URL from srcset (format: "url 1x, url 2x")
                        const firstUrl = srcset.split(',')[0].trim().split(' ')[0];
                        if (firstUrl) imageUrl = firstUrl;
                    }
                }

                // Try to extract from background-image style
                if (!imageUrl) {
                    const bgStyle = $container.find('[style*="background-image"]').first().attr('style') ||
                        $link.find('[style*="background-image"]').first().attr('style');
                    if (bgStyle) {
                        const urlMatch = bgStyle.match(/url\(['"]?([^'"()]+)['"]?\)/);
                        if (urlMatch) {
                            imageUrl = urlMatch[1];
                        }
                    }
                }

                // Filter out placeholder/default images
                const placeholderPatterns = [
                    'no_image_disclaimer',
                    'placeholder',
                    'default-image',
                    'no-image',
                ];

                if (imageUrl && placeholderPatterns.some(pattern => imageUrl!.includes(pattern))) {
                    imageUrl = undefined; // Skip placeholder images
                }

                // Determine product type
                const type = this.parseProductType(name + ' ' + containerText);

                // Extract strain name
                const strainName = this.extractStrainName(name, brand);

                const product: DispensaryProductData = {
                    dispensaryId: this.dispensaryId,
                    name: this.cleanProductName(name),
                    slug: slugify(name),
                    brand: brand || undefined,
                    type,
                    thc,
                    cbd,
                    weight,
                    price,
                    quantity: price > 0 ? 100 : 0,
                    isAvailable: price > 0,
                    imageUrl: imageUrl ? this.resolveUrl(imageUrl) : undefined,
                    productUrl: this.resolveUrl(productUrl),
                    strainName,
                    description: containerText.includes('away at') ?
                        containerText.match(/away at (.+?)(?:\s|$)/)?.[1] : undefined,
                };

                products.push(product);
            } catch (error) {
                this.logError(error, `Parsing product on page ${pageNumber}`);
            }
        });

        return products;
    }

    /**
     * Format brand name from slug
     * Example: "cookies" -> "Cookies", "pure-sunfarms" -> "Pure Sunfarms"
     */
    private formatBrandName(slug: string): string {
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Override scrape method to handle Leafly's dynamic content
     */
    async scrape(): Promise<DispensaryProductData[]> {
        const allProducts: DispensaryProductData[] = [];

        try {
            await this.initBrowser();

            for (let pageNum = this.startPage; pageNum <= this.endPage; pageNum++) {
                try {
                    const pageUrl = this.getPageUrl(pageNum);
                    const page = await this.browser!.newPage();

                    // Set user agent and viewport
                    await page.setUserAgent(
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    );
                    await page.setViewport({ width: 1920, height: 1080 });

                    log(`[${this.config.name}] Page ${pageNum}: ${pageUrl}`);

                    await this.navigateToPage(page, pageUrl);

                    // Wait for products to load (Leafly uses client-side rendering)
                    // Try multiple selectors as Leafly may change their structure
                    const productLoaded = await Promise.race([
                        page.waitForSelector('a[href*="/brands/"]', { timeout: 15000 }).then(() => true),
                        page.waitForSelector('[data-testid*="product"]', { timeout: 15000 }).then(() => true),
                        page.waitForSelector('article', { timeout: 15000 }).then(() => true),
                        new Promise((resolve) => setTimeout(() => resolve(false), 15000)),
                    ]);

                    if (!productLoaded) {
                        log(`[${this.config.name}] Warning: No products selector found on page ${pageNum}`);
                    }

                    // Additional wait for dynamic content
                    await delay(3000);

                    // Scroll to load lazy-loaded images
                    await this.autoScroll(page);

                    // Extract product data directly from page using evaluate
                    // This ensures we get the rendered content after JS execution
                    const productsData = await page.evaluate(() => {
                        const products: Array<{ url: string; imageUrl: string | null }> = [];
                        const productLinks = document.querySelectorAll('a[href*="/brands/"][href*="/products/"]');
                        const seenUrls = new Set<string>();

                        productLinks.forEach((link) => {
                            const href = (link as HTMLAnchorElement).href;
                            if (seenUrls.has(href)) return;
                            seenUrls.add(href);

                            // Find container (parent element with product info)
                            let container = link.parentElement;
                            while (container && container.children.length < 3) {
                                container = container.parentElement;
                            }

                            if (!container) return;

                            // Extract image
                            const img = container.querySelector('img');
                            let imageUrl = img?.src ||
                                img?.getAttribute('data-src') ||
                                img?.getAttribute('data-lazy-src') ||
                                null;

                            // Try srcset if no src found
                            if (!imageUrl) {
                                const srcset = img?.srcset || img?.getAttribute('data-srcset');
                                if (srcset) {
                                    // Extract first URL from srcset (format: "url 1x, url 2x")
                                    const firstUrl = srcset.split(',')[0].trim().split(' ')[0];
                                    if (firstUrl) imageUrl = firstUrl;
                                }
                            }

                            // Also try background-image
                            if (!imageUrl) {
                                const bgElement = container.querySelector('[style*="background-image"]');
                                if (bgElement) {
                                    const style = (bgElement as HTMLElement).style.backgroundImage;
                                    const urlMatch = style.match(/url\(['"]?([^'"()]+)['"]?\)/);
                                    if (urlMatch) imageUrl = urlMatch[1];
                                }
                            }

                            products.push({
                                url: href,
                                imageUrl,
                            });
                        });

                        return products;
                    });

                    // Create image lookup map
                    const imageMap = new Map<string, string>();
                    productsData.forEach(pd => {
                        if (pd.imageUrl && !pd.imageUrl.includes('no_image_disclaimer')) {
                            imageMap.set(pd.url, pd.imageUrl);
                        }
                    });

                    log(`[${this.config.name}] Extracted ${imageMap.size} images from rendered DOM`);

                    // Get page content for detailed parsing
                    const html = await page.content();

                    // Extract products
                    const products = this.extractProductsFromHtml(html, pageNum);

                    // Merge image URLs from evaluate into products
                    products.forEach(product => {
                        const fullUrl = this.resolveUrl(product.productUrl || '');
                        if (imageMap.has(fullUrl) && !product.imageUrl) {
                            product.imageUrl = imageMap.get(fullUrl);
                        }
                    });

                    log(`[${this.config.name}] Page ${pageNum}: Found ${products.length} products`);

                    allProducts.push(...products);

                    await page.close();
                    await delay(this.config.delayMs);

                    // Stop if we got no products (reached the end)
                    if (products.length === 0) {
                        log(`[${this.config.name}] No products found, stopping at page ${pageNum}`);
                        break;
                    }
                } catch (error) {
                    this.logError(error, `Page ${pageNum}`);
                }
            }
        } finally {
            await this.closeBrowser();
        }

        return allProducts;
    }

    /**
     * Auto-scroll page to trigger lazy loading
     */
    private async autoScroll(page: Page): Promise<void> {
        await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    }

    /**
     * Extract brand from product name
     * Example: "Cookies Cake Mix Flower" -> "Cookies"
     */
    private extractBrandFromName(name: string): string | undefined {
        // Common brand patterns
        const brands = [
            'Cookies', 'Pure Sunfarms', 'Good Supply', 'Spinach', 'Redecan',
            'Back Forty', 'San Rafael', 'WINK', 'Hiway', 'TWD', 'Highly Dutch',
            'Muskoka Grown', 'Coterie', 'Vortex'
        ];

        for (const brand of brands) {
            if (name.toLowerCase().includes(brand.toLowerCase())) {
                return brand;
            }
        }

        // Try to extract first word as brand
        const firstWord = name.split(' ')[0];
        if (firstWord && firstWord.length > 2) {
            return firstWord;
        }

        return undefined;
    }

    /**
     * Extract strain name from product name
     */
    private extractStrainName(name: string, brand?: string): string | undefined {
        let cleaned = name;

        // Remove brand
        if (brand) {
            cleaned = cleaned.replace(new RegExp(brand, 'gi'), '').trim();
        }

        // Remove common product type words
        cleaned = cleaned
            .replace(/\b(flower|pre-roll|preroll|vape|cartridge|edible|gummies)\b/gi, '')
            .replace(/\b\d+\.?\d*\s*(g|mg|ml|oz)\b/gi, '') // Remove weights
            .replace(/\b(pack|count)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned || undefined;
    }

    /**
     * Extract dispensary name from location text
     */
    private extractDispensaryName(text: string): string | undefined {
        // Example: "7.00 mi away at T's Cannabis - Terwillegar"
        const match = text.match(/at\s+(.+?)$/i);
        return match ? match[1].trim() : undefined;
    }

    /**
     * Clean product name
     */
    private cleanProductName(name: string): string {
        return name
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Resolve relative URLs
     */
    private resolveUrl(url: string): string {
        if (url.startsWith('http')) return url;
        if (url.startsWith('//')) return `https:${url}`;
        if (url.startsWith('/')) return `${this.config.baseUrl}${url}`;
        return `${this.config.baseUrl}/${url}`;
    }
}
