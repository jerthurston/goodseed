/**
 * extractProductsFromHTML - Crop King Seeds extraction function
 * 
 * Based on Mary Jane's Garden structure but adapted                     if (cannabisTypeText.includes('hybrid')) {
                        cannabisType = 'hybrid';
                    } else if (cannabisTypeText.includes('sativa')) {
                        cannabisType = 'sativa';
                    } else if (cannabisTypeText.includes('indica')) {
                        cannabisType = 'indica';
                    }
                    
                    apiLogger.debug(`🌿 [Cannabis Type] Found in .itype: "${$cannabisTypeElement.first().text().trim()}" → "${cannabisType}"`);
                }ing Seeds specific elements
 * 
 * Features:
 * - Extract products from WooCommerce structure with Crop King specific selectors
 * - Handle WordPress standard pagination
 * - Extract cannabis-specific data (THC/CBD, strain type, flowering time)
 * - Support price variations with radio input system
 * - Handle lazy loading images with fallbacks
 * 
 * @param $ - Cheerio loaded HTML object
 * @param siteConfig - Site configuration with selectors and baseUrl
 * @param dbMaxPage - Database max page fallback
 * @param startPage - Start page number (may be null)
 * @param endPage - End page number (may be null) 
 * @param fullSiteCrawl - Full site crawl flag (fallback when no startPage/endPage)
 * @returns Object with products array and maxPages number
 */

import { SiteConfig } from '@/lib/factories/scraper-factory';
import { apiLogger } from '@/lib/helpers/api-logger';

