import { prisma } from "@/lib/prisma";

export const getAccountByUserId = async (userId: string) => {
    try {
        const existingAccount = await prisma.account.findFirst({
            where: {
                userId: userId
            }
        })
        return existingAccount;
    } catch {
        return null;
    }
}