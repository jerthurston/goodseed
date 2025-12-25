import { ManualSelectors } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { VANCOUVERSEEDBANK_PRODUCT_CARD_SELECTORS } from '@/scrapers/vancouverseedbank/core/selectors';
import { ProductCardDataFromCrawling } from '@/types/crawl.type';

/**
 * extractProductsFromHTML - Pure extraction function
 * 
 * Nhiệm vụ:
 * - Nhận vào HTML đã load sẵn (Cheerio $ object)
 * - Parse và extract dữ liệu từ các product cards
 * - Extract thông tin pagination (maxPages)
 * - Trả về object chứa products và maxPages
 * 
 * Khác với ProductListScraper:
 * - Function này KHÔNG crawl web (không fetch HTML)
 * - KHÔNG xử lý pagination navigation
 * - KHÔNG quản lý crawler lifecycle
 * - Chỉ parse HTML → extract data + pagination info
 * 
 * Sử dụng:
 * - Được gọi bởi VancouverSeedBankProductListScraper.scrapeProductList()
 * - Được gọi bởi scrape-batch.ts
 * - Có thể dùng riêng khi đã có HTML sẵn
 * 
 * @param $ - Cheerio loaded HTML object
 * @returns Object với products array và maxPages number
 */
export function extractProductsFromHTML(
    $: ReturnType<typeof import('cheerio').load>, 
    selectors: ManualSelectors,
    baseUrl:string,
    dbMaxPage?: number
): {
    products: ProductCardDataFromCrawling[];
    maxPages: number | null;
    
} {
    const products: ProductCardDataFromCrawling[] = [];
    const seenUrls = new Set<string>();

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

            // Extract cannabis type (Balanced Hybrid, Indica Dominant, etc.)
            const cannabisType = $card.find(selectors.strainType).first().text().trim() || undefined;

            // Extract badge (New Strain 2025, BOGO, etc.)
            const badge = $card.find(selectors.badge).first().text().trim() || undefined;

            // Extract rating
            const ratingText = $card.find(selectors.rating).first().text().trim();
            const rating = ratingText ? parseFloat(ratingText) : undefined;

            // Extract review count - remove parentheses
            const reviewCountText = $card.find(selectors.reviewCount).first().text().trim();
            const reviewCountMatch = reviewCountText.match(/\d+/);
            const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[0]) : undefined;

            // Extract THC level
            const thcLevelText = $card.find(selectors.thcLevel).first().text().trim();
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
            const cbdLevelText = $card.find(selectors.cbdLevel).first().text().trim();
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
            const floweringTime = $card.find(selectors.floweringTime).first().text().trim() || undefined;

            // Extract growing level
            const growingLevel = $card.find(selectors.growingLevel).first().text().trim() || undefined;

            // Extract all pricing variations
            // Vancouver Seed Bank shows multiple variations (5 seeds, 10 seeds, 25 seeds)
            const pricings: Array<{ totalPrice: number; packSize: number; pricePerSeed: number }> = [];

            $card.find(selectors.variationInputs).each((_, input) => {
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
            console.error('[Product List] Error parsing product card:', error);
        }
    });

    // Extract maximum page number from pagination using selectors
    let maxPages: number | null = null;
    try {
        let maxPageFound = 0;
        
        // Check if pagination container exists (WooCommerce standard)
        const $paginationContainer = $(selectors.paginationContainer);
        if ($paginationContainer.length > 0) {
            console.log('[DEBUG] WooCommerce pagination found, analyzing pages...');
            
            // Find all page links with /page/ in href
            $(selectors.paginationItems).each((_, element) => {
                const $item = $(element);
                const href = $item.attr('href');
                
                if (href && href.includes('/page/')) {
                    // Extract page number from href like "/shop/page/154/"
                    const match = href.match(/\/page\/(\d+)\//);
                    if (match) {
                        const pageNumber = parseInt(match[1]);
                        if (pageNumber > maxPageFound) {
                            maxPageFound = pageNumber;
                        }
                        console.log(`[DEBUG] Found page link: ${pageNumber} (href: ${href})`);
                    }
                }
            });
            
            // Also check text content of .page-numbers for numeric values  
            $('.page-numbers').each((_, element) => {
                const $item = $(element);
                const text = $item.text().trim();
                
                if (/^\d+$/.test(text)) {
                    const pageNumber = parseInt(text);
                    if (pageNumber > maxPageFound) {
                        maxPageFound = pageNumber;
                    }
                }
            });
            
            console.log('[DEBUG] Max page detected:', maxPageFound);
            
            maxPages = maxPageFound > 0 ? maxPageFound : null;
            
            if (maxPages) {
                apiLogger.debug(`[Extract Pagination] Detected ${maxPages} total pages from WooCommerce pagination`);
            }
        } else {
            apiLogger.warn('[Extract Pagination] No WooCommerce pagination container found on this page');
        }
    } catch (error) {
        apiLogger.logError('[Extract Max Pages] Error parsing pagination:', {error});
    }

    // Ultimate fallback: use database maxPage value if no pagination detected
    if (!maxPages && dbMaxPage && dbMaxPage > 0) {
        maxPages = dbMaxPage;
        apiLogger.info(`[Extract Pagination] Using database fallback: maxPages = ${dbMaxPage}`);
    }

    return {
        products,
        maxPages
    };
}

