import { prisma } from "@/lib/prisma";
import { apiLogger } from "../../api-logger";

/**
 * Tại sao không nên truy vấn bằng id của account chổ này: Do bảng Account dùng composite unique key provider_providerAccountId (kết hợp provider và providerAccountId) để đảm bảo mỗi tài khoản OAuth là duy nhất theo cặp provider + id của nhà cung cấp. Khi NextAuth gửi lại account, nó chỉ cung cấp provider và providerAccountId, không có id nội bộ trong bảng Account, nên phải tìm bằng composite key này mới khớp đúng bản ghi và tránh trùng lặp giữa các provider khác nhau.
 */

export async function getAccountByProvider(provider: string, providerAccountId: string) {
    try {
        const account = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId
                }
            }
        })

        if (!account) {
            apiLogger.info("Account not found");
        }
        return account;
    } catch (error) {
        apiLogger.logError("Error fetching account", error as Error);
        throw new Error("Error fetching account");
    }

}