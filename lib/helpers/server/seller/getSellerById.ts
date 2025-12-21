import { prisma } from "@/lib/prisma";

export async function getSellerById(sellerId:string) {
    try {
        const seller = await prisma.seller.findUnique({
        where:{id:sellerId},
        include:{
            scrapingSources:true
        }
    })

    return seller;

    } catch (error) {
        console.error(`[getSellerById] Error fetching seller: ${error}`);
        throw new Error('Not Found Seller with ID: ' + sellerId);
    }
}