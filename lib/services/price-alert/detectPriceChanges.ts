import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { ProductCardDataFromCrawling } from "@/types/crawl.type";

export interface ScrapedProductWithSeller extends ProductCardDataFromCrawling {
    sellerId:string;
    sellerName:string;
    sellerWebsite:string;
    seedId?:string;
}

export interface PriceChange {
    productId: string;
    productName: string;
    productSlug: string;
    productImage: string;
    productUrl: string; // URL on vendor's website
    sellerId: string;
    sellerName: string;
    sellerWebsite: string;
    affiliateTag?: string; // Seller's affiliate tag
    variantPackSize: number;
    oldPrice: number;
    newPrice: number;
    priceChange: number;
    priceChangePercent: number;
    currency: string;
    detectedAt: Date;
}

export interface UserWithFavouriteSeeds {
    userId:string;
    email: string;
    name:string;
    favouriteSeeds: Array<{
        id:string;
        name:string;
        slug:string;
        image:string;
    }>
}

/**
 * Detects significant price drops (≥5%) by comparing CURRENT prices with HISTORICAL prices.
 * 
 * @param seedIds - Array of seed product IDs to check for price changes
 * @returns Array of price changes that meet the threshold (drop ≥5%)
 * 
 * Why service instead of API route:
 * - Background worker doesn't need HTTP overhead
 * - Simpler maintenance with fewer intermediate layers
 * - Reusable across application
 * 
 * Algorithm:
 * 1. Validate and extract product IDs
 * 2. Bulk fetch products with CURRENT prices and LATEST HISTORICAL snapshot
 * 3. Compare current price vs latest history for each variant
 * 4. Filter and return significant drops (≥5%)
 * 
 * CRITICAL: This runs AFTER SaveDbService updates prices, so we compare:
 * - Current Pricing (newly updated from scraper)
 * - PricingHistory (snapshot saved BEFORE update)
 */

let threshold = -5;

export async function detectPriceChanges(
    seedIds: string[]
): Promise<PriceChange[]> {

    // Step 1: Validate input
    if (seedIds.length === 0) {
        apiLogger.warn('detectPriceChanges: No seed IDs provided');
        return [];
    }

    // Step 2: Fetch products with CURRENT prices and LATEST HISTORICAL snapshot
    // Query optimization: Single bulk query with nested includes
    const seedProducts = await prisma.seedProduct.findMany({
        where: { id: { in: seedIds } },
        include: {
            pricings: true, // Current prices (just updated by scraper)
            seller: true,
            productImages: {
                take: 1,
                include: { image: true }
            },
            // Get LATEST historical snapshot for comparison
            priceHistory: {
                orderBy: { scrapedAt: 'desc' },
                take: 100, // Get recent history to find latest per pack size
            }
        }
    });

    if (seedProducts.length === 0) {
        apiLogger.warn('detectPriceChanges: No products found in database', { seedIds });
        return [];
    }

    // Step 3: Compare current vs historical prices
    const changes: PriceChange[] = [];
    let productsWithoutHistory = 0;
    let totalPricingsChecked = 0;

    for (const product of seedProducts) {
        // For each pricing variant (pack size)
        for (const currentPricing of product.pricings) {
            totalPricingsChecked++;
            
            // Find the LATEST historical price for this pack size
            const latestHistory = product.priceHistory
                .filter(h => h.packSize === currentPricing.packSize)
                .sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime())[0];

            // Skip if no history (new product/variant)
            if (!latestHistory) {
                // Removed excessive debug logging to prevent memory issues
                // Only log at summary level
                productsWithoutHistory++;
                continue;
            }

            // Calculate price change
            const oldPrice = latestHistory.totalPrice; // Price BEFORE scraper update
            const newPrice = currentPricing.totalPrice; // Price AFTER scraper update
            const priceChange = newPrice - oldPrice;
            const percentChange = (priceChange / oldPrice) * 100;

            // Step 4: Filter significant drops (≥5%)
            if (percentChange <= threshold) {
                changes.push({
                    // Product info
                    productId: product.id,
                    productName: product.name,
                    productSlug: product.slug,
                    productUrl: product.url,
                    productImage: product.productImages[0]?.image.url || '',
                    
                    // Seller info
                    sellerId: product.seller.id,
                    sellerName: product.seller.name,
                    sellerWebsite: product.seller.url, // Seller URL not website
                    affiliateTag: product.seller.affiliateTag || undefined,
                    
                    // Price details
                    variantPackSize: currentPricing.packSize,
                    oldPrice,
                    newPrice,
                    priceChange,
                    priceChangePercent: percentChange,
                    currency: 'CAD',

                    // Metadata
                    detectedAt: new Date(),
                });

                apiLogger.info('Price drop detected', {
                    product: product.name,
                    packSize: currentPricing.packSize,
                    oldPrice,
                    newPrice,
                    percentChange: `${percentChange.toFixed(2)}%`
                });
            }
        }
    }

    apiLogger.info('Price change detection complete', {
        totalProducts: seedProducts.length,
        totalPricingsChecked,
        pricingsWithoutHistory: productsWithoutHistory,
        changesDetected: changes.length
    });

    return changes;
};
/**
 * Tìm những user cần gửi thông báo về giá giảm
 * 
 * @param productIds - Danh sách Id của các sản phẩm có giá thay đổi
 * @returns Danh sách user kèm theo các sản phẩm yêu thích của họ có giá giảm
 * 
 * Flow:
 * 1. Query user có bật nhận thông báo báo giá (receivePriceAlerts = true)
 * 2. Lọc user có ít nhất 1 wishlist Item tức là favourite seed và item đó phải nằm trong danh sách productIds
 * 3. Lấy thông tin chi tiết của các sản phẩm yêu thích
 * 4. Transform data thành format đơn giản để gửi email
 */

