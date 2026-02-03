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
 * Phát hiện những thay đổi giá đáng kể (giảm ≥5%) bằng cách so sánh giá mới crawl với giá trong database
 * 
 * @param scrapedSeedProducts - Mảng dữ liệu sản phẩm mới crawl từ các website seller
 * @returns Mảng những thay đổi giá đạt ngưỡng (giảm ≥5%)
 * 
 * Lý do dùng service thay vì API route:
 * - Background worker không cần overhead của HTTP
 * - Đơn giản hơn trong việc bảo trì và ít tầng trung gian hơn
 * - Có thể tái sử dụng ở nhiều nơi trong ứng dụng
 * 
 * Thuật toán:
 * 1. Trích xuất và validate product IDs từ dữ liệu crawl
 * 2. Bulk fetch sản phẩm hiện có từ database (tối ưu performance)
 * 3. So sánh từng pricing variant giữa dữ liệu cũ và mới
 * 4. Lọc và return chỉ những giảm giá đáng kể (≥5%)
 */

let threshold = -5;

export async function detectPriceChanges(
    scrapedSeedProducts: ScrapedProductWithSeller[]
):Promise<PriceChange[]> {

    // Step 1:  Trích xuất seed IDs từ các sản phẩm đã crawl
    // Lọc bỏ các seedId không hợp lệ
    const seedIds = scrapedSeedProducts
        .map(p => p.seedId)
        .filter((id): id is string => id !== undefined); // Type guard: loại bỏ undefined
    // Return sớm nếu không tìm thấy ID hợp lệ (tránh query database không cần thiết)
    if (seedIds.length === 0) {
        return [];
    }

    // Step 2: Fetch các sản phẩm hiện có từ database
    // Important: Dùng bulk query với mệnh đề "IN" để tối ưu performance
    // Đây là một query thay vì N query riêng lẻ (N = số lượng sản phẩm)
    const existingSeedProducts = await prisma.seedProduct.findMany({
        where: { id: { in: seedIds } }, // Bulk fetch tất cả sản phẩm trong một query
        include: {
            pricings: true,  // Lấy tất cả pricing variants (gói 5, 10, 25 )
            seller: true, 
            productImages: {
                take: 1,     // Get first image only
                include: {
                    image: true
                }
            }
        }
    });
    
    //--> Step 3: So sánh giá và phát hiện thay đổi
    const changes: PriceChange[] = []; // Lưu trữ các giảm giá đã phát hiện
    // Lặp qua từng sản phẩm đã crawling
    for (const scrapedSeedProduct of scrapedSeedProducts) {
        // Bỏ qua nếu sản phẩm không có ID hợp lệ
        if (!scrapedSeedProduct.seedId) continue;
        // Tìm sản phẩm tương ứng trong database.
        const existingProduct = existingSeedProducts.find(p => p.id === scrapedSeedProduct.seedId);
        // Bỏ qua nếu chưa tồn tại, có thể là seed mới
        if (!existingProduct) continue;
        
    // --> Step 4: So sánh từng pricing variant
        // Một seed có nhiều pack size. Mỗi pack size cần so sánh giá riêng biệt
        for (const scrapedPricing of scrapedSeedProduct.pricings) {
            // tìm variant phù hợp trong sản phẩm hiện có theo pack size
            const existingPricing = existingProduct.pricings.find(
                p => p.packSize === scrapedPricing.packSize
            );
            // Bỏ qua nếu variant này không tồn tại trong db
            if (!existingPricing) continue;
            // Tính toán các chỉ số thay đổi giá
            const oldPrice = existingPricing.totalPrice; 
            const newPrice = scrapedPricing.totalPrice;
            const priceChange = newPrice - oldPrice;
            const percentChange = (priceChange / oldPrice) * 100; // Threshold

            // --> Step 5: Chỉ lọc nhưng giảm giá đáng kể (cụ thể là lớn hơn ngưỡng threshold)
            if (percentChange <= threshold) {
                changes.push({
                    // Thông tin sản phẩm
                    productId: existingProduct.id,
                    productName: existingProduct.name,
                    productSlug: existingProduct.slug,
                    productUrl: existingProduct.url, // URL on vendor's website
                    // Ảnh
                    productImage: existingProduct.productImages[0]?.image.url || scrapedSeedProduct.imageUrl || '',
                    sellerId: scrapedSeedProduct.sellerId,
                    sellerName: scrapedSeedProduct.sellerName,
                    sellerWebsite: scrapedSeedProduct.sellerWebsite,
                    affiliateTag: existingProduct.seller.affiliateTag || undefined,
                    
                    // Chi tiết giá
                    variantPackSize: scrapedPricing.packSize,
                    oldPrice,
                    newPrice,
                    priceChange,
                    priceChangePercent: percentChange,
                    currency: 'CAD',

                    // Metadata
                    detectedAt: new Date(),
                });
            }
        }
    }
    
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