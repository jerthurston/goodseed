import api from "@/lib/api";
import { apiLogger } from "@/lib/helpers/api-logger";
import { ScraperSiteApiResponse } from "@/types/scraperStite.type";


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
            const response = await api.get<ScraperSiteApiResponse[]>('/admin/scraper-sites');
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

    public static async triggerManualScrape(id: string): Promise<ManualScrapeResponse> {
        const startTime = Date.now();
        try {
            // giải thích: Đây là payload gửi đi khi trigger manual scrape. Nó rỗng Bởi vì chúng ta không cần gửi bất kỳ dữ liệu nào để bắt đầu quá trình scrape, tất cả thông tin cần thiết đã được lưu trữ trên server. Không thể bỏ  vì API yêu cầu một payload rỗng để xác nhận yêu cầu.
            const response = await api.post(`/admin/scraper-sites/${id}`, {});
            apiLogger.logResponse("SellerService.triggerManualScrape", { response })

            const duration = Date.now() - startTime;

            apiLogger.logResponse(
                "SellerService.triggerManualScrape",
                { duration: `${duration}ms` },
                { message: "Scrape triggered successfully" },
                
            )

            return response.data;
            
        } catch (error: any) {
            const duration = Date.now() - startTime;

            // Handle different types of API errors
            if (error.response?.status) {
                const errorData = error.response.data;

                apiLogger.logError("ScraperOperationService.triggerManualScrape", error, {
                    sellerId: id,
                    httpStatus: error.response.status,
                    errorCode: errorData?.error?.code,
                    duration
                });

                // Return structured error from API
                return errorData;
            }

            // Handle network/connection errors
            apiLogger.logError("ScraperOperationService.triggerManualScrape", error, {
                sellerId: id,
                errorType: 'network',
                duration
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

    // Toggle automatic scrape settings for a given scraper site ID
    public static async toggleAutoScrape(
        id:string,
        settings: { isAutoEnabled: boolean; autoScrapeInterval: number }
    ): Promise<ScraperSiteApiResponse> {
        const starttime = Date.now();
        apiLogger.logRequest("ScraperOperationService.toggleAutoScrape", {
            id,
            settings
        });
        try {
            const response = await api.patch<ScraperSiteApiResponse>(
                `/admin/scraper-sites/${id}`,
                settings
            );
            const duration = Date.now() - starttime;
            apiLogger.logResponse("ScraperOperationService.toggleAutoScrape", { 
                duration: `${duration}ms`,
                response: { ...response.data }
            });
            return response.data;
        } catch (error) {
            apiLogger.logError("ScraperOperationService.toggleAutoScrape", error as Error);
            throw error;
        }

    }

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