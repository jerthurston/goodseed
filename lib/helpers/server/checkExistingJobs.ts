import { prisma } from "@/lib/prisma"
import { ScrapeJobStatus } from "@prisma/client"

export async function checkExistingJobs (sellerId:string, sellerName:string) {
    const existingJob = await prisma.scrapeJob.findFirst({
        where:{
            sellerId,
            mode: 'manual',
            status: { in: [ScrapeJobStatus.CREATED, ScrapeJobStatus.WAITING, ScrapeJobStatus.DELAYED, ScrapeJobStatus.ACTIVE]}
        }
    });

    if(existingJob) {
        throw new Error(`Manual scrape already in progress for ${sellerName}. Job ID: ${existingJob.id}`)
    }
    // Không cần return ở đây , nếu có lỗi sẽ ném lỗi.
}