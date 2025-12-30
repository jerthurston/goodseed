import { ManualSelectors } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';
import { ProductCardDataFromCrawling, PricingData } from '@/types/crawl.type';

/**
 * extractProductsFromHTML - Pure extraction function for Sonoma Seeds
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
 * - Được gọi bởi SonomaSeedsProductListScraper.scrapeProductList()
 * - Được gọi bởi scrape-batch.ts
 * - Có thể dùng riêng khi đã có HTML sẵn
 * 
 * @param $ - Cheerio loaded HTML object
 * @param selectors - CSS selectors for Sonoma Seeds
 * @param baseUrl - Base URL for resolving relative links
 * @param dbMaxPage - Optional maximum pages limit
 * @returns Object với products array và maxPages number
 */
export function extractProductsFromHTML(
    $: ReturnType<typeof import('cheerio').load>, 
    selectors: ManualSelectors,
    baseUrl: string,
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

            // Ensure absolute URL
            if (url.startsWith('/')) {
                url = `${baseUrl}${url}`;
            } else if (!url.startsWith('http')) {
                url = `${baseUrl}/${url}`;
            }

            // Skip duplicates
            if (seenUrls.has(url)) return;
            seenUrls.add(url);

            // Extract product name
            const name = $link.text().trim();
            if (!name) return;

            // Generate slug from URL or name
            let slug = '';
            const urlParts = url.split('/');
            const lastPart = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
            if (lastPart && lastPart !== '') {
                slug = lastPart.replace(/\/$/, '');
            } else {
                slug = name.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/[\s_-]+/g, '-')
                    .trim();
            }

            // Extract image - prioritize data-src for lazy loading
            const $img = $card.find(selectors.productImage).first();
            let imageUrl = $img.attr('data-src') || $img.attr('src') || '';
            
            // Handle other lazy loading attributes
            if (!imageUrl) {
                imageUrl = $img.attr('data-lazy') || 
                          $img.attr('data-original') || 
                          $img.attr('data-srcset')?.split(',')[0]?.split(' ')[0] || 
                          '';
            }

            // Skip placeholder SVG images
            if (imageUrl && imageUrl.includes('data:image/svg+xml')) {
                imageUrl = $img.attr('data-src') || $img.attr('data-lazy') || $img.attr('data-original') || '';
            }

            // Ensure absolute image URL
            if (imageUrl && imageUrl.startsWith('/')) {
                imageUrl = `${baseUrl}${imageUrl}`;
            }

            // Extract strain type (Indica/Sativa/Hybrid)
            let strainType = '';
            const $strainElement = $card.find(selectors.strainType).first();
            if ($strainElement.length > 0) {
                strainType = $strainElement.text().trim();
            }

            // Extract THC level and format
            let thcMin = null, thcMax = null, thcLevel = '';
            const $thcElement = $card.find(selectors.thcLevel);
            if ($thcElement.length > 0) {
                const thcText = $thcElement.text();
                const thcMatch = thcText.match(/(\d+(?:\.\d+)?)/);
                if (thcMatch) {
                    const thcValue = parseFloat(thcMatch[1]);
                    thcMin = thcMax = thcValue;
                    thcLevel = `THC ${thcValue}%`;
                }
            }

            // Extract CBD level and format
            let cbdMin = null, cbdMax = null, cbdLevel = '';
            const $cbdElement = $card.find(selectors.cbdLevel);
            if ($cbdElement.length > 0) {
                const cbdText = $cbdElement.text();
                const cbdMatch = cbdText.match(/(\d+(?:\.\d+)?)/);
                if (cbdMatch) {
                    const cbdValue = parseFloat(cbdMatch[1]);
                    cbdMin = cbdMax = cbdValue;
                    cbdLevel = `CBD : ${cbdValue}%`;
                }
            }

            // Extract flowering time
            let floweringTime = '';
            const $floweringElement = $card.find(selectors.floweringTime);
            if ($floweringElement.length > 0) {
                floweringTime = $floweringElement.text().trim();
            }

            // Extract growing level
            let growingLevel = '';
            const $growingElement = $card.find(selectors.growingLevel);
            if ($growingElement.length > 0) {
                growingLevel = $growingElement.text().trim();
            }

            // Extract rating
            let rating = null;
            const $ratingElement = $card.find(selectors.rating);
            if ($ratingElement.length > 0) {
                const ratingText = $ratingElement.text();
                const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
                if (ratingMatch) {
                    rating = parseFloat(ratingMatch[1]);
                }
            }

            // Extract review count (if available)
            let reviewCount = null;
            const $reviewElement = $card.find(selectors.reviewCount);
            if ($reviewElement.length > 0) {
                const reviewText = $reviewElement.text();
                const reviewMatch = reviewText.match(/(\d+)/);
                if (reviewMatch) {
                    reviewCount = parseInt(reviewMatch[1]);
                }
            }

            // Extract price information
            const $priceElement = $card.find(selectors.priceDisplay);
            let priceDisplay = '';
            if ($priceElement.length > 0) {
                priceDisplay = $priceElement.text().trim();
            }

            // Extract pack sizes/variations and create pricing data
            const packSizes: string[] = [];
            const packSelector = '.pack_listed_prod .variation_val_num'; // Direct selector for pack numbers
            $card.find(packSelector).each((_, packEl) => {
                const packSize = $(packEl).text().trim();
                if (packSize) {
                    packSizes.push(packSize);
                }
            });

            // Parse price display to create pricing data
            const pricings: PricingData[] = [];
            if (priceDisplay) {
                // Extract price range like "$65.00 – $240.00"
                const priceMatch = priceDisplay.match(/\$(\d+(?:\.\d+)?)\s*[–-]\s*\$(\d+(?:\.\d+)?)/);
                if (priceMatch && packSizes.length > 0) {
                    const minPrice = parseFloat(priceMatch[1]);
                    const maxPrice = parseFloat(priceMatch[2]);
                    
                    // Create pricing for each pack size
                    packSizes.forEach((packSizeStr, index) => {
                        const packSize = parseInt(packSizeStr);
                        if (!isNaN(packSize)) {
                            // Distribute prices across pack sizes (simple estimation)
                            const totalPrice = index === 0 ? minPrice : 
                                             index === packSizes.length - 1 ? maxPrice :
                                             minPrice + ((maxPrice - minPrice) * index / (packSizes.length - 1));
                            
                            pricings.push({
                                packSize,
                                totalPrice: Math.round(totalPrice * 100) / 100,
                                pricePerSeed: Math.round((totalPrice / packSize) * 100) / 100
                            });
                        }
                    });
                }
            }

            // Extract seedType from product name
            let seedType = '';
            const nameLower = name.toLowerCase();
            if (nameLower.includes('feminized') && nameLower.includes('autoflower')) {
                seedType = 'AUTOFLOWER';
            } else if (nameLower.includes('feminized')) {
                seedType = 'FEMINIZED';
            } else if (nameLower.includes('autoflower')) {
                seedType = 'AUTOFLOWER';
            } else if (nameLower.includes('regular')) {
                seedType = 'REGULAR';
            } else if (nameLower.includes('photoperiod')) {
                seedType = 'PHOTOPERIOD';
            }

            // Create product object with all required fields
            const product: ProductCardDataFromCrawling = {
                name,
                url,
                slug,
                imageUrl: imageUrl || undefined,
                seedType: seedType || undefined,
                cannabisType: strainType || undefined,
                badge: packSizes.length > 0 ? `Pack sizes: ${packSizes.join(', ')}` : undefined,
                rating: rating || undefined,
                reviewCount: reviewCount || undefined,
                thcLevel: thcLevel || undefined,
                thcMin: thcMin || undefined,
                thcMax: thcMax || undefined,
                cbdLevel: cbdLevel || undefined,
                cbdMin: cbdMin || undefined,
                cbdMax: cbdMax || undefined,
                floweringTime: floweringTime || undefined,
                growingLevel: growingLevel || undefined,
                pricings: pricings,
            };

            products.push(product);
            
        } catch (error) {
            apiLogger.logError('Sonoma Seeds Extract', error as Error, {
                message: 'Error extracting product card'
            });
            // Continue to next product instead of failing completely
        }
    });

    // Extract pagination info
    let maxPages: number | null = null;

    try {
        // Try to extract maxPages from pagination
        const $paginationItems = $(selectors.paginationItems);
        
        if ($paginationItems.length > 0) {
            let detectedMaxPage = 1;
            
            $paginationItems.each((_, elem) => {
                const $elem = $(elem);
                const href = $elem.attr('href');
                const text = $elem.text().trim();
                
                // Extract page number from href like "/page/2/"
                if (href) {
                    const pageMatch = href.match(/\/page\/(\d+)\//);
                    if (pageMatch) {
                        const pageNum = parseInt(pageMatch[1]);
                        if (!isNaN(pageNum)) {
                            detectedMaxPage = Math.max(detectedMaxPage, pageNum);
                        }
                    }
                }
                
                // Also check text content for page numbers
                const pageNum = parseInt(text);
                if (!isNaN(pageNum)) {
                    detectedMaxPage = Math.max(detectedMaxPage, pageNum);
                }
            });
            
            maxPages = detectedMaxPage;
            apiLogger.info(`[Sonoma Seeds] Detected ${maxPages} total pages from pagination`);
        } else {
            apiLogger.warn('[Sonoma Seeds] No pagination elements found');
        }

        // Apply dbMaxPage limit if provided
        if (dbMaxPage && dbMaxPage > 0 && maxPages) {
            maxPages = Math.min(maxPages, dbMaxPage);
            apiLogger.info(`[Sonoma Seeds] Limited to ${maxPages} pages (dbMaxPage: ${dbMaxPage})`);
        }
        
    } catch (error) {
        apiLogger.logError('Sonoma Seeds Pagination', error as Error, {
            message: 'Error extracting pagination'
        });
        maxPages = null;
    }

    apiLogger.info(`[Sonoma Seeds] Extracted ${products.length} products, maxPages: ${maxPages}`);
    
    return {
        products,
        maxPages
    };
}