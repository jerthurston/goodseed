import { prisma } from "@/lib/prisma";
import { apiLogger } from "../api-logger";


export async function logScrapeActivity(
    sellerId:string,
    status:string,
    productsFound:number,
    duration:number,
    metadata?:any
) {
    try {
        await prisma.scrapeLog.create({
            data:{
                sellerId,
                status,
                productsFound,
                duration,
                errors: metadata ?? undefined
            }
        })
    } catch (error) {
        apiLogger.logError("Failed to log scrape activity", 
            {error},
            {
                sellerId,
                status,
                productsFound,
                duration
            }
        )
        
    }
}