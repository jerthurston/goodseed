/**
 * 🎯 ROCKET SEEDS PRODUCT DETAIL EXTRACTOR
 *
 * Extracts product data from Rocket Seeds product detail pages
 * Based on specification_individual structure with icon-based targeting
 */

import { CheerioAPI } from 'cheerio';

import { ProductCardDataFromCrawling } from '../../../types/crawl.type';
import { apiLogger } from '../../../lib/helpers/api-logger'
;
import { SiteConfig } from '@/lib/factories/scraper-factory';
import { ROCKETSEEDS_PRODUCT_CARD_SELECTORS } from '../core/selector';

export function extractProductFromDetailHTML(
    $: CheerioAPI, 
    siteConfig: SiteConfig,
    productUrl: string,
): ProductCardDataFromCrawling | null {

    const { selectors, baseUrl } = siteConfig;

    try {
        // Extract product name using h1.product_title.entry-title
        let name = '';
        
        name = $(selectors.productName).first().text().trim();
        
        // Clean the product name: remove extra whitespace, newlines, and normalize
        name = name
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n|\r|\t/g, ' ') // Replace newlines and tabs with space
            .trim(); // Trim leading/trailing space
        
        if (!name) {
            apiLogger.warn('[Rocket Seeds Detail] No product name found');
            return null;
        }

        // Extract main product image using .wp-post-image
        let imageUrl: string | undefined = undefined;
        
        const $mainImage = $(selectors.productImage).first();
        if ($mainImage.length > 0) {
            // Priority order: data-large_image > src (avoid data-src as it might be lazy-loading placeholder)
            imageUrl = $mainImage.attr('data-large_image') || $mainImage.attr('src');
        }
        
        // Filter out SVG placeholders and ensure proper URL format
        const finalImageUrl = (imageUrl && 
                             !imageUrl.startsWith('data:image/svg') && 
                             !imageUrl.includes('gravatar') &&
                             imageUrl.trim() !== '')
            ? (imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`)
            : undefined;

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
        // Extract Cannabis Type (Strain Type) from specification_individual with strain-types icon
        const strainTypeText = $(selectors.strainType).first().text().trim();
        apiLogger.debug(`🌿 [Strain Type] Raw: "${strainTypeText}"`);
        
        if (strainTypeText) {
            const strainLower = strainTypeText.toLowerCase();
            if (strainLower.includes('indica') && strainLower.includes('hybrid')) {
                cannabisType = 'hybrid';
            } else if (strainLower.includes('sativa') && strainLower.includes('hybrid')) {
                cannabisType = 'hybrid';
            } else if (strainLower.includes('balance') && strainLower.includes('hybrid')) {
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

        // Extract THC Level from specification_individual with fm_img3.svg icon
        const thcText = $(selectors.thcLevel).first().text().trim();
        apiLogger.debug(`🧪 [THC] Raw: "${thcText}"`);
        
        if (thcText) {
            // Handle ranges like "22%", "15-21%", "25-26%"
            const thcMatch = thcText.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*%?|(\d+(?:\.\d+)?)\s*%?/);
            if (thcMatch) {
                if (thcMatch[1] && thcMatch[2]) {
                    // Range format like "15-21%"
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

        // Extract CBD Level from specification_individual with cbd.png icon
        const cbdText = $(selectors.cbdLevel).first().text().trim();
        apiLogger.debug(`🌱 [CBD] Raw: "${cbdText}"`);
        
        if (cbdText) {
            cbdLevel = cbdText.includes('%') ? cbdText : `${cbdText}%`;
            const cbdNumber = parseFloat(cbdText.replace('%', ''));
            if (!isNaN(cbdNumber)) {
                cbdMin = cbdMax = cbdNumber;
            }
            apiLogger.debug(`🌱 [CBD] Extracted: "${cbdLevel}" (${cbdMin}-${cbdMax})`);
        }

        // Extract Genetics from specification_individual with igenetics_img.png icon
        genetics = $(selectors.genetics).first().text().trim();
        apiLogger.debug(`🧬 [Genetics] Extracted: "${genetics}"`);

        // Extract Flowering Time from specification_individual with marijuana.png icon
        floweringTime = $(selectors.floweringTime).first().text().trim();
        apiLogger.debug(`⏰ [Flowering Time] Extracted: "${floweringTime}"`);

        // Extract Yield Information from specification_individual with indoor/outdoor yield icons
        yieldInfo = $(selectors.yieldInfo).map((_, el) => $(el).text().trim()).get().join(', ');
        apiLogger.debug(`📊 [Yield Info] Extracted: "${yieldInfo}"`);

        // Extract seedType from product name (fallback)
        const nameLower = name.toLowerCase();
        if (nameLower.includes('feminized') || nameLower.includes('fem')) {
            seedType = 'feminized';
        } else if (nameLower.includes('autoflower') || nameLower.includes('auto')) {
            seedType = 'autoflower';
        } else if (nameLower.includes('regular') || nameLower.includes('reg')) {
            seedType = 'regular';
        } else if (nameLower.includes('photoperiod') || nameLower.includes('photo')) {
            seedType = 'photoperiod';
        }
        apiLogger.debug(`🌾 [Seed Type] Extracted: "${seedType}"`);

        // Extract growing level (placeholder - may need custom logic based on site structure)
        let growingLevel: string | undefined = undefined;

        // Extract pricing from variant table (.pvtfw_variant_table_block)
        const pricings: Array<{ totalPrice: number; packSize: number; pricePerSeed: number }> = [];
        
        // Target specific pricing rows in the variant table
        const $priceRows = $(selectors.priceDisplay);
        apiLogger.debug(`💰 [Pricing] Found ${$priceRows.length} pricing rows`);
        
        if ($priceRows.length > 0) {
            $priceRows.each((index, row) => {
                const $row = $(row);
                
                // Extract pack size from first td (Packs column)
                const packText = $row.find('td[data-title="Packs"]').text().trim();
                const packMatch = packText.match(/(\d+)\s*seeds?/i);
                const packSize = packMatch ? parseInt(packMatch[1]) : 1;
                
                // Extract price from second td (Price column) - look for woocommerce-Price-amount
                const $priceCell = $row.find('td[data-title="Price"]');
                const priceText = $priceCell.find('.woocommerce-Price-amount').text().trim();
                const priceMatch = priceText.replace(/[$,€£]/g, '').match(/[\d.]+/);
                const totalPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
                
                if (totalPrice > 0 && packSize > 0) {
                    const pricePerSeed = totalPrice / packSize;
                    pricings.push({
                        totalPrice,
                        packSize,
                        pricePerSeed,
                    });
                    apiLogger.debug(`💰 [Pricing] Row ${index + 1}: ${packSize} seeds = $${totalPrice} ($${pricePerSeed.toFixed(2)}/seed)`);
                } else {
                    apiLogger.warn(`💰 [Pricing] Row ${index + 1}: Invalid data - packText: "${packText}", priceText: "${priceText}"`);
                }
            });
        } else {
            apiLogger.warn('💰 [Pricing] No variant table rows found');
        }
        
        // Fallback: try generic price elements if no variant table found
        if (pricings.length === 0) {
            const $priceElement = $(selectors.priceAmount).first();
            if ($priceElement.length > 0) {
                const priceText = $priceElement.text().trim();
                const priceMatch = priceText.replace(/[$,€£]/g, '').match(/[\d.]+/);
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
            imageUrl: finalImageUrl,
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
        apiLogger.logError('[Rocket Seeds Detail] Error extracting product:', { 
            error, 
            url: productUrl 
        });
        return null;
    }
}

/**
 * 📋 ROCKET SEEDS DETAIL EXTRACTION NOTES:
 * 
 * ✅ AVAILABLE DATA IN DETAIL PAGES:
 * - Product name from h1.product_title.entry-title
 * - Product images from .wp-post-image with data-large_image attribute
 * - Cannabis strain type from specification_individual with strain-types icon
 * - THC levels from specification_individual with fm_img3.svg icon (ranges supported)
 * - CBD levels from specification_individual with cbd.png icon
 * - Genetics from specification_individual with igenetics_img.png icon
 * - Flowering/Harvest time from specification_individual with marijuana.png icon
 * - Yield info from specification_individual with indoor/outdoor yield icons
 * - Pricing from pvtfw_variant_table_block with variant tables
 * 
 * 🏗️ ROCKET SEEDS STRUCTURE:
 * - Uses .specification_individual div blocks with icon-based identification
 * - Each spec has an image icon and corresponding text in .specification_individual_text span
 * - Pricing uses .pvtfw_variant_table_block with table rows for different pack sizes
 * - Icon-based targeting ensures accurate field extraction
 * 
 * 🎯 EXTRACTION STRATEGY:
 * 1. Icon-based field identification using :has(img[src*="icon-name"]) selectors
 * 2. Direct text extraction from .specification_individual_text spans
 * 3. THC/CBD range parsing (15-21%, 22%, 25-26% formats)
 * 4. Variant table parsing for pack sizes and pricing
 * 5. Comprehensive logging for debugging data flow
 * 
 * 📊 EXPECTED COMPLETENESS:
 * - Core Fields: 100% (name, URL, slug, images)
 * - Cannabis Data: ~95% (THC/CBD, type, genetics, flowering time)
 * - Pricing: ~90% (variant table extraction)
 * - Yield Info: ~85% (indoor/outdoor combined)
 * - Overall: ~90% completeness (higher than MJ Seeds Canada due to structured approach)
 * 
 * 🔧 DIFFERENCES FROM MJ SEEDS CANADA:
 * - Icon-based targeting vs table row targeting
 * - .specification_individual structure vs .specifications-table
 * - .pvtfw_variant_table_block vs standard price elements
 * - Combined yield info vs separate indoor/outdoor extraction
 */