import { delay, log } from '@/lib/utils';
import puppeteer, { Browser, Page } from 'puppeteer';
import { BaseScraper, ScraperConfig } from './base-scraper';

export interface DispensaryProductData {
    dispensaryId: string; // Must provide dispensary ID
    name: string;
    slug: string;
    brand?: string;
    type: string; // FLOWER, PRE_ROLL, EDIBLE, etc.
    thc?: number;
    cbd?: string;
    weight?: string;
    price: number;
    compareAtPrice?: number;
    quantity: number;
    isAvailable: boolean;
    description?: string;
    effects?: string[];
    flavors?: string[];
    terpenes?: string[];
    imageUrl?: string;
    productUrl?: string;
    strainName?: string; // To link with CannabisStrain
}

export interface DispensaryProductScraperConfig extends ScraperConfig {
    dispensaryId: string;
    startPage?: number;
    endPage?: number;
}

/**
 * Base scraper for dispensary products
 * Can be extended for specific dispensary websites
 */
export abstract class DispensaryProductScraper extends BaseScraper {
    protected browser: Browser | null = null;
    protected dispensaryId: string;
    protected startPage: number;
    protected endPage: number;

    constructor(config: DispensaryProductScraperConfig) {
        super(config);
        this.dispensaryId = config.dispensaryId;
        this.startPage = config.startPage || 1;
        this.endPage = config.endPage || 10;
    }

    /**
     * Initialize browser
     */
    protected async initBrowser(): Promise<void> {
        if (!this.browser) {
            log(`[${this.config.name}] Launching browser...`);
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
    }

    /**
     * Close browser
     */
    protected async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Navigate to page with retry logic
     */
    protected async navigateToPage(page: Page, url: string): Promise<void> {
        let retries = this.config.maxRetries;
        while (retries > 0) {
            try {
                log(`[${this.config.name}] Navigating to: ${url}`);
                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000,
                });
                return;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                log(`[${this.config.name}] Navigation failed, retrying... (${retries} left)`);
                await delay(this.config.delayMs * 2);
            }
        }
    }

    /**
     * Extract products from HTML - to be implemented by child classes
     */
    protected abstract extractProductsFromHtml(
        html: string,
        pageNumber: number
    ): DispensaryProductData[];

    /**
     * Get product list page URL - to be implemented by child classes
     */
    protected abstract getPageUrl(pageNumber: number): string;

    /**
     * Main scrape method
     */
    async scrape(): Promise<DispensaryProductData[]> {
        const allProducts: DispensaryProductData[] = [];

        try {
            await this.initBrowser();

            for (let pageNum = this.startPage; pageNum <= this.endPage; pageNum++) {
                try {
                    const pageUrl = this.getPageUrl(pageNum);
                    const page = await this.browser!.newPage();

                    // Set user agent to avoid detection
                    await page.setUserAgent(
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    );

                    await this.navigateToPage(page, pageUrl);

                    // Get page content
                    const html = await page.content();

                    // Extract products
                    const products = this.extractProductsFromHtml(html, pageNum);
                    log(
                        `[${this.config.name}] Page ${pageNum}: Found ${products.length} products`
                    );

                    allProducts.push(...products);

                    await page.close();
                    await delay(this.config.delayMs);
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
     * Parse product type from string
     */
    protected parseProductType(typeString: string): string {
        const normalized = typeString.toLowerCase().trim();

        if (normalized.includes('flower') || normalized.includes('dried')) return 'FLOWER';
        if (normalized.includes('pre-roll') || normalized.includes('preroll')) return 'PRE_ROLL';
        if (normalized.includes('edible') || normalized.includes('gummies')) return 'EDIBLE';
        if (normalized.includes('beverage') || normalized.includes('drink')) return 'BEVERAGE';
        if (normalized.includes('vape') || normalized.includes('cartridge')) return 'VAPE';
        if (normalized.includes('concentrate') || normalized.includes('extract')) return 'CONCENTRATE';
        if (normalized.includes('topical') || normalized.includes('cream')) return 'TOPICAL';
        if (normalized.includes('seed')) return 'SEED';
        if (normalized.includes('tincture') || normalized.includes('oil')) return 'TINCTURE';
        if (normalized.includes('accessory')) return 'ACCESSORY';

        return 'FLOWER'; // Default
    }

    /**
     * Parse price from string
     */
    protected parsePrice(priceString: string): number {
        const cleaned = priceString.replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
    }

    /**
     * Parse weight from string
     */
    protected parseWeight(weightString: string): string | undefined {
        const match = weightString.match(/(\d+(?:\.\d+)?)\s*(g|mg|ml|oz)/i);
        return match ? match[0] : undefined;
    }

    /**
     * Extract THC percentage
     */
    protected extractThc(text: string): number | undefined {
        const match = text.match(/(\d+(?:\.\d+)?)\s*%?\s*thc/i);
        return match ? parseFloat(match[1]) : undefined;
    }

    /**
     * Extract CBD value
     */
    protected extractCbd(text: string): string | undefined {
        const match = text.match(/(\d+(?:\.\d+)?)\s*%?\s*cbd/i);
        return match ? match[0] : undefined;
    }
}
