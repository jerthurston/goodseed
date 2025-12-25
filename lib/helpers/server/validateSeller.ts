import { prisma } from "../../prisma";
/**
 * Validate if a seller exists and is active
 * @param sellerId 
 */
export async function validateSeller(sellerId:string) {
    const seller = await prisma.seller.findUnique({
        where:{id:sellerId},
        select:{
            id:true,
            name:true,
            url:true,
            isActive:true,
        }
    })
    
    if(!seller){
        throw new Error(`Seller with ID ${sellerId} not found`)
    }

    if(!seller.isActive) {
        throw new Error(`${seller.name} is currently inactive`)
    }
// Cần return seller ở đây để sử dụng cho các bước liên quan
    return seller;
}