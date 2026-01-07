import { prisma } from "@/lib/prisma";

export const getUserById = async (id:string | undefined) =>{
    try {
        const user = await prisma.user.findUnique({
            where: {
                id
            }
        })
        return user;
    } catch {
        return null;
    }
}