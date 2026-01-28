import { SeedUI } from "./seed.type";

/**
 * Raw wishlist item từ API (matches Prisma query result)
 */
export interface WishlistItemRaw {
  id: string;
  userId: string;
  seedId: string;
  createdAt: string | Date;
  seedProduct: {
    id: string;
    name: string;
    url: string;
    description: string | null;
    seedType: string | null;
    cannabisType: string | null;
    thcMin: number | null;
    thcMax: number | null;
    thcText: string | null;
    cbdMin: number | null;
    cbdMax: number | null;
    cbdText: string | null;
    stockStatus: string;
    createdAt: string | Date;
    productImages: Array<{
      isPrimary: boolean;
      image: {
        url: string;
        alt: string | null;
      };
    }>;
    pricings: Array<{
      totalPrice: number;
      packSize: number;
      pricePerSeed: number;
    }>;
    seller: {
      id: string;
      name: string;
      url: string;
      affiliateTag: string | null;
    };
  };
  // folderId: string | null;
  // folder: {
  //   id: string;
  //   name: string;
  // } | null;
  wishlistFolderItems: Array<{
    id:string;
    folderId:string;
    order:number;
    createdAt: string | Date;
    wishlistFolder:{
      id:string;
      name:string;
    }
  }>
}

/**
 * Transformed wishlist item for UI consumption
 */
export interface WishlistItemUI {
  id: string;
  userId: string;
  seedId: string;
  createdAt: string | Date;
  seedProduct: SeedUI;
  // folderId: string | null;
  // folder: {
  //   id: string;
  //   name: string;
  // } | null;
  folders: Array<{
    id:string;
    name:string;
    order:number;
    createdAt: string | Date;
  }>
}