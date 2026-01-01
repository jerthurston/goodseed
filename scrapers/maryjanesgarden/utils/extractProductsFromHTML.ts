/**
 * extractProductsFromHTML - Mary Jane's Garden extraction function
 * 
 * Based on Beaver Seed structure but adapted for WordPress standard pagination
 * 
 * Features:
 * - Extract products from WooCommerce structure (same as Beaver Seed)
 * - Handle WordPress standard pagination (different from Beaver Seed)
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

import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { ProductCardDataFromCrawling } from '@/types/crawl.type';
import { MARYJANESGARDEN_PRODUCT_CARD_SELECTORS, MAXPAGE_PAGINATION } from '../core/selector';

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
    const selectors = MARYJANESGARDEN_PRODUCT_CARD_SELECTORS;
    const { baseUrl } = siteConfig;

    $(selectors.productCard).each((_, element) => {
        try {
            const $card = $(element);

            // Extract product link and URL
            const $link = $card.find(selectors.productLink).first();
            let url = $link.attr('href');
            if (!url) return;

            // Make URL absolute if it's relative
            if (url.startsWith('/')) {
                url = baseUrl + url;
            }

            // Skip duplicates
            if (seenUrls.has(url)) return;
            seenUrls.add(url);

            // Extract product name
            const name = $link.text().trim();
            if (!name) return;

            // Generate slug from name
            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();

            // Extract image - Handle lazy loading
            let imageUrl = '';
            const $imgElement = $card.find(selectors.productImage);
            
            // Try different image sources for lazy loading
            imageUrl = $imgElement.attr('data-src') ||      // Lazy loading data-src
                      $imgElement.attr('data-lazy-src') ||  // Alternative lazy loading
                      $imgElement.attr('src') ||             // Standard src
                      '';
            
            // Make URL absolute if it's relative
            if (imageUrl && imageUrl.startsWith('/')) {
                imageUrl = baseUrl + imageUrl;
            }
            
            // Skip placeholder SVG images
            if (imageUrl.includes('data:image/svg+xml') || imageUrl.includes('placeholder')) {
                // Try to find real image in other attributes
                const realImageUrl = $imgElement.attr('data-original') || 
                                   $imgElement.attr('data-srcset')?.split(' ')[0] ||
                                   '';
                if (realImageUrl && !realImageUrl.includes('placeholder')) {
                    imageUrl = realImageUrl.startsWith('http') ? realImageUrl : baseUrl + realImageUrl;
                } else {
                    imageUrl = ''; // Set empty if only placeholder found
                }
            }

            // Extract cannabis type/strain type
            const cannabisTypeRaw = $card.find(selectors.strainType).first().text().trim() || undefined;
            const cannabisType = cannabisTypeRaw?.replace(/^Type\s*:\s*/, '').trim() || undefined;

            // Extract badge/tag information
            const badge = $card.find(selectors.badge).first().text().trim() || undefined;

            // Extract rating if available (following Beaver Seed pattern)
            let rating: number | undefined;
            const ratingElement = $card.find(selectors.rating).first();
            if (ratingElement.length > 0) {
                const ratingText = ratingElement.text().trim();
                const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
                if (ratingMatch) {
                    rating = parseFloat(ratingMatch[1]);
                }
            }

            // Extract review count if available
            let reviewCount: number | undefined;
            const reviewElement = $card.find(selectors.reviewCount).first();
            if (reviewElement.length > 0) {
                const reviewText = reviewElement.text().trim();
                const reviewMatch = reviewText.match(/(\d+)/);
                if (reviewMatch) {
                    reviewCount = parseInt(reviewMatch[1]);
                }
            }

            // Extract cannabis-specific metadata from custom-acf-prod (following Beaver Seed pattern)
            let thcLevel = '';
            let thcMin: number | undefined;
            let thcMax: number | undefined;
            let cbdLevel = '';
            let cbdMin: number | undefined;
            let cbdMax: number | undefined;
            let floweringTime = '';
            let growingLevel = '';

            // Extract THC, CBD, etc. from custom-acf-prod
            $card.find('.custom-acf-prod .elementor-icon-list-item').each((_, metaElement) => {
                const $meta = $(metaElement);
                const text = $meta.find('.elementor-icon-list-text').text().trim();
                
                if (text.includes('THC :')) {
                    thcLevel = text.replace('THC :', '').trim();
                    
                    // Parse THC range following Beaver Seed pattern
                    if (thcLevel) {
                        const thcMatch = thcLevel.match(/(\d+(?:\.\d+)?)[\s%-]*(?:to|-)\s*(\d+(?:\.\d+)?)?%?/);
                        if (thcMatch) {
                            thcMin = parseFloat(thcMatch[1]);
                            thcMax = thcMatch[2] ? parseFloat(thcMatch[2]) : thcMin;
                        }
                    }
                } else if (text.includes('CBD :')) {
                    cbdLevel = text.replace('CBD :', '').trim();
                    
                    // Parse CBD range following Beaver Seed pattern
                    if (cbdLevel) {
                        const cbdMatch = cbdLevel.match(/(\d+(?:\.\d+)?)[\s%-]*(?:to|-)\s*(\d+(?:\.\d+)?)?%?/);
                        if (cbdMatch) {
                            cbdMin = parseFloat(cbdMatch[1]);
                            cbdMax = cbdMatch[2] ? parseFloat(cbdMatch[2]) : cbdMin;
                        }
                    }
                } else if (text.includes('Flowering :')) {
                    floweringTime = text.replace('Flowering :', '').trim();
                } else if (text.includes('Growing Level :')) {
                    growingLevel = text.replace('Growing Level :', '').trim();
                }
            });

            // Extract price variations (following Beaver Seed pattern)
            const pricings: Array<{ totalPrice: number; packSize: number; pricePerSeed: number }> = [];
            $card.find(selectors.variationInputs).each((_, variationElement) => {
                const $variation = $(variationElement);
                const itemPrice = $variation.attr('item-price');
                const value = $variation.attr('value');
                
                if (itemPrice && value) {
                    // Extract seeds count from value (e.g., "5-seeds" -> "5")
                    const seedsMatch = value.match(/(\d+)-seeds?/);
                    const seedCount = seedsMatch ? parseInt(seedsMatch[1], 10) : 1;
                    const totalPrice = parseFloat(itemPrice);
                    const pricePerSeed = totalPrice / seedCount;
                    
                    pricings.push({
                        totalPrice,
                        packSize: seedCount,
                        pricePerSeed,
                    });
                }
            });

            // Build product card data (following Beaver Seed pattern)
            const productCard: ProductCardDataFromCrawling = {
                name,
                url,
                slug,
                imageUrl,
                cannabisType,
                badge,
                rating,
                reviewCount,
                thcLevel: thcLevel || undefined,
                thcMin,
                thcMax,
                cbdLevel: cbdLevel || undefined,
                cbdMin,
                cbdMax,
                floweringTime: floweringTime || undefined,
                growingLevel: growingLevel || undefined,
                pricings,
            };

            products.push(productCard);

        } catch (error) {
            apiLogger.logError('[Mary Jane\'s Garden] Product extraction error', error instanceof Error ? error : new Error('Unknown error'));
        }
    });

    // Extract maximum page number from WordPress pagination (following Beaver Seed pattern)
    let maxPages: number | null = null;
    
    // 🎯 CASE 1: Test Mode - startPage and endPage are provided
    if (startPage !== null && startPage !== undefined && 
        endPage !== null && endPage !== undefined) {
        
        // Validate range logic
        if (endPage >= startPage) {
            maxPages = endPage;
            apiLogger.info(`[Mary Jane's Garden Pagination] TEST MODE: Using custom range startPage=${startPage}, endPage=${endPage} → maxPages=${maxPages}`);
        } else {
            apiLogger.warn(`[Mary Jane's Garden Pagination] Invalid range: endPage (${endPage}) < startPage (${startPage}), falling back to auto-detection`);
        }
    } 
    // 🚀 CASE 2: Auto/Manual Mode - WordPress pagination detection
    else {
        try {
            let maxPageFound = 0;
            
            // Check if WordPress pagination container exists
            const $paginationContainer = $(MAXPAGE_PAGINATION.paginationContainer);
            if ($paginationContainer.length > 0) {
                console.log('[DEBUG] WordPress pagination found, analyzing pages...');
                
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
                        console.log(`[DEBUG] Found page item: ${pageNumber} (text: ${pageText})`);
                    }
                });
                
                console.log('[DEBUG] Max page detected from WordPress pagination:', maxPageFound);
                
                maxPages = maxPageFound > 0 ? maxPageFound : null;
                
                if (maxPages) {
                    apiLogger.debug(`[Mary Jane's Garden Pagination] AUTO-DETECTED: ${maxPages} total pages from WordPress pagination`);
                }
            } else {
                apiLogger.warn('[Mary Jane Garden Pagination] No WordPress pagination container found on this page');
            }
        } catch (error) {
            apiLogger.logError('[Mary Jane Garden Max Pages] Error parsing pagination:', {error});
        }

        // Ultimate fallback: use database maxPage value if no pagination detected
        if (maxPages === null && dbMaxPage && dbMaxPage > 0) {
            maxPages = dbMaxPage;
            apiLogger.info(`[Mary Jane's Garden Pagination] AUTO/MANUAL MODE FALLBACK: maxPages = ${dbMaxPage}`);
        }
    }

    return { products, maxPages };
}