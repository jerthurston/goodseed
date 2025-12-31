/**
 * 🎯 BC BUD DEPOT PRODUCT DETAIL EXTRACTOR
 * 
 * Extracts product data from BC Bud Depot product detail pages
 * Focused on ProductCardDataFromCrawling interface requirements
 */

import { CheerioAPI } from 'cheerio';

import { ProductCardDataFromCrawling } from '../../../types/crawl.type';
import { apiLogger } from '../../../lib/helpers/api-logger';
import { SiteConfig } from '@/lib/factories/scraper-factory';

export function extractProductFromDetailHTML(
    $: CheerioAPI, 
    siteConfig: SiteConfig,
    productUrl: string,
): ProductCardDataFromCrawling | null {


    const { selectors,baseUrl } = siteConfig;

    try {
        // Extract product name
        const name = $(selectors.productName).text().trim();
        if (!name) {
            apiLogger.warn('[BC Bud Depot Detail] No product name found');
            return null;
        }

        // Extract main product image
        const $mainImage = $(selectors.productImage).first();
        const imageUrl = $mainImage.attr('src') || 
                        $mainImage.attr('data-src') || 
                        $mainImage.attr('data-large_image');
        
        const finalImageUrl = (imageUrl && !imageUrl.startsWith('data:image/svg'))
            ? (imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`)
            : undefined;

        // Initialize cannabis data
        let seedType: 'autoflower' | 'feminized' | 'regular' | 'photoperiod' | undefined = undefined;
        let cannabisType: string | undefined = undefined;
        let floweringTime: string | undefined = undefined;
        let badge: string | undefined = undefined;

        // Extract from Tags section
        const $tagsLinks = $(selectors.tagsLinks);
        const tags: string[] = [];
        
        $tagsLinks.each((_, element) => {
            const tagText = $(element).text().trim().toLowerCase();
            tags.push(tagText);
            
            // Extract seedType from tags
            if (tagText === 'feminized' || tagText === 'fem') {
                seedType = 'feminized';
            } else if (tagText === 'autoflower' || tagText === 'auto' || tagText === 'autoflowering') {
                seedType = 'autoflower';
            } else if (tagText === 'regular' || tagText === 'reg') {
                seedType = 'regular';
            } else if (tagText === 'photoperiod' || tagText === 'photo') {
                seedType = 'photoperiod';
            }
            
            // Extract cannabisType from tags
            if (tagText === 'indica') {
                cannabisType = 'indica';
            } else if (tagText === 'sativa') {
                cannabisType = 'sativa';
            } else if (tagText === 'hybrid') {
                cannabisType = 'hybrid';
            }
        });

        // Extract details from structured details section
        const $detailItems = $(selectors.strainType);
        
        $detailItems.each((_, element) => {
            const $item = $(element);
            const fullText = $item.text().trim();
            
            if (fullText.includes('Specifics:')) {
                const strainSpecifics = fullText.replace('Specifics:', '').trim();
                
                // Extract cannabisType from specifics if not found in tags
                if (!cannabisType && strainSpecifics) {
                    if (strainSpecifics.toLowerCase().includes('indica') && 
                        strainSpecifics.toLowerCase().includes('sativa')) {
                        cannabisType = 'hybrid';
                    } else if (strainSpecifics.toLowerCase().includes('indica')) {
                        cannabisType = 'indica';
                    } else if (strainSpecifics.toLowerCase().includes('sativa')) {
                        cannabisType = 'sativa';
                    }
                }
            } else if (fullText.includes('Flowering Time:')) {
                floweringTime = fullText.replace('Flowering Time:', '').trim();
            }
        });

        // Fallback: Extract seedType from product name if not found in tags
        if (!seedType) {
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
        }

        // Extract strain family badge from tags
        const strainTags: string[] = [];
        tags.forEach(tag => {
            if (['kush', 'haze', 'diesel', 'og', 'skunk', 'purple', 'cheese', 'widow'].includes(tag)) {
                strainTags.push(tag.charAt(0).toUpperCase() + tag.slice(1));
            }
        });
        badge = strainTags.length > 0 ? strainTags.join(' + ') : undefined;

        // Extract pricing from versions table
        const pricings: Array<{ totalPrice: number; packSize: number; pricePerSeed: number }> = [];
        const $versionRows = $(selectors.versionsRows);
        
        $versionRows.each((_, row) => {
            const $row = $(row);
            
            // Extract pack size
            const packSizeText = $row.find(selectors.packSizeCell).text().trim();
            const packSizeMatch = packSizeText.match(/(\d+)\s*Seeds?/i);
            const packSize = packSizeMatch ? parseInt(packSizeMatch[1]) : 1;
            
            // Extract price
            const priceText = $row.find(selectors.priceCell).text().trim();
            const priceMatch = priceText.replace(/[$,]/g, '').match(/[\d.]+/);
            const totalPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
            
            if (totalPrice > 0 && packSize > 0) {
                const pricePerSeed = totalPrice / packSize;
                pricings.push({
                    totalPrice,
                    packSize,
                    pricePerSeed,
                });
            }
        });

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
            thcLevel: undefined,
            thcMin: undefined,
            thcMax: undefined,
            cbdLevel: undefined,
            cbdMin: undefined,
            cbdMax: undefined,
            floweringTime,
            growingLevel: undefined,
            pricings,
        };

        return product;

    } catch (error) {
        apiLogger.logError('[BC Bud Depot Detail] Error extracting product:', { 
            error, 
            url: productUrl 
        });
        return null;
    }
}

/**
 * 📋 BC BUD DEPOT DETAIL EXTRACTION NOTES:
 * 
 * ✅ AVAILABLE DATA IN DETAIL PAGES:
 * - Complete product name and description
 * - High-quality product images
 * - Cannabis strain specifics (75% Indica / 25% Sativa)
 * - Flowering time (Indoor: 8-9 weeks / Outdoor: Late-September)
 * - Growing type (Indoor/Outdoor)
 * - Genetics and breeder info
 * - Cannabis tags (Feminized, Indica, Kush, Purple)
 * - Accurate pack size variations (5 Seeds, 10 Seeds, 25 Seeds)
 * - Real pricing per variation ($65, $120, $240)
 * 
 * ❌ NOT AVAILABLE IN DETAIL PAGES:
 * - THC/CBD percentages (not provided by BC Bud Depot)
 * - Product ratings/reviews (not displayed)
 * - Exact growing difficulty level
 * 
 * 🎯 EXTRACTION PRIORITIES:
 * 1. seedType from Tags section (Feminized, Auto, etc.)
 * 2. cannabisType from Tags or Specifics (Indica, Sativa, Hybrid)
 * 3. Strain family from Tags (Kush, Haze, etc.)
 * 4. Accurate pricing with pack size variations
 * 5. Complete cannabis metadata (flowering time, genetics)
 * 
 * 📊 EXPECTED COMPLETENESS:
 * - Core Fields: 100% (name, URL, slug, pricing)
 * - Cannabis Data: ~75% (missing only THC/CBD levels)
 * - Overall: ~85% completeness vs card extraction ~35%
 */