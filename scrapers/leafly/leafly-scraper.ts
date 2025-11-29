import { log } from '@/lib/utils';
import { StrainType } from '@prisma/client';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { BaseScraper } from '../base-scraper';

interface StrainData {
    name: string;
    slug: string;
    type: StrainType;
    thc?: number;
    thcRange?: string;
    cbdRange?: string;
    description?: string;
    flavors: string[];
    effects: string[];
    terpenes: string[];
}

/**
 * Scraper cho Leafly.com sử dụng Puppeteer
 */
export class LeaflyScraper extends BaseScraper {
    private startPage: number;
    private endPage: number;

    constructor(startPage: number = 1, endPage: number = 10) {
        super({
            name: 'Leafly',
            baseUrl: 'https://www.leafly.com',
            delayMs: 2000,
        });
        this.startPage = startPage;
        this.endPage = endPage;
    }

    async scrape(): Promise<StrainData[]> {
        const strains: StrainData[] = [];

        log(`[${this.config.name}] Launching browser...`);
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        try {
            for (let page = this.startPage; page <= this.endPage; page++) {
                const url = page === 1
                    ? `${this.config.baseUrl}/strains`
                    : `${this.config.baseUrl}/strains?page=${page}`;

                log(`[${this.config.name}] Scraping page ${page}/${this.endPage}...`);

                const pageStrains = await this.scrapePage(browser, url);
                strains.push(...pageStrains);

                log(`[${this.config.name}] Page ${page}: Found ${pageStrains.length} strains`);
            }
        } finally {
            await browser.close();
        }

        return strains;
    }

    private async scrapePage(browser: any, url: string): Promise<StrainData[]> {
        const strains: StrainData[] = [];
        const page = await browser.newPage();

        try {
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Đợi strain cards load
            await page.waitForSelector('a[href^="/strains/"]', { timeout: 10000 });

            const html = await page.content();
            const $ = cheerio.load(html);

            // Debug: Log HTML structure
            log(`[${this.config.name}] Total links found: ${$('a[href^="/strains/"]').length}`);

            // Tìm tất cả strain links
            const strainLinks = new Set<string>();

            $('a[href^="/strains/"]').each((_, element) => {
                const href = $(element).attr('href');
                if (href && href !== '/strains' && !href.includes('?') && !href.includes('/lists')) {
                    strainLinks.add(href);
                }
            });

            log(`[${this.config.name}] Unique strain links: ${strainLinks.size}`);

            // Parse từng strain
            for (const href of strainLinks) {
                try {
                    const name = href.replace('/strains/', '').replace(/-/g, ' ')
                        .split(' ')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ');

                    const slug = href.replace('/strains/', '');

                    // Tìm container của strain này
                    const $strainCard = $(`a[href="${href}"]`).first();
                    const cardText = $strainCard.text();

                    const type = this.parseStrainType(cardText);

                    // Parse THC
                    const thcMatch = cardText.match(/THC\s*(\d+)%/);
                    const thc = thcMatch ? parseInt(thcMatch[1]) : undefined;

                    // Parse terpene
                    const terpenes: string[] = [];
                    const terpeneMatch = cardText.match(/(?:Myrcene|Caryophyllene|Limonene|Terpinolene|Pinene|Humulene)/gi);
                    if (terpeneMatch) {
                        terpenes.push(...terpeneMatch);
                    }

                    // Parse effect
                    const effects: string[] = [];
                    const effectMatch = cardText.match(/(?:Sleepy|Relaxed|Happy|Uplifted|Euphoric|Energetic|Creative|Focused|Hungry|Tingly|Aroused|Giggly)/gi);
                    if (effectMatch) {
                        effects.push(...effectMatch);
                    }

                    strains.push({
                        name,
                        slug,
                        type,
                        thc,
                        effects,
                        terpenes,
                        flavors: [],
                    });
                } catch (error) {
                    this.logError(error, `parsing strain ${href}`);
                }
            }

        } catch (error) {
            this.logError(error, `scraping ${url}`);
        } finally {
            await page.close();
        }

        return strains;
    }

    private parseStrainType(text: string): StrainType {
        const normalized = text.toLowerCase();
        if (normalized.includes('indica')) return StrainType.INDICA;
        if (normalized.includes('sativa')) return StrainType.SATIVA;
        return StrainType.HYBRID;
    }
}
