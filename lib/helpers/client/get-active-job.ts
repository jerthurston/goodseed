import { SellerUI } from "@/types/seller.type";

/**
 * Get active job for a seller
 * Checks for jobs with status: CREATED, WAITING, DELAYED, or ACTIVE
 * 
 * @param seller - Seller object with scrapeJobs
 * @returns Active job or null if no active job found
 */
export const getActiveJob = (seller: SellerUI | null) => {
    if(!seller?.scrapeJobs) {
      return null;
    }
    
    const activeJob = seller.scrapeJobs.find(job => {
      return ['CREATED', 'WAITING', 'DELAYED', 'ACTIVE'].includes(job.status);
    });
    
    return activeJob;
  }