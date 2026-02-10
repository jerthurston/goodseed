import type { WishlistItemRaw, WishlistItemUI } from "@/types/wishlist.type";
import type { SeedUI } from "@/types/seed.type";

/**
 * Transform raw wishlist item to UI format
 */
export function transformWishlistItemRawToUI(raw: WishlistItemRaw): WishlistItemUI {
  // Get primary image or first image
  const primaryImage = raw.seedProduct.productImages.find(img => img.isPrimary)
    || raw.seedProduct.productImages[0];
  
  const imageUrl = primaryImage?.image.url || '/images/placeholder-seed.png';

  // Get best value pack (lowest pricePerSeed)
  const bestValuePack = raw.seedProduct.pricings.reduce(
    (best, pack) => pack.pricePerSeed < best.pricePerSeed ? pack : best,
    raw.seedProduct.pricings[0] || { pricePerSeed: 0, packSize: 1, totalPrice: 0 }
  );

  // Transform pricings to PackUI format
  const packs = raw.seedProduct.pricings.map(pricing => ({
    size: pricing.packSize,
    totalPrice: pricing.totalPrice,
    pricePerSeed: pricing.pricePerSeed
  }));

  // Handle THC value (can be single or range)
  const thc = raw.seedProduct.thcMin !== null && raw.seedProduct.thcMax !== null
    ? (raw.seedProduct.thcMin === raw.seedProduct.thcMax 
        ? raw.seedProduct.thcMin 
        : { min: raw.seedProduct.thcMin, max: raw.seedProduct.thcMax })
    : undefined;

  // Handle CBD value (can be single or range)
  const cbd = raw.seedProduct.cbdMin !== null && raw.seedProduct.cbdMax !== null
    ? (raw.seedProduct.cbdMin === raw.seedProduct.cbdMax 
        ? raw.seedProduct.cbdMin 
        : { min: raw.seedProduct.cbdMin, max: raw.seedProduct.cbdMax })
    : undefined;

  // Transform seedProduct to SeedUI
  const seedProduct: SeedUI = {
    id: raw.seedProduct.id,
    name: raw.seedProduct.name,
    seedType: raw.seedProduct.seedType || 'Unknown',
    cannabisType: raw.seedProduct.cannabisType || 'Unknown',
    price: bestValuePack.pricePerSeed,
    thc,
    cbd,
    popularity: 0, // Not available in schema, use default
    date: typeof raw.seedProduct.createdAt === 'string' 
      ? raw.seedProduct.createdAt.split('T')[0] 
      : raw.seedProduct.createdAt.toISOString().split('T')[0],
    vendorName: raw.seedProduct.seller.name,
    vendorUrl: raw.seedProduct.url, // ✅ Use product URL, not seller base URL
    smallestPackSize: bestValuePack.packSize,
    smallestPackPrice: bestValuePack.totalPrice,
    strainDescription: raw.seedProduct.description || '',
    packs,
    imageUrl,
    stockStatus: raw.seedProduct.stockStatus,
    seller: {
      ids: raw.seedProduct.seller.id,
      affiliateTags: raw.seedProduct.seller.affiliateTag || null
    }
  };

  const folders = raw.wishlistFolderItems.map(item => ({
    id: item.wishlistFolder.id,
    name: item.wishlistFolder.name,
    order: item.order,
    createdAt: item.createdAt,
  }))

  return {
    id: raw.id,
    userId: raw.userId,
    seedId: raw.seedId,
    createdAt: raw.createdAt,
    seedProduct,
    folders,
  };
}