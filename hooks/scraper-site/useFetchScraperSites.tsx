"use client"

import { apiLogger } from "@/lib/helpers/api-logger"
import { ScraperOperationService } from "@/lib/services/scraper-site/scraper-operation.service"
import { SellerService } from "@/lib/services/seller/seller.service"
import { UseFetchScraperSitesResult } from "@/types/scraperStite.type"
import { useQuery } from "@tanstack/react-query"



/**
 * Custom hook to fetch scraper sites without caching (for admin dashboard)
 * Uses TanStack Query with disabled cache
 */
export function useFetchScraperSites(): UseFetchScraperSitesResult {
  apiLogger.logRequest("useFetchScraperSites", {})

  const query = useQuery({
    queryKey: ["admin-scraper-sites"],
    queryFn: async () => {
      try {
        const data = await ScraperOperationService.fetchScraperSites()
        apiLogger.debug("useFetchScraperSites.queryFn", { data })
        return data
      } catch (error) {
        apiLogger.logError("useFetchScraperSites.queryFn", error as Error)
        throw error; // Phải ném lỗi ra đây dù ở service đã có rồi để query tanstack có thể catch được.
      }
    },
    // Disable cache for admin dashboard - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })

  const result: UseFetchScraperSitesResult = {
    scraperSites: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }

  apiLogger.logResponse(
    "useFetchScraperSites",
    {},
    {
      sitesCount: result.scraperSites.length,
      isLoading: result.isLoading,
      isFetching: result.isFetching,
      isError: result.isError,
      hasError: !!result.error,
    }
  )

  return result
}
