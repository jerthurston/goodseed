import { prisma } from "@/lib/prisma"

export async function checkExistingJobs (sellerId:string, sellerName:string) {
    const existingJob = await prisma.scrapeJob.findFirst({
        where:{
            sellerId,
            mode: 'manual',
            status: { in: ['PENDING', 'IN_PROGRESS']}
        }
    });

    if(existingJob) {
        throw new Error(`Manual scrape already in progress for ${sellerName}. Job ID: ${existingJob.id}`)
    }
    // Không cần return ở đây , nếu có lỗi sẽ ném lỗi.
}