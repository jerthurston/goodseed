/**
 * Leafly Strains Scraper - Seed Data Source
 * 
 * URL: https://www.leafly.com/strains
 * Purpose: Scrape cannabis strain data as seed information
 * 
 * Data collected:
 * - Strain Name (as seed name)
 * - Strain Type (Indica/Sativa/Hybrid)
 * - THC/CBD percentages
 * - Images
 * - Effects & Flavors (optional)
 */

import { delay, log, slugify } from '@/lib/utils';
import { CannabisType, SeedType, StockStatus } from '@prisma/client';
import puppeteer, { Browser, Page } from 'puppeteer';
import { SeedData } from '../types';

interface LeaflyStrainScraperConfig {
    startPage?: number;
    endPage?: number;
    strainType?: 'indica' | 'sativa' | 'hybrid' | 'all';
    delayMs?: number;
}

/**
 * Scraper for Leafly Strains as Seed Data
 * Each strain represents a seed variety
 */
export class LeaflyStrainScraper {
    private browser: Browser | null = null;
    private config: Required<LeaflyStrainScraperConfig>;
    private baseUrl = 'https://www.leafly.com';

    constructor(config: LeaflyStrainScraperConfig = {}) {
        this.config = {
            startPage: config.startPage || 1,
            endPage: config.endPage || 5,
            strainType: config.strainType || 'all',
            delayMs: config.delayMs || 4000,
        };
    }

    async scrape(): Promise<SeedData[]> {
        const allSeeds: SeedData[] = [];

        try {
            await this.initBrowser();

            for (let pageNum = this.config.startPage; pageNum <= this.config.endPage; pageNum++) {
                try {
                    const pageUrl = this.getPageUrl(pageNum);
                    const page = await this.browser!.newPage();

                    await page.setUserAgent(
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    );
                    await page.setViewport({ width: 1920, height: 1080 });

                    log(`[LeaflyStrain] Scraping page ${pageNum}: ${pageUrl}`);

                    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                    await delay(2000);

                    // Extract data
                    const seeds = await this.extractSeedsFromPage(page);

                    log(`[LeaflyStrain] Page ${pageNum}: Found ${seeds.length} strains`);
                    allSeeds.push(...seeds);

                    await page.close();

                    // Wait between pages
                    if (pageNum < this.config.endPage) {
                        const delayTime = Math.random() * 3000 + 2000;
                        log(`[LeaflyStrain] Waiting ${(delayTime / 1000).toFixed(1)}s...`);
                        await delay(delayTime);
                    }
                } catch (error) {
                    console.error(`[LeaflyStrain] Error on page ${pageNum}:`, error);
                    continue;
                }
            }

            log(`[LeaflyStrain] Total strains scraped: ${allSeeds.length}`);
            return allSeeds;
        } catch (error) {
            console.error('[LeaflyStrain] Scraper failed:', error);
            throw error;
        } finally {
            await this.closeBrowser();
        }
    }

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
        // Leafly strains pagination format
        // https://www.leafly.com/strains?page=1
        // Or filter by type: https://www.leafly.com/strains/indica?page=1

