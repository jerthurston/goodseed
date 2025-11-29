import { slugify } from '@/lib/utils';
import * as cheerio from 'cheerio';
import {
    DispensaryProductData,
    DispensaryProductScraper,
    DispensaryProductScraperConfig,
} from '../dispensary-product-scraper';

/**
 * Scraper for Fire & Flower products
 * Website: https://fireandflower.com
 * 
 * Note: This is a template. The actual selectors need to be adjusted
 * based on the real website structure after inspecting the HTML.
 */
export class FireFlowerProductScraper extends DispensaryProductScraper {
    constructor(config: Omit<DispensaryProductScraperConfig, 'name' | 'baseUrl'>) {
        super({
            ...config,
            name: 'FireFlower',
            baseUrl: 'https://fireandflower.com',
            delayMs: config.delayMs || 3000,
            maxRetries: config.maxRetries || 3,
        });
    }

    protected getPageUrl(pageNumber: number): string {
        // Example URL structure - adjust based on actual website
        // Most dispensaries use query params: ?page=1 or /products?p=1
        return `${this.config.baseUrl}/products?page=${pageNumber}`;
    }

    protected extractProductsFromHtml(
        html: string,
        pageNumber: number
    ): DispensaryProductData[] {
        const $ = cheerio.load(html);
        const products: DispensaryProductData[] = [];

        /**
         * TODO: Update selectors based on actual website structure
         * 
         * Common patterns to look for:
         * - Product cards: .product-card, .product-item, [data-product]
         * - Product name: .product-title, .product-name, h3
         * - Price: .price, .product-price, [data-price]
         * - Image: img.product-image
         * - THC/CBD: .thc-content, .cbd-content, .potency
         * - Brand: .brand-name, .product-brand
         * - Type/Category: .product-type, .category
         */

        // Example structure (needs to be updated):
        $('.product-card').each((_, element) => {
            try {
                const $product = $(element);

                // Extract basic info
                const name = $product.find('.product-name').text().trim();
                if (!name) return; // Skip if no name

                const priceText = $product.find('.price').text().trim();
                const price = this.parsePrice(priceText);

                const imageUrl = $product.find('img').attr('src');
                const productUrl = $product.find('a').attr('href');
                const brand = $product.find('.brand').text().trim();
                const typeText = $product.find('.product-type').text().trim();
                const type = this.parseProductType(typeText);

                // Extract THC/CBD
                const potencyText = $product.find('.potency').text();
                const thc = this.extractThc(potencyText);
                const cbd = this.extractCbd(potencyText);

                // Extract weight
                const weightText = $product.find('.weight').text().trim();
                const weight = this.parseWeight(weightText);

                // Check availability
                const isAvailable = !$product.find('.out-of-stock').length;
                const quantity = isAvailable ? 100 : 0; // Default quantity

                // Extract description (if available on list page)
                const description = $product.find('.description').text().trim();

                // Try to extract strain name from product name
                // Example: "Blue Dream - 3.5g" -> strain name is "Blue Dream"
                const strainName = this.extractStrainName(name);

                const product: DispensaryProductData = {
                    dispensaryId: this.dispensaryId,
                    name,
                    slug: slugify(name),
                    brand: brand || undefined,
                    type,
                    thc,
                    cbd,
                    weight,
                    price,
                    quantity,
                    isAvailable,
                    description: description || undefined,
                    imageUrl: imageUrl ? this.resolveUrl(imageUrl) : undefined,
                    productUrl: productUrl ? this.resolveUrl(productUrl) : undefined,
                    strainName,
                };

                products.push(product);
            } catch (error) {
                this.logError(error, `Parsing product on page ${pageNumber}`);
            }
        });

        return products;
    }

    /**
     * Extract strain name from product name
     * Example: "Blue Dream - 3.5g Dried Flower" -> "Blue Dream"
     */
    private extractStrainName(productName: string): string | undefined {
        // Remove common suffixes
        let cleaned = productName
            .replace(/\s*-\s*\d+\.?\d*\s*(g|mg|ml|oz).*/i, '') // Remove weight
            .replace(/\s*(dried|flower|pre-roll|vape|edible|concentrate).*/i, '') // Remove type
            .replace(/\s*\(.*\)/, '') // Remove parentheses
            .trim();

        return cleaned || undefined;
    }

    /**
     * Resolve relative URLs to absolute
     */
    private resolveUrl(url: string): string {
        if (url.startsWith('http')) return url;
        if (url.startsWith('//')) return `https:${url}`;
        if (url.startsWith('/')) return `${this.config.baseUrl}${url}`;
        return `${this.config.baseUrl}/${url}`;
    }
}
