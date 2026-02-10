/**
 * 🎯 CANUK SEEDS PRODUCT DETAIL EXTRACTOR
 *
 * Extracts product data from Canuk Seeds product detail pages
 * Based on Canuk Seeds specific structure with data-th attributes
 */

import { CheerioAPI } from 'cheerio';

import { ProductCardDataFromCrawling } from '../../../types/crawl.type';
import { apiLogger } from '../../../lib/helpers/api-logger'
;
import { SiteConfig } from '@/lib/factories/scraper-factory';

export function extractProductFromDetailHTML(
    $: CheerioAPI, 
    siteConfig: SiteConfig,
    productUrl: string,
    // robotRules: RobotsRules // không cần tuân thủ rules ở cấp extract từ trang detal product
): ProductCardDataFromCrawling | null {

    const { 
        selectors, 
        baseUrl 
    } = siteConfig;

    try {
        // Extract product name using selector from config
        let name = '';
        
        name = $(selectors.productName).first().text().trim();
        
        // Clean the product name: remove extra whitespace, newlines, and normalize
        name = name
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n|\r|\t/g, ' ') // Replace newlines and tabs with space
            .trim(); // Trim leading/trailing space
        
        if (!name) {
            apiLogger.warn('[Canuk Seeds Detail] No product name found');
            return null;
        }
        
        apiLogger.debug(`📝 [Product Name] Extracted: "${name}"`);

        // Extract main product image - Using selectors from config
        let imageUrl: string | undefined = undefined;
        
        apiLogger.debug(`🔍 [Debug] Starting image extraction for: ${name}`);
        
        // Primary strategy: Use the configured productImage selector
        if (selectors.productImage) {
            apiLogger.debug(`🔍 [Debug] Using config selector: "${selectors.productImage}"`);
            const $mainImage = $(selectors.productImage).first();
            
            if ($mainImage.length > 0) {
                // Check various image attributes
                const srcAttr = $mainImage.attr('src');
                const dataSrcAttr = $mainImage.attr('data-src');
                const hrefAttr = $mainImage.attr('href'); // For frame elements with href
                const parentHrefAttr = $mainImage.parent().attr('href'); // Parent href
                
                imageUrl = srcAttr || dataSrcAttr || hrefAttr || parentHrefAttr;
                if (imageUrl) {
                    apiLogger.debug(`🔍 [Debug] ✅ Config selector found: "${imageUrl}"`);
                }
            }
        }
        
        // Fallback strategy: Dynamic alternative selectors
        if (!imageUrl) {
            const firstWord = name?.split(' ')[0] || 'product';
            const alternatives = [
                '.fotorama__stage img',
                '.product-image-main img', 
                '.gallery-image img',
                `img[alt*="${firstWord}"]`,
                '.product-media img',
                '.product-photo img',
                '.main-image img'
            ];
            
            for (const altSelector of alternatives) {
                const $altImg = $(altSelector).first();
                if ($altImg.length > 0) {
                    imageUrl = $altImg.attr('src') || $altImg.attr('data-src');
                    if (imageUrl) {
                        apiLogger.debug(`🔍 [Debug] ✅ Alternative "${altSelector}": "${imageUrl}"`);
                        break;
                    }
                }
            }
        }
        
        // Final fallback: OG image
        if (!imageUrl) {
            const ogImage = $('meta[property="og:image"]').attr('content');
            if (ogImage) {
                imageUrl = ogImage;
                apiLogger.debug(`🔍 [Debug] ✅ Using OG image fallback: "${ogImage}"`);
            }
        }
        
        // Ensure absolute URL
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${baseUrl}${imageUrl}`;
        }
        
        if (imageUrl) {
            apiLogger.debug(`🖼️ [Image] Successfully extracted: "${imageUrl}"`);
        } else {
            apiLogger.debug(`🔍 [Debug] ❌ No image found with any strategy`);
        }

        // Initialize cannabis data variables
        let seedType: 'autoflower' | 'feminized' | 'regular' | 'photoperiod' | undefined = undefined;
        let cannabisType: string | undefined = undefined;
        let floweringTime: string | undefined = undefined;
        let badge: string | undefined = undefined;
        let thcLevel: string | undefined = undefined;
        let cbdLevel: string | undefined = undefined;
        let thcMin: number | undefined = undefined;
        let thcMax: number | undefined = undefined;
        let cbdMin: number | undefined = undefined;
        let cbdMax: number | undefined = undefined;
        let genetics: string | undefined = undefined;
        let yieldInfo: string | undefined = undefined;
        
        // Extract Cannabis Type (Strain Type) using data-th attribute
        const strainTypeText = $(selectors.strainType).first().text().trim();
        apiLogger.debug(`🌿 [Strain Type] Raw: "${strainTypeText}"`);
        
        if (strainTypeText) {
            const strainLower = strainTypeText.toLowerCase();
            if (strainLower.includes('indica') && (strainLower.includes('hybrid') || strainLower.includes('sativa'))) {
                cannabisType = 'hybrid';
            } else if (strainLower.includes('sativa') && (strainLower.includes('hybrid') || strainLower.includes('indica'))) {
                cannabisType = 'hybrid';
            } else if (strainLower.includes('indica')) {
                cannabisType = 'indica';
            } else if (strainLower.includes('sativa')) {
                cannabisType = 'sativa';
            } else if (strainLower.includes('hybrid')) {
                cannabisType = 'hybrid';
            }
            apiLogger.debug(`🌿 [Cannabis Type] Extracted: "${cannabisType}"`);
        }

        // Extract THC Level using data-th attribute
        const thcText = $(selectors.thcLevel).first().text().trim();
        apiLogger.debug(`🧪 [THC] Raw: "${thcText}"`);
        
        if (thcText) {
            // Handle ranges like "24% - 30%", "22%", "15-21%"
            const thcMatch = thcText.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to|%\s*-\s*)\s*(\d+(?:\.\d+)?)\s*%?|(\d+(?:\.\d+)?)\s*%?/);
            if (thcMatch) {
                if (thcMatch[1] && thcMatch[2]) {
                    // Range format like "24% - 30%" or "15-21%"
                    thcMin = parseFloat(thcMatch[1]);
                    thcMax = parseFloat(thcMatch[2]);
                    thcLevel = `${thcMin}-${thcMax}%`;
                } else if (thcMatch[3]) {
                    // Single value like "22%"
                    const thcValue = parseFloat(thcMatch[3]);
                    thcMin = thcMax = thcValue;
                    thcLevel = `${thcValue}%`;
                }
                apiLogger.debug(`🧪 [THC] Extracted: "${thcLevel}" (${thcMin}-${thcMax})`);
            }
        }

        // Extract CBD Level using data-th attribute
        const cbdText = $(selectors.cbdLevel).first().text().trim();
        apiLogger.debug(`🌱 [CBD] Raw: "${cbdText}"`);
        
        if (cbdText) {
            // Handle ranges like "0.1% - 0.2%" or single values
            const cbdMatch = cbdText.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to|%\s*-\s*)\s*(\d+(?:\.\d+)?)\s*%?|(\d+(?:\.\d+)?)\s*%?/);
            if (cbdMatch) {
                if (cbdMatch[1] && cbdMatch[2]) {
                    // Range format
                    cbdMin = parseFloat(cbdMatch[1]);
                    cbdMax = parseFloat(cbdMatch[2]);
                    cbdLevel = `${cbdMin}-${cbdMax}%`;
                } else if (cbdMatch[3]) {
                    // Single value
                    const cbdValue = parseFloat(cbdMatch[3]);
                    cbdMin = cbdMax = cbdValue;
                    cbdLevel = `${cbdValue}%`;
                }
            } else {
                // Fallback: just add % if missing
                cbdLevel = cbdText.includes('%') ? cbdText : `${cbdText}%`;
            }
            apiLogger.debug(`🌱 [CBD] Extracted: "${cbdLevel}" (${cbdMin}-${cbdMax})`);
        }

        // Extract Genetics using data-th attribute
        genetics = $(selectors.genetics).first().text().trim();
        apiLogger.debug(`🧬 [Genetics] Extracted: "${genetics}"`);

        // Extract Flowering Time using data-th attribute
        floweringTime = $(selectors.floweringTime).first().text().trim();
        apiLogger.debug(`⏰ [Flowering Time] Extracted: "${floweringTime}"`);

        // Extract Yield Information using data-th attribute
        yieldInfo = $(selectors.yieldInfo).first().text().trim();
        apiLogger.debug(`📊 [Yield Info] Extracted: "${yieldInfo}"`);

        // Extract seedType from data-th attribute or product name fallback
        const sexText = $(selectors.seedType).first().text().trim();
        if (sexText) {
            const sexLower = sexText.toLowerCase();
            if (sexLower.includes('feminized')) {
                seedType = 'feminized';
            } else if (sexLower.includes('regular')) {
                seedType = 'regular';
            }
        }
        
        // Extract from flowering type for autoflower detection
        const floweringTypeText = $(selectors.description).first().text().trim();
        if (floweringTypeText && floweringTypeText.toLowerCase().includes('autoflower')) {
            seedType = 'autoflower';
        }
        
        // Fallback: extract from product name
        if (!seedType) {
            const nameLower = name.toLowerCase();
            if (nameLower.includes('feminized') || nameLower.includes('fem')) {
                seedType = 'feminized';
            } else if (nameLower.includes('autoflower') || nameLower.includes('auto')) {
                seedType = 'autoflower';
            } else if (nameLower.includes('regular') || nameLower.includes('reg')) {
                seedType = 'regular';
            }
        }
        apiLogger.debug(`🌾 [Seed Type] Extracted: "${seedType}"`);

        // Extract stock availability
        const availability = $(selectors.availability).first().text().trim();
        apiLogger.debug(`📦 [Availability] Extracted: "${availability}"`);

        // Extract growing level (placeholder - may need custom logic based on site structure)
        let growingLevel: string | undefined = undefined;

        // Extract pricing from variant table using versionsRows selector
        const pricings: Array<{ totalPrice: number; packSize: number; pricePerSeed: number }> = [];
        let invalidRows = 0; // Track invalid rows for summary
        
        // Target pricing rows using versionsRows selector from config
        const $priceRows = $(selectors.versionsRows);
        apiLogger.debug(`💰 [Pricing] Found ${$priceRows.length} pricing rows`);
        
        if ($priceRows.length > 0) {
            $priceRows.each((index, row) => {
                const $row = $(row);
                
                // Extract pack size from packSizeCell selector
                const packText = $row.find(selectors.packSizeCell).text().trim();
                // Extract number from text like "Hellfire OG AUTO FEM ELITE - 5 Seeds"
                const packMatch = packText.match(/(\d+)\s*seeds?/i);
                const packSize = packMatch ? parseInt(packMatch[1]) : 1;
                
                // Extract price using priceCell selector and priceAmount for precise value
                const $priceElement = $row.find(selectors.priceAmount);
                const priceAmount = $priceElement.attr('data-price-amount');
                const totalPrice = priceAmount ? parseFloat(priceAmount) : 0;
                
                // Fallback: extract from price text if data-price-amount not available
                let fallbackPrice = 0;
                if (!totalPrice) {
                    const priceText = $row.find(selectors.priceCell).text().trim();
                    const priceMatch = priceText.replace(/[US$,€£]/g, '').match(/[\d.]+/);
                    fallbackPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
                }
                
                const finalPrice = totalPrice || fallbackPrice;
                
                if (finalPrice > 0 && packSize > 0) {
                    const pricePerSeed = finalPrice / packSize;
                    pricings.push({
                        totalPrice: finalPrice,
                        packSize,
                        pricePerSeed,
                    });
                    apiLogger.debug(`💰 [Pricing] Row ${index + 1}: ${packSize} seeds = $${finalPrice} ($${pricePerSeed.toFixed(2)}/seed)`);
                } else {
                    // Collect invalid rows for summary instead of logging each one
                    invalidRows++;
                }
            });
            
            // Note: Removed per-product pricing warnings to reduce log noise
            // Invalid rows are safely skipped, valid pricings are captured
        } else {
            // Only log if NO variant table found at all (more serious issue)
            apiLogger.warn('💰 [Pricing] No variant table rows found');
        }
        
        // Fallback: try single price if no variants found
        if (pricings.length === 0) {
            const $priceElement = $(selectors.priceDisplay).first();
            if ($priceElement.length > 0) {
                const priceText = $priceElement.text().trim();
                const priceMatch = priceText.replace(/[US$,€£]/g, '').match(/[\d.]+/);
                const totalPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
                
                if (totalPrice > 0) {
                    pricings.push({
                        totalPrice,
                        packSize: 1,
                        pricePerSeed: totalPrice,
                    });
                    apiLogger.debug(`💰 [Pricing] Single price: $${totalPrice}`);
                }
            }
        }

        // Generate slug from product name
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        // Create product object
        const product: ProductCardDataFromCrawling = {
            name,
            url: productUrl,
            slug,
            imageUrl: imageUrl,
            seedType,
            cannabisType,
            badge,
            rating: undefined,
            reviewCount: undefined,
            thcLevel,
            thcMin,
            thcMax,
            cbdLevel,
            cbdMin,
            cbdMax,
            floweringTime,
            growingLevel,
            pricings,
        };

        apiLogger.debug(`✅ $1 Successfully extracted product: "${name}"`);
        return product;

    } catch (error) {
        apiLogger.logError('[Canuk Seeds Detail] Error extracting product:', { 
            error, 
            url: productUrl 
        });
        return null;
    }
}
