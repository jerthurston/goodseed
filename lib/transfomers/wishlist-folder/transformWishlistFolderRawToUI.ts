import { apiLogger } from "@/lib/helpers/api-logger";
import { WishlistFolderRaw, WishlistFolderUI } from "@/types/wishlist-folder.type";
import { id } from "zod/v4/locales";

export const transformWishlistFolderRawToUI = (folders: WishlistFolderRaw[]): WishlistFolderUI[] => {
    
    const result = folders.map((f)=>{
        return {
            id: f.id,
            name: f.name
        }
    })
    apiLogger.debug('[transformWishlistFolderRawToUI] transformed folders', { folders: result });
    return result;
};