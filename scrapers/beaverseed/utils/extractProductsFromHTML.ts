import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger'
;
import { ProductCardDataFromCrawling } from '@/types/crawl.type';
import { BEAVERSEED_PRODUCT_CARD_SELECTORS, MAXPAGE_PAGINATION } from '../core/selector';

/**
 * extractProductsFromHTML - Beaver Seed extraction function
 * 
 * Based on Vancouver Seed Bank structure but adapted for jet-smart-filters pagination
 * 
 * Features:
 * - Extract products from WooCommerce structure (same as Vancouver)
 * - Handle jet-smart-filters pagination (different from Vancouver)
 * - Extract cannabis-specific data (THC/CBD, strain type, flowering time)
 * - Support price variations and ratings
 * 
 * @param $ - Cheerio loaded HTML object
 * @param siteConfig - Site configuration với selectors và baseUrl
 * @param dbMaxPage - Database max page fallback
 * @param startPage - Start page number (có thể null)
 * @param endPage - End page number (có thể null) 
 * @param fullSiteCrawl - Full site crawl flag (fallback khi không có startPage/endPage)
 * @returns Object với products array và maxPages number
 */
export function extractProductsFromHTML(
    $: ReturnType<typeof import('cheerio').load>,
    siteConfig: SiteConfig,
    dbMaxPage?: number,
    startPage?: number | null,
    endPage?: number | null,
    fullSiteCrawl?: boolean | null,
): {
    products: ProductCardDataFromCrawling[];
    maxPages: number | null;

} {
    const products: ProductCardDataFromCrawling[] = [];
    const seenUrls = new Set<string>();
    const selectors = BEAVERSEED_PRODUCT_CARD_SELECTORS;
    const { baseUrl } = siteConfig;

    $(selectors.productCard).each((_, element) => {
        try {
            const $card = $(element);

            // Extract product link and URL
            const $link = $card.find(selectors.productLink).first();
            let url = $link.attr('href');
            if (!url) return;

            // Resolve relative URL
            if (!url.startsWith('http')) {
                url = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
            }

            // Skip duplicates
            if (seenUrls.has(url)) return;
            seenUrls.add(url);

            // Extract product name
            const name = $link.text().trim();
            if (!name) return;

            // Extract image - prioritize data-src over src (lazy loading)
            const $img = $card.find(selectors.productImage).first();
            const imageUrl = $img.attr('data-src') ||
                $img.attr('data-lazy-src') ||
                $img.attr('src');

            // Skip if image is placeholder SVG
            const finalImageUrl = (imageUrl && !imageUrl.startsWith('data:image/svg'))
                ? (imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`)
                : undefined;

            // Extract cannabis type (Indica Dominant Hybrid, etc.)
            const cannabisType = $card.find(selectors.strainType).first().text().trim() || undefined;

            // Extract badge (Sale, New Strain, etc.)
            const badge = $card.find(selectors.badge).first().text().trim() || undefined;

            // Extract rating
            const ratingText = $card.find(selectors.rating).first().text().trim();
            const rating = ratingText ? parseFloat(ratingText) : undefined;

            // Extract review count from rating aria-label
            const $ratingElement = $card.find(selectors.ratingAriaLabel).first();
            const ariaLabel = $ratingElement.attr('aria-label') || '';
            const reviewCountMatch = ariaLabel.match(/based on\s+(\d+)\s+customer/);
            const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1]) : undefined;

            // Extract THC level
            const thcLevelText = $card.find(selectors.thcLevel).first().text().trim();
            let thcMin: number | undefined;
            let thcMax: number | undefined;

            if (thcLevelText) {
                // Parse "THC 23-30%", "THC 21.5% to 25%", or "THC 1%"
                const thcMatch = thcLevelText.match(/(\d+(?:\.\d+)?)[\s%-]*(?:to|-)\s*(\d+(?:\.\d+)?)?%?/);
                if (thcMatch) {
                    thcMin = parseFloat(thcMatch[1]);
                    thcMax = thcMatch[2] ? parseFloat(thcMatch[2]) : thcMin;
                }
            }

            // Extract CBD level
            const cbdLevelText = $card.find(selectors.cbdLevel).first().text().trim();
            let cbdMin: number | undefined;
            let cbdMax: number | undefined;

            if (cbdLevelText) {
                // Parse "CBD : 0.97% to 1.29%" or "CBD : Low"
                const cbdMatch = cbdLevelText.match(/(\d+(?:\.\d+)?)[\s%-]*(?:to|-)\s*(\d+(?:\.\d+)?)?%?/);
                if (cbdMatch) {
                    cbdMin = parseFloat(cbdMatch[1]);
                    cbdMax = cbdMatch[2] ? parseFloat(cbdMatch[2]) : cbdMin;
                }
            }

            // Extract flowering time - get text after the colon
            const floweringTimeRaw = $card.find(selectors.floweringTime).first().text().trim() || undefined;
            const floweringTime = floweringTimeRaw?.replace(/^Flowering\s*:\s*/, '').trim() || undefined;            // Extract growing level - get text after the colon
            const growingLevelRaw = $card.find(selectors.growingLevel).first().text().trim() || undefined;
            const growingLevel = growingLevelRaw?.replace(/^Growing Level\s*:\s*/, '').trim() || undefined;

            // Extract all pricing variations
            // Beaver Seed shows multiple variations (5 seeds, 10 seeds, 25 seeds)
            const pricings: Array<{ totalPrice: number; packSize: number; pricePerSeed: number }> = [];

            $card.find(selectors.variationInputs).each((_, input) => {
                const $input = $(input);
                const itemPrice = $input.attr('item-price');
                const value = $input.attr('value'); // e.g., "5-seeds", "10-seeds", "25-seeds"

                // Extract pack size from value attribute (e.g., "5-seeds" -> 5)
                const packSizeMatch = value?.match(/(\d+)-seeds?/i);

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
                cannabisType,
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
            apiLogger.logError('[Beaver Seed] Error parsing product card:', error as Error);
        }
    });

    // Extract maximum page number from jet-smart-filters pagination
    let maxPages: number | null = null;

    // 🎯 CASE 1: Test Mode - startPage và endPage được truyền vào
    if (startPage !== null && startPage !== undefined &&
        endPage !== null && endPage !== undefined) {

        // Validate range logic
        if (endPage >= startPage) {
            maxPages = endPage;
            apiLogger.info(`[Beaver Seed Pagination] TEST MODE: Using custom range startPage=${startPage}, endPage=${endPage} → maxPages=${maxPages}`);
        } else {
            apiLogger.warn(`[Beaver Seed Pagination] Invalid range: endPage (${endPage}) < startPage (${startPage}), falling back to auto-detection`);
        }
    }
    // 🚀 CASE 2: Auto/Manual Mode - jet-smart-filters pagination detection
    else {
        try {
            let maxPageFound = 0;

            // Check if WordPress pagination container exists
            const $paginationContainer = $(MAXPAGE_PAGINATION.paginationContainer);
            if ($paginationContainer.length > 0) {
                // Removed debug log - not critical

                // Find all page number links
                $(MAXPAGE_PAGINATION.paginationItems).each((_, element) => {
                    const $item = $(element);
                    const pageText = $item.text().trim();

                    // Extract page number from text content
                    if (/^\d+$/.test(pageText)) {
                        const pageNumber = parseInt(pageText);
                        if (pageNumber > maxPageFound) {
                            maxPageFound = pageNumber;
                        }
                    }
                });

                maxPages = maxPageFound > 0 ? maxPageFound : null;

                if (maxPages) {
                    apiLogger.debug(`[Beaver Seed Pagination] AUTO-DETECTED: ${maxPages} total pages from WordPress pagination`);
                }
            } else {
                apiLogger.warn('[Beaver Seed Pagination] No WordPress pagination container found on this page');
            }
        } catch (error) {
            apiLogger.logError('[Beaver Seed Max Pages] Error parsing pagination:', { error });
        }

        // Ultimate fallback: use database maxPage value if no pagination detected
        if (maxPages === null && dbMaxPage && dbMaxPage > 0) {
            maxPages = dbMaxPage;
            apiLogger.info(`[Beaver Seed Pagination] AUTO/MANUAL MODE FALLBACK: maxPages = ${dbMaxPage}`);
        }
    }

    return {
        products,
        maxPages
    };
}

/**
 * 📋 BEAVER SEED PAGINATION NOTES:
 * 
 * ✅ DIFFERENCES FROM VANCOUVER SEED BANK:
 * - Uses jet-smart-filters-pagination instead of WooCommerce pagination
 * - Page numbers stored in data-value attribute instead of href
 * - Different DOM structure but same extraction logic
 * 
 * 🎯 PAGINATION STRATEGY:
 * 1. TEST MODE: Use custom startPage/endPage range
 * 2. AUTO/MANUAL MODE: Extract from jet-smart-filters data-value attributes
 * 3. FALLBACK: Use dbMaxPage if no pagination detected
 * 
 * 📊 EXPECTED STRUCTURE:
 * - .page-numbers:not(.prev):not(.next):not(.current) for page links
 * - Text content contains page numbers (1, 2, 3, ..., 48)
 * - /page/N/ URL format for navigation
 */