import { BASE_URL, PRODUCT_CARD_SELECTORS } from '@/scrapers/sunwestgenetics/core/selectors';
import { ProductCardDataFromCrawling } from '@/types/crawl.type';

/**
 * extractProductsFromHTML - Pure extraction function for SunWest Genetics
 * 
 * Nhiệm vụ:
 * - Nhận vào HTML đã load sẵn (Cheerio $ object)
 * - Parse và extract dữ liệu từ các product cards của SunWest Genetics
 * - Trả về array ProductCardDataFromCrawling[]
 * 
 * Dựa trên HTML structure thực tế từ user:
 * - li.product containers
 * - h3.prod_titles a links  
 * - figure.main_img img images
 * - .elementor-icon-list-text cho strain type, THC, CBD
 * - input.product_variation_radio cho pricing
 * 
 * @param $ - Cheerio loaded HTML object
 * @returns Array of ProductCardDataFromCrawling
 */
export function extractProductsFromHTML($: ReturnType<typeof import('cheerio').load>): ProductCardDataFromCrawling[] {
    const products: ProductCardDataFromCrawling[] = [];
    const seenUrls = new Set<string>();

    // SunWest Genetics uses li.product structure based on actual HTML analysis
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
            if (!name || name.length < 3) return;

            // Extract image using correct selector  
            let finalImageUrl: string | undefined;
            const $img = $card.find(PRODUCT_CARD_SELECTORS.productImage).first();
            if ($img.length) {
                const imageUrl = $img.attr('data-src') || $img.attr('src');
                if (imageUrl && !imageUrl.startsWith('data:image/svg') && imageUrl.trim()) {
                    finalImageUrl = imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`;
                }
            }

            // Extract strain type from .icatztop .elementor-icon-list-text
            const strainTypeElement = $card.find(PRODUCT_CARD_SELECTORS.strainType).first();
            const strainType = strainTypeElement.length ? strainTypeElement.text().trim() : undefined;

            // Map SeedType from product name
            let seedType: string | undefined;
            if (name.toLowerCase().includes('autoflower')) {
                seedType = 'AUTOFLOWER';
            } else if (name.toLowerCase().includes('feminized')) {
                seedType = 'FEMINIZED';
            } else if (name.toLowerCase().includes('photoperiod')) {
                seedType = 'PHOTOPERIOD';
            } else {
                seedType = 'REGULAR'; // Default fallback
            }

            // Map CannabisType from strainType
            let cannabisType: string | undefined;
            if (strainType) {
                const strainLower = strainType.toLowerCase();
                if (strainLower.includes('indica') && !strainLower.includes('sativa')) {
                    cannabisType = 'INDICA';
                } else if (strainLower.includes('sativa') && !strainLower.includes('indica')) {
                    cannabisType = 'SATIVA';
                } else if (strainLower.includes('hybrid') || (strainLower.includes('indica') && strainLower.includes('sativa'))) {
                    cannabisType = 'HYBRID';
                } else {
                    cannabisType = 'HYBRID'; // Default fallback for ambiguous cases
                }
            }

            // Extract THC level from .elementor-icon-list-text containing "THC:"
            let thcMin: number | undefined;
            let thcMax: number | undefined;
            
            $card.find('.elementor-icon-list-text').each((_, el) => {
                const text = $(el).text();
                if (text.includes('THC:')) {
                    const thcLevelText = text.replace('THC:', '').trim();
                    
                    // Parse numbers from THC text
                    const numberPattern = /(\d+(?:\.\d+)?)/g;
                    const numbers = [];
                    let match;
                    while ((match = numberPattern.exec(thcLevelText)) !== null) {
                        numbers.push(parseFloat(match[1]));
                    }
                    
                    if (numbers.length === 1) {
                        thcMin = thcMax = numbers[0];
                    } else if (numbers.length >= 2) {
                        thcMin = Math.min(...numbers);
                        thcMax = Math.max(...numbers);
                    }
                }
            });

            // Extract CBD level from .elementor-icon-list-text containing "CBD:"
            let cbdMin: number | undefined;
            let cbdMax: number | undefined;
            
            $card.find('.elementor-icon-list-text').each((_, el) => {
                const text = $(el).text();
                if (text.includes('CBD:')) {
                    const cbdLevelText = text.replace('CBD:', '').trim();
                    
                    // Only parse if it contains numbers (skip "Low", "High" etc.)
                    if (/\d/.test(cbdLevelText)) {
                        const numberPattern = /(\d+(?:\.\d+)?)/g;
                        const numbers = [];
                        let match;
                        while ((match = numberPattern.exec(cbdLevelText)) !== null) {
                            numbers.push(parseFloat(match[1]));
                        }
                        
                        if (numbers.length === 1) {
                            cbdMin = cbdMax = numbers[0];
                        } else if (numbers.length >= 2) {
                            cbdMin = Math.min(...numbers);
                            cbdMax = Math.max(...numbers);
                        }
                    }
                }
            });

            // Extract pricing from variation inputs with item-price attribute
            const pricings: Array<{ totalPrice: number; packSize: number; pricePerSeed: number }> = [];
            
            $card.find(PRODUCT_CARD_SELECTORS.variationInputs).each((_, input) => {
                const $input = $(input);
                const itemPrice = $input.attr('item-price');
                const value = $input.attr('value'); // e.g., "5-seeds", "10-seeds", "25-seeds"

                if (itemPrice && value) {
                    const totalPrice = parseFloat(itemPrice);
                    // Extract pack size from value (e.g., "5-seeds" -> 5)
                    const packSizeMatch = value.match(/(\d+)/);
                    
                    if (packSizeMatch) {
                        const packSize = parseInt(packSizeMatch[1]);
                        pricings.push({
                            totalPrice,
                            packSize,
                            pricePerSeed: totalPrice / packSize,
                        });
                    }
                }
            });

            // Extract rating and reviews from .star-rating
            let rating: number | undefined;
            let reviewCount: number | undefined;
            
            const $rating = $card.find('.star-rating').first();
            if ($rating.length) {
                const ariaLabel = $rating.attr('aria-label');
                if (ariaLabel) {
                    // Extract rating from "Rated 5.00 out of 5"
                    const ratingMatch = ariaLabel.match(/Rated (\d+(?:\.\d+)?)/);
                    if (ratingMatch) {
                        rating = parseFloat(ratingMatch[1]);
                    }
                }
                
                // Extract review count from text like "based on 1 customer rating"
                const ratingText = $rating.text();
                const reviewMatch = ratingText.match(/based on (\d+)/);
                if (reviewMatch) {
                    reviewCount = parseInt(reviewMatch[1]);
                }
            }

            // Extract growing level
            let growingLevel: string | undefined;
            $card.find('.elementor-icon-list-text').each((_, el) => {
                const text = $(el).text();
                if (text.includes('Growing Level:')) {
                    growingLevel = text.replace(/.*Growing Level:\s*/, '').trim();
                }
            });

            // Extract flowering time
            let floweringTime: string | undefined;
            $card.find('.elementor-icon-list-text').each((_, el) => {
                const text = $(el).text();
                if (text.includes('Flowering:')) {
                    floweringTime = text.replace(/.*Flowering:\s*/, '').trim();
                }
            });

            // Extract badges from product classes
            let badge: string | undefined;
            const productClasses = $card.attr('class') || '';
            if (productClasses.includes('product_tag-new-strains')) {
                badge = 'New Strain 2025';
            } else if (productClasses.includes('product_tag-sale')) {
                badge = 'Sale';
            }

            // Create product object following ProductCardDataFromCrawling type
            const productData: ProductCardDataFromCrawling = {
                name,
                url,
                slug: url.split('/').pop()?.replace('.html', '') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                
                // Image
                imageUrl: finalImageUrl,
                
                // Strain type & classification
                strainType,
                seedType,
                cannabisType,
                
                // Badge
                badge,
                
                // Rating & Reviews
                rating,
                reviewCount,
                
                // THC/CBD levels
                thcMin,
                thcMax,
                cbdMin,
                cbdMax,
                
                // Growing info
                floweringTime,
                growingLevel,
                
                // Pricing
                pricings,
            };

            products.push(productData);

        } catch (error) {
            console.error('Error extracting product:', error);
        }
    });

    console.log(`Extracted ${products.length} products from SunWest Genetics HTML`);
    return products;
}