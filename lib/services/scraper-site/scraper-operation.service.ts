import api from "@/lib/api";
import { apiLogger } from "@/lib/helpers/api-logger";
import { ScraperSiteApiResponse } from "@/types/scraperStite.type";
import { NextApiResponse } from "next";


interface ManualScrapeSuccessResponse {
    success:true;
    message:string;
    data:{
        jobId:string;
        sellerName:string;
        source:string;
        statusUrl:string;
        estimatedDuration:string;
        pagesLimit:number;
    }
};

interface ManualScrapeErrorResponse {
    success:false;
    error: {
        code:string;
        message:string;
        details?:any;
        availableSource?:string[];
        existingJob?:string;
        statusUrl?:string;
    }
}

type ManualScrapeResponse = ManualScrapeSuccessResponse | ManualScrapeErrorResponse;


export class ScraperOperationService {
    /**
     * Fetch scraper sites
     */
    public static async fetchScraperSites(): Promise<ScraperSiteApiResponse[]> {
        const startTime = Date.now();
        try {
            apiLogger.info("ScraperOperationService.fetchScraperSites");
            const response = await api.get<ScraperSiteApiResponse[]>('/admin/sellers/');
            const duration = Date.now() - startTime;
            apiLogger.logResponse(
                "ScraperOperationService.fetchScraperSites",
                {},
                {
                    sitesCount: response.data.length,
                    duration: `${duration}ms`,
                }
            );

            return response.data;

        } catch (error) {
            apiLogger.logError("ScraperOperationService.fetchScraperSites", error as Error);
            throw error;
        }
    }

    /**
     * Trigger manual scrape for a seller
     * @param sellerId - The ID of the seller to scrape
     * @param options - Scrape options (maxPages, etc.)
     */

    public static async triggerManualScrape(
        sellerId: string,
        scrapingConfig: {
            fullSiteCrawl?: boolean;
            startPage?: number;
            endPage?: number;
        } = {}
    ): Promise<ManualScrapeResponse> {
        try {
            apiLogger.debug("Đã vào được service triggerManualScrape", { sellerId, scrapingConfig });

            const requestPayload = { scrapingConfig };
            apiLogger.debug("Request payload being sent", requestPayload);

            const response = await api.post(`/admin/sellers/${sellerId}/scraper`, requestPayload);
            
            apiLogger.logResponse("SellerService.triggerManualScrape", { response })

            return {
                success: true,
                data: response.data,
                message: 'Manual scrape triggered successfully.'
            }
            
        } catch (error: any) {

            // Handle different types of API errors
            if (error.response?.status) {
                const errorData = error.response.data;
                apiLogger.logError("ScraperOperationService.triggerManualScrape", error, {
                    sellerId,
                    httpStatus: error.response.status,
                    errorCode: errorData?.error?.code,
                });
                // Return structured error from API
                return errorData;
            }

            // Handle network/connection errors
            apiLogger.logError("ScraperOperationService.triggerManualScrape", error, {
                sellerId,
                errorType: 'network',
            });

            return {
                success:false,
                error:{
                    code:"NETWORK_ERROR",
                    message: 'Failed to connect to scraper service. Please check your network connection and try again.'
                }
            }
        }
    };

    /**
     * Get scraper status for a seller
     */

    // TODO: Cần xác định getScraperSatus để làm gì và định nghĩa lại output type
    static async getScraperStatus(sellerId: string): Promise<any> {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}/scraper`);
      
      return {
        success: true,
        data: response.data.data
      };
      
    } catch (error: any) {
      console.error('Get scraper status failed:', error);
      
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.error?.message || 'Failed to get scraper status'
        }
      };
    }
  }

    // Toggle automatic scrape settings for a given scraper site ID
    // public static async toggleAutoScrape(
    //     id:string,
    //     settings: { isAutoEnabled: boolean; autoScrapeInterval: number }
    // ): Promise<ScraperSiteApiResponse> {
    //     const starttime = Date.now();
    //     apiLogger.logRequest("ScraperOperationService.toggleAutoScrape", {
    //         id,
    //         settings
    //     });
    //     try {
    //         const response = await api.patch<ScraperSiteApiResponse>(
    //             `/admin/scraper-sites/${id}`,
    //             settings
    //         );
    //         const duration = Date.now() - starttime;
    //         apiLogger.logResponse("ScraperOperationService.toggleAutoScrape", { 
    //             duration: `${duration}ms`,
    //             response: { ...response.data }
    //         });
    //         return response.data;
    //     } catch (error) {
    //         apiLogger.logError("ScraperOperationService.toggleAutoScrape", error as Error);
    //         throw error;
    //     }

    // }

    // Update scraper site settings for a given scraper site ID
    public static async updateScraperSiteSettings(
        id:string,
        settings:{
            isAutoEnabled:boolean;
            autoScrapeInterval:number;
        }
    ): Promise<ScraperSiteApiResponse> {
        const startTime = Date.now();
        apiLogger.logRequest("ScraperOperationService.updateScraperSiteSettings", {
            id,
            settings
        });
        try {
            const response = await api.patch<ScraperSiteApiResponse>(
                `/admin/scraper-sites/${id}`,
                settings
            );
            const duration = Date.now() - startTime;
            apiLogger.logResponse("ScraperOperationService.updateScraperSiteSettings", {
                duration: `${duration}ms`,
                response: { ...response.data }
            });
            return response.data;
        } catch (error) {
            apiLogger.logError("ScraperOperationService.updateScraperSiteSettings", error as Error);
            throw error;
        }

    }

}