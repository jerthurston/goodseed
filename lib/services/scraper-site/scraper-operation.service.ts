import api from "@/lib/api";
import { apiLogger } from "@/lib/helpers/api-logger";
import { ScraperSiteApiResponse } from "@/types/scraperStite.type";

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
     * Trigger manual scrape for a given scraper site ID
     */

    public static async triggerManualScrape(id: string): Promise<void> {
        const startTime = Date.now();
        try {
            const response = await api.post(`/admin/scraper-sites/${id}`, {});
            apiLogger.logResponse("SellerService.triggerManualScrape", { response })

            const duration = Date.now() - startTime;

            apiLogger.logResponse(
                "SellerService.triggerManualScrape",
                { duration: `${duration}ms` },
                { message: "Scrape triggered successfully" }
            )

            return response.data;
        } catch (error) {
            apiLogger.logError("SellerService.triggerManualScrape", error as Error)
            throw error
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