import { apiLogger } from "@/lib/helpers/api-logger";
import { prisma } from "@/lib/prisma";
import { User } from "next-auth";


/**
 * Event handler for user creation
 * 
 * Được trigger sau khi NextAuth tạo user mới (magic link, OAuth lần đầu)
 * Tạo wishlist folder mặc định "Uncategorized" cho user mới
 * 
 * Note: Chỉ áp dụng cho magic link authentication
 * Google/Facebook OAuth tạo folder trong signIn callback
 */
export async function createUserEvent(
    { user }: { user: User }
): Promise<void> {
    try {
        // Kiểm tra xem user đã có folder chưa (để tránh duplicate)
        const existingFolder = await prisma.wishlistFolder.findFirst({
            where: {
                userId: user.id!,
                name: "Uncategorized"
            }
        });

        if (existingFolder) {
            apiLogger.info('[createUserEvent] Wishlist folder already exists', { 
                userId: user.id,
                folderId: existingFolder.id 
            });
            return;
        }

        // Tạo folder mặc định
        const result = await prisma.wishlistFolder.create({
            data: {
                userId: user.id!,
                name: "Uncategorized",
                order: 0,
            }
        });

        apiLogger.info('[createUserEvent] Created default wishlist folder', { 
            userId: user.id,
            email: user.email,
            folderId: result.id 
        });

    } catch (error) {
        apiLogger.logError('[createUserEvent] Failed to create wishlist folder', error as Error, {
            userId: user.id,
            email: user.email
        });
    }
}