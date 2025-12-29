import { SellerUI } from "@/types/seller.type";

export const getActiveJob = (seller: SellerUI | null) => {
    console.log("🔍 getActiveJob - seller:", seller);
    console.log("🔍 getActiveJob - scrapeJobs:", seller?.scrapeJobs);
    
    if(!seller?.scrapeJobs) {
      console.log("🔍 No scrapeJobs found");
      return null;
    }
    
    const activeJob = seller.scrapeJobs.find(job => {
      console.log("🔍 Checking job:", job.jobId, "status:", job.status);
      return ['CREATED', 'WAITING', 'DELAYED', 'ACTIVE'].includes(job.status);
    });
    
    console.log("🔍 Found active job:", activeJob);
    return activeJob;
  }