        if (this.config.strainType === 'all') {
            return `${this.baseUrl}/strains?page=${pageNumber}`;
        }
        return `${this.baseUrl}/strains/${this.config.strainType}?page=${pageNumber}`;
    }

    private async extractSeedsFromPage(page: Page): Promise<SeedData[]> {
        // Use Puppeteer to extract data from rendered page
        const strainsData = await page.evaluate(() => {
            const strains: Array<{
                name: string;
                url: string;
                type: string;
                thc: string;
                cbd: string;
                imageUrl: string | null;
            }> = [];

            // Find strain cards - adjust selectors based on actual Leafly structure
            // This is a placeholder - need to inspect actual page structure
            const strainCards = document.querySelectorAll('[data-testid="strain-card"], .strain-card, article');

            strainCards.forEach((card) => {
                try {
                    // Extract strain name
                    const nameEl = card.querySelector('h4, h3, [data-testid="strain-name"]');
                    const name = nameEl?.textContent?.trim() || '';

                    // Extract URL
                    const linkEl = card.querySelector('a[href*="/strains/"]');
                    const url = (linkEl as HTMLAnchorElement)?.href || '';

                    // Extract type (Indica/Sativa/Hybrid)
                    const typeEl = card.querySelector('[data-testid="strain-type"], .strain-type');
                    const type = typeEl?.textContent?.trim() || '';

                    // Extract THC
                    const thcEl = card.querySelector('[data-testid="thc"], .thc');
                    const thc = thcEl?.textContent?.trim() || '';

                    // Extract CBD
                    const cbdEl = card.querySelector('[data-testid="cbd"], .cbd');
                    const cbd = cbdEl?.textContent?.trim() || '';

                    // Extract image
                    const imgEl = card.querySelector('img');
                    let imageUrl: string | null = null;
                    if (imgEl) {
                        imageUrl = imgEl.src || imgEl.getAttribute('data-src') || null;
                    }

                    if (name && url) {
                        strains.push({ name, url, type, thc, cbd, imageUrl });
                    }
                } catch (error) {
                    console.error('Error parsing strain card:', error);
                }
            });

            return strains;
        });

        // Convert to SeedData format
        const seeds: SeedData[] = [];

        for (const strain of strainsData) {
            try {
                // Parse THC range
                const { thcMin, thcMax } = this.parseTHCString(strain.thc);

                // Parse CBD range  
                const { cbdMin, cbdMax } = this.parseCBDString(strain.cbd);

                // Determine cannabis type
                const cannabisType = this.mapCannabisType(strain.type);

                // Create seed data
                // Note: For Leafly strains, we use default pack size and price
                // Real sellers will have actual prices
                const seed: SeedData = {
                    name: strain.name,
                    url: strain.url,
                    slug: slugify(strain.name),
                    totalPrice: 0, // No price from Leafly strains page
                    packSize: 1, // Default pack size
                    pricePerSeed: 0,
                    stockStatus: StockStatus.IN_STOCK, // Assume in stock
                    seedType: SeedType.FEMINIZED, // Default - can't determine from Leafly
                    cannabisType,
                    thcMin,
                    thcMax,
                    cbdMin,
                    cbdMax,
                    imageUrl: strain.imageUrl || undefined,
                };

                seeds.push(seed);
            } catch (error) {
                console.error(`[LeaflyStrain] Error processing strain ${strain.name}:`, error);
                continue;
            }
        }

        return seeds;
    }

    private parseTHCString(thcStr: string): { thcMin?: number; thcMax?: number } {
        if (!thcStr) return {};

        // Remove % and THC: prefix
        const cleaned = thcStr.replace(/THC:?/i, '').replace(/%/g, '').trim();

        // Check for range: "20-25"
        const rangeMatch = cleaned.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
        if (rangeMatch) {
            return {
                thcMin: parseFloat(rangeMatch[1]),
                thcMax: parseFloat(rangeMatch[2]),
            };
        }

        // Single value: "23"
        const singleMatch = cleaned.match(/(\d+\.?\d*)/);
        if (singleMatch) {
            const value = parseFloat(singleMatch[1]);
            return { thcMin: value, thcMax: value };
        }

        return {};
    }

    private parseCBDString(cbdStr: string): { cbdMin?: number; cbdMax?: number } {
        if (!cbdStr) return {};

        const cleaned = cbdStr.replace(/CBD:?/i, '').replace(/%/g, '').trim();

        const rangeMatch = cleaned.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
        if (rangeMatch) {
            return {
                cbdMin: parseFloat(rangeMatch[1]),
                cbdMax: parseFloat(rangeMatch[2]),
            };
        }

        const singleMatch = cleaned.match(/(\d+\.?\d*)/);
        if (singleMatch) {
            const value = parseFloat(singleMatch[1]);
            return { cbdMin: value, cbdMax: value };
        }

        return {};
    }

    private mapCannabisType(typeStr: string): CannabisType | undefined {
        const normalized = typeStr.toLowerCase();

        if (normalized.includes('indica')) {
            return CannabisType.INDICA;
        }
        if (normalized.includes('sativa')) {
            return CannabisType.SATIVA;
        }
        if (normalized.includes('hybrid')) {
            return CannabisType.HYBRID;
        }

        return undefined;
    }
}