import { ProductCardDataFromCrawling } from '@/types/crawl.type';
import { CROPKINGSEEDS_PRODUCT_CARD_SELECTORS } from '../core/selectors';

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
    const selectors = CROPKINGSEEDS_PRODUCT_CARD_SELECTORS;
    const { baseUrl } = siteConfig;

    // Find all product containers - look for divs containing both .main_img and .prod_titles
    $('div').each((_, element) => {
        const $container = $(element);
        
        // Check if this div contains both main_img and prod_titles (product card indicators)
        if ($container.find('.main_img').length > 0 && $container.find('.prod_titles').length > 0) {
            try {
                // Extract product link and URL
                const $link = $container.find(selectors.productLink).first();
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

                // Extract image - Handle lazy loading and perfmatters
                let imageUrl = '';
                const $imgElement = $container.find(selectors.productImage);
                
                // Try different image sources for lazy loading (Crop King uses perfmatters-lazy)
                imageUrl = $imgElement.attr('data-src') ||      // Perfmatters lazy loading
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

                // Extract seed type from product name (Crop King specific)
                let seedType: string | undefined;
                const nameLower = name.toLowerCase();
                if (nameLower.includes('autoflower') || nameLower.includes('auto')) {
                    seedType = 'autoflower';
                } else if (nameLower.includes('feminized') || nameLower.includes('fem')) {
                    seedType = 'feminized';
                } else if (nameLower.includes('regular') || nameLower.includes('reg')) {
                    seedType = 'regular';
                } else if (nameLower.includes('photoperiod') || nameLower.includes('photo')) {
                    seedType = 'photoperiod';
                }

                // Extract cannabis type from .itype div (Crop King specific)
                let cannabisType: string | undefined;
                const $cannabisTypeElement = $container.find('.itype .elementor-icon-list-text');
                if ($cannabisTypeElement.length > 0) {
                    const cannabisTypeText = $cannabisTypeElement.first().text().trim().toLowerCase();
                    
                    if (cannabisTypeText.includes('sativa') && cannabisTypeText.includes('hybrid')) {
                        cannabisType = 'hybrid';
                    } else if (cannabisTypeText.includes('indica') && cannabisTypeText.includes('hybrid')) {
                        cannabisType = 'hybrid';
                    } else if (cannabisTypeText.includes('balanced') && cannabisTypeText.includes('hybrid')) {
                        cannabisType = 'hybrid';
                    } else if (cannabisTypeText.includes('hybrid')) {
                        cannabisType = 'hybrid';
                    } else if (cannabisTypeText.includes('sativa')) {
                        cannabisType = 'sativa';
                    } else if (cannabisTypeText.includes('indica')) {
                        cannabisType = 'indica';
                    }
                    
                    apiLogger.info(`🌿 [Cannabis Type] Found in .itype: "${$cannabisTypeElement.first().text().trim()}" → "${cannabisType}"`);
                }
                
                // Fallback: Extract cannabis type from product name if not found in .itype
                if (!cannabisType) {
                    const strainInfo = name.toLowerCase();
                    if (strainInfo.includes('indica') && strainInfo.includes('sativa')) {
                        cannabisType = 'hybrid';
                    } else if (strainInfo.includes('indica')) {
                        cannabisType = 'indica';
                    } else if (strainInfo.includes('sativa')) {
                        cannabisType = 'sativa';
                    } else if (strainInfo.includes('hybrid')) {
                        cannabisType = 'hybrid';
                    }
                    
                    if (cannabisType) {
                        apiLogger.debug(`🌿 [Cannabis Type] Fallback from name: "${cannabisType}"`);
                    }
                }

                // Extract badge/tag information
                const badge = $container.find(selectors.badge).first().text().trim() || undefined;

                // Extract rating if available
                let rating: number | undefined;
                const ratingElement = $container.find(selectors.rating).first();
                if (ratingElement.length > 0) {
                    const ratingText = ratingElement.text().trim();
                    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
                    if (ratingMatch) {
                        rating = parseFloat(ratingMatch[1]);
                    }
                }

                // Extract review count if available
                let reviewCount: number | undefined;
                const reviewElement = $container.find(selectors.reviewCount).first();
                if (reviewElement.length > 0) {
                    const reviewText = reviewElement.text().trim();
                    const reviewMatch = reviewText.match(/(\d+)/);
                    if (reviewMatch) {
                        reviewCount = parseInt(reviewMatch[1]);
                    }
                }

                // Extract cannabis-specific metadata from dedicated Crop King selectors
                let thcLevel = '';
                let thcMin: number | undefined;
                let thcMax: number | undefined;
                let cbdLevel = '';
                let cbdMin: number | undefined;
                let cbdMax: number | undefined;
                let floweringTime = '';
                let growingLevel = '';

                // Extract THC from dedicated .thc-lvl element (only the first one for this product)
                const $thcElement = $container.find('.thc-lvl').first();
                if ($thcElement.length > 0) {
                    thcLevel = $thcElement.text().replace(/^THC\s*/i, '').trim();
                    
                    // Parse THC range (e.g., "18-25%")
                    if (thcLevel) {
                        const thcMatch = thcLevel.match(/(\d+(?:\.\d+)?)[\s%-]*(?:to|-)\s*(\d+(?:\.\d+)?)?%?/);
                        if (thcMatch) {
                            thcMin = parseFloat(thcMatch[1]);
                            thcMax = thcMatch[2] ? parseFloat(thcMatch[2]) : thcMin;
                        } else {
                            // Single value (e.g., "25%")
                            const singleMatch = thcLevel.match(/(\d+(?:\.\d+)?)/);
                            if (singleMatch) {
                                thcMin = thcMax = parseFloat(singleMatch[1]);
                            }
                        }
                    }
                }

                // Extract CBD, flowering time, growing level from custom-acf-prod
                $container.find('.custom-acf-prod .elementor-icon-list-item').each((_, metaElement) => {
                    const $meta = $(metaElement);
                    const text = $meta.find('.elementor-icon-list-text').text().trim();
                    
                    if (text.includes('CBD :')) {
                        cbdLevel = text.replace(/^.*CBD\s*:\s*/i, '').trim();
                        
                        // Parse CBD range (e.g., "0.5-1%")
                        if (cbdLevel) {
                            const cbdMatch = cbdLevel.match(/(\d+(?:\.\d+)?)[\s%-]*(?:to|-)\s*(\d+(?:\.\d+)?)?%?/);
                            if (cbdMatch) {
                                cbdMin = parseFloat(cbdMatch[1]);
                                cbdMax = cbdMatch[2] ? parseFloat(cbdMatch[2]) : cbdMin;
                            } else {
                                // Single value
                                const singleMatch = cbdLevel.match(/(\d+(?:\.\d+)?)/);
                                if (singleMatch) {
                                    cbdMin = cbdMax = parseFloat(singleMatch[1]);
                                }
                            }
                        }
                    } else if (text.includes('Flowering :')) {
                        floweringTime = text.replace(/^.*Flowering\s*:\s*/i, '').trim();
                    } else if (text.includes('Growing Level :')) {
                        growingLevel = text.replace(/^.*Growing Level\s*:\s*/i, '').trim();
                    }
                });

                // Extract price variations from radio inputs with item-price attribute
                // Only look for pricing within the direct product container, not nested containers
                const pricings: Array<{ totalPrice: number; packSize: number; pricePerSeed: number }> = [];
                const seenPriceCombos = new Set<string>(); // Track duplicates
                
                $container.find('.product_variation_radio[item-price]').each((_, variationElement) => {
                    const $variation = $(variationElement);
                    const itemPrice = $variation.attr('item-price');
                    const value = $variation.attr('value');
                    
                    if (itemPrice && value) {
                        // Extract seeds count from value (e.g., "5-seeds" -> "5")
                        const seedsMatch = value.match(/(\d+)-seeds?/);
                        const seedCount = seedsMatch ? parseInt(seedsMatch[1], 10) : 1;
                        const totalPrice = parseFloat(itemPrice);
                        const pricePerSeed = totalPrice / seedCount;
                        
                        // Create unique identifier for this price combo
                        const priceCombo = `${totalPrice}-${seedCount}`;
                        
                        // Only add if not already seen for this product
                        if (!seenPriceCombos.has(priceCombo)) {
                            seenPriceCombos.add(priceCombo);
                            pricings.push({
                                totalPrice,
                                packSize: seedCount,
                                pricePerSeed,
                            });
                        }
                    }
                });

                // Build product card data
                const productCard: ProductCardDataFromCrawling = {
                    name,
                    url,
                    slug,
                    imageUrl,
                    seedType,
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
                apiLogger.debug(`[Crop King Seeds] Extracted product: ${name} with ${pricings.length} pricing variants`);

            } catch (error) {
                apiLogger.logError('[Crop King Seeds] Product extraction error', error instanceof Error ? error : new Error('Unknown error'));
            }
        }
    });

    // Extract maximum page number from WordPress pagination
    let maxPages: number | null = null;
    
    // 🎯 CASE 1: Test Mode - startPage and endPage are provided
    if (startPage !== null && startPage !== undefined && 
        endPage !== null && endPage !== undefined) {
        
        // Validate range logic
        if (endPage >= startPage) {
            maxPages = endPage;
            apiLogger.info(`[Crop King Seeds Pagination] TEST MODE: Using custom range startPage=${startPage}, endPage=${endPage} → maxPages=${maxPages}`);
        } else {
            apiLogger.warn(`[Crop King Seeds Pagination] Invalid range: endPage (${endPage}) < startPage (${startPage}), falling back to auto-detection`);
        }
    } 
    // 🚀 CASE 2: Auto/Manual Mode - Detect Jet Smart Filters OR WooCommerce pagination
    else {
        try {
            // Look for pagination container (Jet Smart Filters OR WooCommerce)
            const $pagination = $(selectors.paginationContainer).first();
            
            if ($pagination.length > 0) {
                const paginationType = $pagination.hasClass('woocommerce-pagination') ? 'WooCommerce' : 'Jet Smart Filters';
                apiLogger.debug(`[Crop King Seeds Pagination] Found ${paginationType} pagination`);
                
                let highestPage = 0;
                
                // Method 1: For Jet Smart Filters - check data-value attributes
                if (paginationType === 'Jet Smart Filters') {
                    $pagination.find('.jet-filters-pagination__item[data-value]').each((_, item) => {
                        const $item = $(item);
                        const dataValue = $item.attr('data-value');
                        
                        // Skip non-numeric values (like "next", "prev")
                        if (dataValue && !['next', 'prev'].includes(dataValue)) {
                            const pageNum = parseInt(dataValue);
                            if (!isNaN(pageNum) && pageNum > highestPage) {
                                highestPage = pageNum;
                            }
                        }
                    });
                }
                
                // Method 2: For WooCommerce OR fallback - parse page link text content
                if (highestPage === 0) {
                    $pagination.find(selectors.pageLinks).each((_, link) => {
                        const $link = $(link);
                        const pageText = $link.text().trim();
                        const pageNum = parseInt(pageText);
                        if (!isNaN(pageNum) && pageNum > highestPage) {
                            highestPage = pageNum;
                        }
                    });
                }

                // Method 3: Check current page and next button
                const $currentPage = $pagination.find(selectors.currentPage).first();
                const currentPageNum = $currentPage.length > 0 ? parseInt($currentPage.text().trim()) || 1 : 1;
                
                const $nextButton = $pagination.find('.jet-filters-pagination__item.next, .page-numbers.next').first();
                const hasNextPage = $nextButton.length > 0;

                // Determine maxPages using available information
                if (highestPage > 0) {
                    maxPages = highestPage;
                    apiLogger.info(`[Crop King Seeds Pagination] Found highest page number: ${maxPages} (from ${paginationType})`);
                } else if (!hasNextPage && currentPageNum > 1) {
                    maxPages = currentPageNum;
                    apiLogger.info(`[Crop King Seeds Pagination] No next button, current page: ${maxPages}`);
                } else if (fullSiteCrawl && dbMaxPage) {
                    maxPages = dbMaxPage;
                    apiLogger.info(`[Crop King Seeds Pagination] Using database fallback: ${maxPages}`);
                } else {
                    maxPages = null;
                    apiLogger.warn('[Crop King Seeds Pagination] Could not determine max pages, will continue until no products found');
                }
                
                // Debug log for pagination structure (verbose only)
                apiLogger.debug(`[Crop King Seeds Pagination] Debug info:`, {
                    paginationType,
                    highestPageFromParsing: highestPage,
                    currentPage: currentPageNum,
                    hasNextPage,
                    paginationItemsCount: $pagination.find(selectors.paginationItems).length
                });
                
            } else {
                apiLogger.warn('[Crop King Seeds Pagination] No pagination container found');
                maxPages = 1; // Assume single page if no pagination
            }
        } catch (error) {
            apiLogger.logError('[Crop King Seeds Pagination] Error detecting pagination', error instanceof Error ? error : new Error('Unknown error'));
            maxPages = dbMaxPage || null; // Fallback to database value
        }
    }

    // 📊 Final extraction summary using ScraperLogger
    apiLogger.logProductExtraction({
        products: products,
        context: 'Crop King Seeds',
        additionalInfo: {
            maxPages,
            extractionParams: { startPage, endPage, fullSiteCrawl, dbMaxPage }
        }
    });
    
    // 🔍 Detailed analytics (only in verbose mode)
    apiLogger.debug(`[Crop King Seeds] DETAILED ANALYTICS:`, {
        productTypes: {
            autoflower: products.filter(p => p.seedType === 'autoflower').length,
            feminized: products.filter(p => p.seedType === 'feminized').length,
            regular: products.filter(p => p.seedType === 'regular').length,
            photoperiod: products.filter(p => p.seedType === 'photoperiod').length,
            unknown: products.filter(p => !p.seedType).length
        },
        cannabisTypes: {
            indica: products.filter(p => p.cannabisType === 'indica').length,
            sativa: products.filter(p => p.cannabisType === 'sativa').length,
            hybrid: products.filter(p => p.cannabisType === 'hybrid').length,
            unknown: products.filter(p => !p.cannabisType).length
        },
        dataCompleteness: {
            withImages: products.filter(p => p.imageUrl && p.imageUrl.length > 0).length,
            withTHC: products.filter(p => p.thcLevel || p.thcMin || p.thcMax).length,
            withCBD: products.filter(p => p.cbdLevel || p.cbdMin || p.cbdMax).length,
            withPricing: products.filter(p => p.pricings && p.pricings.length > 0).length,
            withFloweringTime: products.filter(p => p.floweringTime && p.floweringTime.length > 0).length
        }
    });
    
    return {
        products,
        maxPages,
    };
}