export async function findUsersToNotify(
    seedIds:string[]
): Promise<UserWithFavouriteSeeds[]> {

    //STEP 1: Query database với 2 điều kiện chính
    const users = await prisma.user.findMany({
        where:{
            // Điều kiện 1: User phải bật nhận thông báo (receivePriceAlerts = true)
            notificationPreference: {
                receivePriceAlerts:true
            },
            // Điều kiện 2: User phải có ít nhất 1 sản phẩm trong wishlist
            // mà sản phẩm đó phải nằm trong danh sách có giá drop (productIds)
            wishlist: {
                some: {
                    seedId : { in: seedIds } // Kiểm tra seedId có trong productIds không?
                }
            }
        },
        include: {
            // Lây bao gồm thông tin wishlist của User
            wishlist: {
                // Chỉ query những seed có giá giảm (nằm trong seedIds)
                // Không lấy hết thông tin wishlist vì không cần thiết
                where : {
                    seedId: { in: seedIds }
                    // Only favorited product that changed
                },
                include: {
                    // quyery vào seedProduct để lấy 1 hình ảnh đầu tiên
                    // Phục vụ cho việc tạo template email gửi user
                    seedProduct: {
                        include: {
                            productImages: {
                                take: 1,
                                include: { image: true }
                            }
                        }
                    }
                }
            }
        }
    });
    // Logs để debug và monitor
    apiLogger.debug("Users to notify:", {
        totalUsers: users.length,
        seedCount: seedIds.length
    });

    // Transform để lấy data cần thiết.
    return users.map(user=> ({
        userId: user.id,
        email:user.email,
        name:user.name || "Unknown",
        favouriteSeeds: user.wishlist.map(wishlist => ({
            id: wishlist.seedProduct.id,
            name: wishlist.seedProduct.name,
            slug: wishlist.seedProduct.slug,
            image: wishlist.seedProduct.productImages[0]?.image.url || ''
        }))
    }))
}