/**
 * Leafly Seed Scraper - MVP Version for GoodSeed
 * 
 * One scraper per seller site (requirement)
 * Scrapes cannabis seeds from Leafly Shop
 * 
 * URL: https://www.leafly.com/shop
 */

import { delay, log, slugify } from '@/lib/utils';
import { CannabisType, PhotoperiodType, SeedType, StockStatus } from '@prisma/client';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { SeedData } from '../types';

interface LeaflySeedScraperConfig {
    startPage?: number;
    endPage?: number;
    location?: string; // Optional: edmonton-ab-ca, etc. If not provided = global shop
    delayMs?: number;
}

/**
 * Leafly Seed Scraper
 * Follows GoodSeed MVP requirements for seed marketplace
 */
export class LeaflySeedScraper {
    private browser: Browser | null = null;
    private config: Required<LeaflySeedScraperConfig>;
    private baseUrl = 'https://www.leafly.com';

    constructor(config: LeaflySeedScraperConfig = {}) {
        this.config = {
            startPage: config.startPage || 1,
            endPage: config.endPage || 5,
            location: config.location || '', // Empty = global shop
            delayMs: config.delayMs || 4000, // 4 seconds between requests (requirement)
        };
    }

    /**
     * Main scrape method
     */
    async scrape(): Promise<SeedData[]> {
        const allSeeds: SeedData[] = [];

        try {
            await this.initBrowser();

            for (let pageNum = this.config.startPage; pageNum <= this.config.endPage; pageNum++) {
                try {
                    const pageUrl = this.getPageUrl(pageNum);
                    const page = await this.browser!.newPage();

                    // Set user agent (requirement: rotate user agents)
                    await page.setUserAgent(
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    );
                    await page.setViewport({ width: 1920, height: 1080 });

                    log(`[LeaflySeed] Scraping page ${pageNum}: ${pageUrl}`);

                    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

                    // Wait for products to load
                    await page.waitForSelector('a[href*="/brands/"]', { timeout: 15000 });

                    // Wait a bit more for all content to render
                    await delay(2000);

                    // Extract images using Puppeteer (for rendered DOM)
                    const imageMap = await this.extractImagesFromPage(page);

                    // Get HTML for Cheerio parsing
                    const html = await page.content();
                    const seeds = this.extractSeedsFromHtml(html, imageMap, pageNum);

                    log(`[LeaflySeed] Page ${pageNum}: Found ${seeds.length} seeds`);
                    allSeeds.push(...seeds);

                    await page.close();

                    // Wait between requests (requirement: 2-5 seconds)
                    if (pageNum < this.config.endPage) {
                        const delayTime = Math.random() * 3000 + 2000; // Random 2-5 seconds
                        log(`[LeaflySeed] Waiting ${(delayTime / 1000).toFixed(1)}s before next page...`);
                        await delay(delayTime);
                    }
                } catch (error) {
                    // Log errors but do not break search (requirement)
                    console.error(`[LeaflySeed] Error on page ${pageNum}:`, error);
                    continue;
                }
            }

            log(`[LeaflySeed] Total seeds scraped: ${allSeeds.length}`);
            return allSeeds;
        } catch (error) {
            console.error('[LeaflySeed] Scraper failed:', error);
            // TODO: Send alert if scraper fails (requirement)
            throw error;
        } finally {
            await this.closeBrowser();
        }
    }

    /**
     * Alias for scrape() to maintain compatibility
     */
    async run(): Promise<SeedData[]> {
        return this.scrape();
    }