/**
 * 📋 CROP KING SEEDS EXTRACTION NOTES:
 * 
 * ✅ UNIQUE EXTRACTION POINTS:
 * - Product containers: Divs containing both .main_img and .prod_titles
 * - Product name: .prod_titles a text content
 * - Product image: .main_img img with lazy loading support (perfmatters-lazy)
 * - THC level: Dedicated .thc-lvl element (format: "THC 18-25%")
 * - CBD/Flowering/Growing: .custom-acf-prod .elementor-icon-list-item parsing
 * - Cannabis Type: .itype .elementor-icon-list-text (format: "Sativa Dominant Hybrid")
 * - Pricing: .product_variation_radio inputs with item-price attribute
 * - Pagination: Jet Smart Filters with data-value attributes
 * 
 * 🎯 DATA EXTRACTION STRATEGY:
 * 1. Find product containers by presence of .main_img AND .prod_titles
 * 2. Extract basic info (name, URL, image) from these containers
 * 3. Parse THC from dedicated .thc-lvl div
 * 4. Parse cannabis type from .itype .elementor-icon-list-text
 * 5. Parse CBD/flowering/growing from icon list items
 * 6. Extract pricing from radio inputs with item-price attributes
 * 7. Handle lazy loading images with multiple fallbacks
 * 
 * 📊 EXPECTED COMPLETENESS:
 * - Core Fields: 100% (name, URL, slug, images)
 * - Cannabis Data: ~90% (THC/CBD from dedicated elements)
 * - Pricing: ~95% (radio input system with clear attributes)
 * - Seed Type: ~80% (extracted from product names)
 * - Overall: ~90% completeness
 * 
 * 🔧 TECHNICAL CONSIDERATIONS:
 * - Uses perfmatters lazy loading for images
 * - Radio input system for price variations
 * - WordPress standard pagination
 * - Custom ACF fields in icon list format
 * - Range parsing for THC/CBD (e.g., "18-25%", "0.5-1%")
 */