import { BASE_URL, PRODUCT_CARD_SELECTORS } from '@/scrapers/vancouverseedbank/core/selectors';
import { ProductCardDataFromCrawling } from '@/types/crawl.type';

/**
 * extractProductsFromHTML - Pure extraction function
 * 
 * Nhiệm vụ:
 * - Nhận vào HTML đã load sẵn (Cheerio $ object)
 * - Parse và extract dữ liệu từ các product cards
 * - Trả về array ProductCardDataFromCrawling[]
 * 
 * Khác với ProductListScraper:
 * - Function này KHÔNG crawl web (không fetch HTML)
 * - KHÔNG xử lý pagination
 * - KHÔNG quản lý crawler lifecycle
 * - Chỉ parse HTML → extract data
 * 
 * Sử dụng:
 * - Được gọi bởi VancouverSeedBankProductListScraper.scrapeProductList()
 * - Được gọi bởi scrape-batch.ts
 * - Có thể dùng riêng khi đã có HTML sẵn
 * 
 * @param $ - Cheerio loaded HTML object
 * @returns Array of ProductCardData
 */
export function extractProductsFromHTML($: ReturnType<typeof import('cheerio').load>): ProductCardDataFromCrawling[] {
    const products: ProductCardDataFromCrawling[] = [];
    const seenUrls = new Set<string>();

    $(PRODUCT_CARD_SELECTORS.productCard).each((_, element) => {
        try {
            const $card = $(element);

            // Extract product link and URL
            const $link = $card.find(PRODUCT_CARD_SELECTORS.productLink).first();
            let url = $link.attr('href');
            if (!url) return;

            // Resolve relative URL
            if (!url.startsWith('http')) {
                url = url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`;
            }

            // Skip duplicates
            if (seenUrls.has(url)) return;
            seenUrls.add(url);

            // Extract product name
            const name = $link.text().trim();
            if (!name) return;

            // Extract image - prioritize data-src over src (lazy loading)
            const $img = $card.find(PRODUCT_CARD_SELECTORS.productImage).first();
            const imageUrl = $img.attr('data-src') ||
                $img.attr('data-lazy-src') ||
                $img.attr('src');

            // Skip if image is placeholder SVG
            const finalImageUrl = (imageUrl && !imageUrl.startsWith('data:image/svg'))
                ? (imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`)
                : undefined;

            // Extract strain type (Balanced Hybrid, Indica Dominant, etc.)
            const strainType = $card.find(PRODUCT_CARD_SELECTORS.strainType).first().text().trim() || undefined;

            // Extract badge (New Strain 2025, BOGO, etc.)
            const badge = $card.find(PRODUCT_CARD_SELECTORS.badge).first().text().trim() || undefined;

            // Extract rating
            const ratingText = $card.find(PRODUCT_CARD_SELECTORS.rating).first().text().trim();
            const rating = ratingText ? parseFloat(ratingText) : undefined;

            // Extract review count - remove parentheses
            const reviewCountText = $card.find(PRODUCT_CARD_SELECTORS.reviewCount).first().text().trim();
            const reviewCountMatch = reviewCountText.match(/\d+/);
            const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[0]) : undefined;

            // Extract THC level
            const thcLevelText = $card.find(PRODUCT_CARD_SELECTORS.thcLevel).first().text().trim();
            let thcMin: number | undefined;
            let thcMax: number | undefined;

            if (thcLevelText) {
                // Parse "THC 17%" or "THC 20-23%"
                const thcMatch = thcLevelText.match(/(\d+(?:\.\d+)?)-?(\d+(?:\.\d+)?)?%?/);
                if (thcMatch) {
                    thcMin = parseFloat(thcMatch[1]);
                    thcMax = thcMatch[2] ? parseFloat(thcMatch[2]) : thcMin;
                }
            }

            // Extract CBD level
            const cbdLevelText = $card.find(PRODUCT_CARD_SELECTORS.cbdLevel).first().text().trim();
            let cbdMin: number | undefined;
            let cbdMax: number | undefined;

            if (cbdLevelText) {
                // Parse "CBD : 1%" or "CBD : 0.5-1%"
                const cbdMatch = cbdLevelText.match(/(\d+(?:\.\d+)?)-?(\d+(?:\.\d+)?)?%?/);
                if (cbdMatch) {
                    cbdMin = parseFloat(cbdMatch[1]);
                    cbdMax = cbdMatch[2] ? parseFloat(cbdMatch[2]) : cbdMin;
                }
            }

            // Extract flowering time
            const floweringTime = $card.find(PRODUCT_CARD_SELECTORS.floweringTime).first().text().trim() || undefined;

            // Extract growing level
            const growingLevel = $card.find(PRODUCT_CARD_SELECTORS.growingLevel).first().text().trim() || undefined;

            // Extract all pricing variations
            // Vancouver Seed Bank shows multiple variations (5 seeds, 10 seeds, 25 seeds)
            const pricings: Array<{ totalPrice: number; packSize: number; pricePerSeed: number }> = [];

            $card.find(PRODUCT_CARD_SELECTORS.variationInputs).each((_, input) => {
                const $input = $(input);
                const itemPrice = $input.attr('item-price');
                const value = $input.attr('value'); // e.g., "5-seeds", "10-seeds", "25-seeds"

                // Extract pack size from value attribute (e.g., "5-seeds" -> 5)
                const packSizeMatch = value?.match(/(\d+)-seed/i);

                if (itemPrice && packSizeMatch) {
                    const totalPrice = parseFloat(itemPrice);
                    const packSize = parseInt(packSizeMatch[1]);
                    const pricePerSeed = totalPrice / packSize;

                    pricings.push({
                        totalPrice,
                        packSize,
                        pricePerSeed,
                    });
                }
            });

            // Generate slug
            const slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            products.push({
                name,
                url,
                slug,
                imageUrl: finalImageUrl,
                strainType,
                badge,
                rating,
                reviewCount,
                thcLevel: thcLevelText || undefined,
                thcMin,
                thcMax,
                cbdLevel: cbdLevelText || undefined,
                cbdMin,
                cbdMax,
                floweringTime,
                growingLevel,
                pricings,
            });

        } catch (error) {
            console.error('[Product List] Error parsing product card:', error);
        }
    });

    return products;
}