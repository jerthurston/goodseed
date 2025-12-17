import api from "@/lib/api"
import { apiLogger } from "@/lib/helpers/api-logger"
import { ScraperSiteApiResponse } from "@/types/scraperStite.type"
import { SellerRaw, SellerUpdateResponse } from "@/types/seller.type"



export class SellerService {
  /**
   * Fetch raw sellers data from API
   * UI components should use SellerTransformer to transform this data as needed
   */
  public static async fetchSellers(): Promise<SellerRaw[]> {
    const startTime = Date.now()

    try {
      apiLogger.logRequest("SellerService.fetchSellers", {})

      const response = await api.get<SellerRaw[]>("/admin/sellers")

      const duration = Date.now() - startTime
      apiLogger.logResponse(
        "SellerService.fetchSellers",
        {},
        {
          sellersCount: response.data.length,
          duration: `${duration}ms`,
        }
      )

      return response.data
    } catch (error) {
      apiLogger.logError("SellerService.fetchSellers", error as Error)
      throw error
    }
  }

  /**
   * Fetch a specific seller by ID from API
   * UI components should use SellerTransformer to transform this data as needed
   */
  public static async fetchSellerById(sellerId: string): Promise<SellerRaw> {
    const startTime = Date.now()

    try {
      apiLogger.logRequest("SellerService.fetchSellerById", { sellerId })

      const response = await api.get<SellerRaw>(`/admin/sellers/${sellerId}`)

      const duration = Date.now() - startTime
      apiLogger.logResponse(
        "SellerService.fetchSellerById",
        { sellerId },
        {
          sellerName: response.data.name,
          duration: `${duration}ms`,
        }
      )

      return response.data
    } catch (error) {
      apiLogger.logError("SellerService.fetchSellerById", error as Error, { sellerId })
      throw error
    }
  }

  public static async updateSellerStatus(
    id: string,
    isActive: boolean
  ): Promise<SellerUpdateResponse> {
    try {
      apiLogger.logRequest("SellerService.updateSellerStatus", {
        id,
        isActive,
      })

      const response = await api.patch<SellerUpdateResponse>(
        `/admin/sellers/${id}`,
        { isActive }
      )

      apiLogger.logResponse("SellerService.updateSellerStatus", {}, { 
        sellerId: response.data.id,
        sellerName: response.data.name,
        isActive: response.data.isActive 
      })

      return response.data
    } catch (error) {
      apiLogger.logError("SellerService.updateSellerStatus", error as Error)
      throw error
    }
  }

  // public static async updateScraperSiteSettings(
  //   id: string,
  //   settings: { isAutoEnabled: boolean; autoScrapeInterval: number }
  // ): Promise<ScraperSiteApiResponse> {
  //   try {
  //     apiLogger.logRequest("SellerService.updateScraperSiteSettings", {
  //       id,
  //       settings,
  //     })

  //     const response = await api.patch<ScraperSiteApiResponse>(
  //       `/admin/scraper-sites/${id}`,
  //       settings
  //     )

  //     apiLogger.logResponse(
  //       "SellerService.updateScraperSiteSettings",
  //       {},
  //       {
  //         siteId: response.data.id,
  //         siteName: response.data.name,
  //         isAutoEnabled: response.data.isAutoEnabled,
  //         autoScrapeInterval: response.data.autoScrapeInterval
  //       }
  //     )

  //     return response.data
  //   } catch (error) {
  //     apiLogger.logError(
  //       "SellerService.updateScraperSiteSettings",
  //       error as Error
  //     )
  //     throw error
  //   }
  // }

  // public static async triggerManualScrape(id: string): Promise<void> {
  //   try {
  //     apiLogger.logRequest("SellerService.triggerManualScrape", { id })

  //     await api.post(`/admin/scraper-sites/${id}`, {})

  //     apiLogger.logResponse(
  //       "SellerService.triggerManualScrape",
  //       {},
  //       { message: "Scrape triggered successfully" }
  //     )
  //   } catch (error) {
  //     apiLogger.logError("SellerService.triggerManualScrape", error as Error)
  //     throw error
  //   }
  // }

  // public static async fetchScraperSites(): Promise<ScraperSiteApiResponse[]> {
  //   const startTime = Date.now()

  //   try {
  //     apiLogger.logRequest("SellerService.fetchScraperSites", {})

  //     const response = await api.get<ScraperSiteApiResponse[]>(
  //       "/admin/scraper-sites"
  //     )

  //     const duration = Date.now() - startTime
  //     apiLogger.logResponse(
  //       "SellerService.fetchScraperSites",
  //       {},
  //       {
  //         sitesCount: response.data.length,
  //         duration: `${duration}ms`,
  //       }
  //     )

  //     return response.data
  //   } catch (error) {
  //     apiLogger.logError("SellerService.fetchScraperSites", error as Error)
  //     throw error
  //   }
  // }
}