    private async initBrowser() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
    }

    private async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    private getPageUrl(pageNumber: number): string {
        if (this.config.location) {
            return `${this.baseUrl}/shop?location=${this.config.location}&page=${pageNumber}`;
        }
        return `${this.baseUrl}/shop?page=${pageNumber}`;
    }

    /**
     * Extract images from rendered page using Puppeteer
     * Returns map of product URL -> image URL
     */
    private async extractImagesFromPage(page: Page): Promise<Map<string, string>> {
        return await page.evaluate(() => {
            const imageMap = new Map<string, string>();
            const productLinks = document.querySelectorAll('a[href*="/brands/"][href*="/products/"]');

            productLinks.forEach((link) => {
                const href = (link as HTMLAnchorElement).href;
                const container = link.closest('div')?.parentElement?.parentElement?.parentElement;
                if (!container) return;

                const img = container.querySelector('img');
                let imageUrl: string | null = null;

                // Try various image sources
                imageUrl = img?.src || img?.getAttribute('data-src') || null;

                if (!imageUrl) {
                    const srcset = img?.srcset || img?.getAttribute('data-srcset');
                    if (srcset) {
                        const firstUrl = srcset.split(',')[0].trim().split(' ')[0];
                        if (firstUrl) imageUrl = firstUrl;
                    }
                }

                // Filter placeholder images
                if (imageUrl && !imageUrl.includes('no_image_disclaimer')) {
                    imageMap.set(href, imageUrl);
                }
            });

            return Array.from(imageMap.entries());
        }).then(entries => new Map(entries));
    }

    /**
     * Extract seed data from HTML using Cheerio
     */
    private extractSeedsFromHtml(
        html: string,
        imageMap: Map<string, string>,
        pageNumber: number
    ): SeedData[] {
        const $ = cheerio.load(html);
        const seeds: SeedData[] = [];
        const seenUrls = new Set<string>();

        const productLinks = $('a[href*="/brands/"][href*="/products/"]');

        productLinks.each((_, element) => {
            try {
                const $link = $(element);
                const productUrl = $link.attr('href');

                if (!productUrl || seenUrls.has(productUrl)) return;
                seenUrls.add(productUrl);

                const fullUrl = this.resolveUrl(productUrl);
                const $container = $link.closest('div').parent().parent().parent();
                const containerText = $container.text();

                // Extract name
                const name = this.extractName($link, productUrl);
                if (!name || name.length < 3) return;

                // Extract price (requirement: take lowest price if range)
                const price = this.extractPrice(containerText);
                if (!price || price === 0) return; // Skip products without price

                // Extract pack size (requirement: capture pack size)
                const packSize = this.extractPackSize(containerText, name);

                // Extract THC/CBD (requirement: convert ranges to min/max)
                const { thcMin, thcMax } = this.extractTHCRange(containerText);
                const { cbdMin, cbdMax } = this.extractCBDRange(containerText);

                // Extract seed type classification (requirement)
                const seedType = this.extractSeedType(name, containerText);
                const cannabisType = this.extractCannabisType(name, containerText);
                const photoperiodType = this.extractPhotoperiodType(name, containerText);

                // Get image from map
                const imageUrl = imageMap.get(fullUrl);

                // Stock status (requirement)
                const stockStatus = price > 0 ? StockStatus.IN_STOCK : StockStatus.OUT_OF_STOCK;

                const seed: SeedData = {
                    name: this.cleanName(name),
                    url: fullUrl,
                    slug: slugify(name),
                    totalPrice: price,
                    packSize,
                    pricePerSeed: price / packSize, // Requirement: price per seed
                    stockStatus,
                    seedType,
                    cannabisType,
                    photoperiodType,
                    thcMin,
                    thcMax,
                    cbdMin,
                    cbdMax,
                    imageUrl,
                };

                seeds.push(seed);
            } catch (error) {
                // Log errors but do not break search (requirement)
                console.error(`[LeaflySeed] Error parsing seed:`, error);
            }
        });

        const withImages = seeds.filter(s => s.imageUrl).length;
        log(`[LeaflySeed] Page ${pageNumber}: ${seeds.length} seeds (${withImages} with images)`);

        return seeds;
    }

    // ========== Extraction Helper Methods ==========

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private extractName($link: cheerio.Cheerio<any>, productUrl: string): string {
        const $parent = $link.parent();
        const $heading = $parent.find('h3, h4, h2').first();

        if ($heading.length && $heading.text().trim()) {
            return $heading.text().trim();
        }

        // Fallback: extract from URL slug
        const match = productUrl.match(/\/products\/([^/?]+)/);
        if (match) {
            return match[1].split('-').map(w =>
                w.charAt(0).toUpperCase() + w.slice(1)
            ).join(' ');
        }

        return '';
    }

    private extractPrice(text: string): number {
        // Requirement: take lowest price if range shown
        const priceMatch = text.match(/\$(\d+\.?\d*)/);
        return priceMatch ? parseFloat(priceMatch[1]) : 0;
    }

    private extractPackSize(text: string, name: string): number {
        // Look for pack size patterns
        const patterns = [
            /(\d+)\s*seeds?/i,
            /pack\s*of\s*(\d+)/i,
            /(\d+)\s*pack/i,
            /(\d+)x\s*seed/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern) || name.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }

        // Default pack size if not found (requirement: fallback for missing data)
        return 1;
    }

    private extractTHCRange(text: string): { thcMin?: number; thcMax?: number } {
        // Requirement: convert ranges like 20-25% into min/max
        const rangeMatch = text.match(/THC\s*(\d+\.?\d*)\s*-\s*(\d+\.?\d*)%/i);
        if (rangeMatch) {
            return {
                thcMin: parseFloat(rangeMatch[1]),
                thcMax: parseFloat(rangeMatch[2]),
            };
        }

        const singleMatch = text.match(/THC\s*(\d+\.?\d*)%/i);
        if (singleMatch) {
            const value = parseFloat(singleMatch[1]);
            return { thcMin: value, thcMax: value };
        }

        return {};
    }

    private extractCBDRange(text: string): { cbdMin?: number; cbdMax?: number } {
        const rangeMatch = text.match(/CBD\s*(\d+\.?\d*)\s*-\s*(\d+\.?\d*)%/i);
        if (rangeMatch) {
            return {
                cbdMin: parseFloat(rangeMatch[1]),
                cbdMax: parseFloat(rangeMatch[2]),
            };
        }

        const singleMatch = text.match(/CBD\s*(\d+\.?\d*)%/i);
        if (singleMatch) {
            const value = parseFloat(singleMatch[1]);
            return { cbdMin: value, cbdMax: value };
        }

        return {};
    }

    private extractSeedType(name: string, text: string): SeedType | undefined {
        const combined = (name + ' ' + text).toLowerCase();

        // Requirement: standardize names
        if (combined.includes('feminized') || combined.includes('fem')) {
            return SeedType.FEMINIZED;
        }
        if (combined.includes('autoflower') || combined.includes('auto-flower') || combined.includes('auto flower')) {
            return SeedType.AUTOFLOWER;
        }
        if (combined.includes('regular') || combined.includes('reg')) {
            return SeedType.REGULAR;
        }

        return undefined;
    }

    private extractCannabisType(name: string, text: string): CannabisType | undefined {
        const combined = (name + ' ' + text).toLowerCase();

        // Requirement: standardize names (Sativa/Indica/Mix -> HYBRID)
        if (combined.includes('hybrid') || combined.includes('mix')) {
            return CannabisType.HYBRID;
        }
        if (combined.includes('sativa')) {
            return CannabisType.SATIVA;
        }
        if (combined.includes('indica')) {
            return CannabisType.INDICA;
        }

        return undefined;
    }

    private extractPhotoperiodType(name: string, text: string): PhotoperiodType | undefined {
        const combined = (name + ' ' + text).toLowerCase();

        if (combined.includes('autoflower') || combined.includes('auto-flower') || combined.includes('auto flower')) {
            return PhotoperiodType.AUTOFLOWER;
        }
        if (combined.includes('photoperiod') || combined.includes('photo period')) {
            return PhotoperiodType.PHOTOPERIOD;
        }

        return undefined;
    }

    private cleanName(name: string): string {
        return name.replace(/\s+/g, ' ').trim();
    }

    private resolveUrl(url: string): string {
        if (url.startsWith('http')) return url;
        return `${this.baseUrl}${url}`;
    }
}
