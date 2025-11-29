/**
 * Seed Supreme Navigation Scraper
 * 
 * Extract all seed categories from homepage navigation menu
 * Auto-discovers categories instead of hardcoding them
 */

import { CheerioCrawler } from 'crawlee';
import { BASE_URL } from './selectors';

export interface CategoryMetadata {
    name: string;           // "Feminized Seeds"
    slug: string;           // "feminized-seeds"
    url: string;            // "https://seedsupreme.com/feminized-seeds.html"
    level: number;          // 0 (main) or 1 (sub-category)
    seedType?: SeedType;    // Inferred from name
    parent?: string;        // Parent category name (for sub-categories)
}

export enum SeedType {
    FEMINIZED = 'FEMINIZED',
    AUTOFLOWER = 'AUTOFLOWER',
    REGULAR = 'REGULAR',
    FAST_VERSION = 'FAST_VERSION',
    CBD = 'CBD',
    MIXED = 'MIXED',
}

export class NavigationScraper {
    /**
     * Extract all seed categories from homepage navigation
     */
    async extractCategories(): Promise<CategoryMetadata[]> {
        const categories: CategoryMetadata[] = [];

        // Bind methods to use in crawler context
        const isSeedCategory = this.isSeedCategory.bind(this);
        const parseCategory = this.parseCategory.bind(this);

        const crawler = new CheerioCrawler({
            async requestHandler({ $, log }) {
                log.info('[Navigation] Extracting categories from menu...');

                // Find main navigation menu (try multiple selectors)
                // Target the specific flat navigation menu structure
                const $nav = $('ul.header-under-links.scroll-links');

                if ($nav.length === 0) {
                    log.warning('[Navigation] Navigation menu (ul.header-under-links.scroll-links) not found!');
                    return;
                }

                log.info('[Navigation] Found navigation menu');

                // Extract all menu items (flat list structure - all level 0)
                const $menuItems = $nav.find('> li > a[href]');

                log.info(`[Navigation] Found ${$menuItems.length} menu items`);

                $menuItems.each((_, element) => {
                    const $link = $(element);
                    const href = $link.attr('href');
                    const name = $link.text().trim();

                    if (!href || !name) return;

                    // Skip external links (like THC Products that goes to unitedstrainsofamerica.com)
                    if (href.startsWith('http') && !href.includes('seedsupreme.com')) {
                        log.info(`[Navigation] Skipping external link: ${name}`);
                        return;
                    }

                    if (isSeedCategory(name, href)) {
                        const category = parseCategory(name, href, 0);
                        categories.push(category);
                        log.info(`[Navigation] ✅ ${category.name} (${category.slug}) [${category.seedType || 'MIXED'}]`);
                    } else {
                        log.info(`[Navigation] ⏭️  Skipping: ${name}`);
                    }
                });

                log.info(`[Navigation] Total categories found: ${categories.length}`);
            },

            maxRequestRetries: 3,
            requestHandlerTimeoutSecs: 30,
        });

        await crawler.run([BASE_URL]);
        return categories;
    }

    /**
     * Check if link is a seed category (not supplies, contact, etc.)
     */
    private isSeedCategory(name: string, url: string): boolean {
        const nameLower = name.toLowerCase();

        // Exclude non-seed categories
        const excludePatterns = [
            'supplies',        // Marijuana Grow Supplies
            'contact',         // Contact Us
            'thc products',    // External THC products
            'shop all',        // General shop page
        ];

        for (const pattern of excludePatterns) {
            if (nameLower.includes(pattern)) {
                return false;
            }
        }

        // Must be an .html page
        return url.endsWith('.html');
    }

    /**
     * Parse category metadata from name and URL
     */
    private parseCategory(
        name: string,
        url: string,
        level: number,
        parent?: string
    ): CategoryMetadata {
        // Extract slug from URL
        const slug = url
            .replace(BASE_URL, '')
            .replace(/^\//, '')
            .replace('.html', '')
            .replace(/\/$/, '');

        // Ensure relative URLs are handled
        if (!url.startsWith('http')) {
            url = url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`;
        }

        // Infer seed type from name
        const seedType = this.inferSeedType(name);

        return {
            name,
            slug,
            url,
            level,
            seedType,
            parent: level === 1 ? parent : undefined,
        };
    }

    /**
     * Infer seed type from category name
     */
    private inferSeedType(name: string): SeedType | undefined {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('feminized')) return SeedType.FEMINIZED;
        if (nameLower.includes('autoflower')) return SeedType.AUTOFLOWER;
        if (nameLower.includes('regular')) return SeedType.REGULAR;
        if (nameLower.includes('fast')) return SeedType.FAST_VERSION;
        if (nameLower.includes('cbd')) return SeedType.CBD;
        if (nameLower.includes('mix') || nameLower.includes('collection')) {
            return SeedType.MIXED;
        }

        return undefined;
    }
}
