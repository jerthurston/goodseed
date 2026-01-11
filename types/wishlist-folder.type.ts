export interface WishlistFolderUI {
    id:string;
    name:string;
}

/**
 * Response type for wishlist folder from API/Database
 */
export interface WishlistFolderRaw {
  id: string;
  userId: string;
  name: string;
  order: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
