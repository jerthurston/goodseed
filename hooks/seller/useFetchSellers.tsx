"use client"

import { apiLogger } from "@/lib/helpers/api-logger"
import { SellerService } from "@/lib/services/seller/seller.service"
import { UseFetchSellersResult } from "@/types/seller.type"
import { useQuery } from "@tanstack/react-query"



/**
 * Custom hook to fetch sellers without caching (for admin dashboard)
 * Uses TanStack Query with disabled cache
 */
export function useFetchSellers(): UseFetchSellersResult {
  apiLogger.logRequest("useFetchSellers", {})

  const query = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const startTime = Date.now()
      try {
        const data = await SellerService.fetchSellers()
        const duration = Date.now() - startTime
        apiLogger.logResponse(
          "useFetchSellers.queryFn",
          {data},
          {
            sellersCount: data.length,
            duration: `${duration}ms`,
          }
        )
        return data
      } catch (error) {
        apiLogger.logError("useFetchSellers.queryFn", error as Error)
        throw error
      }
    },
    // Cannabis seller data caching strategy
    staleTime: 5 * 60 * 1000,  // 5min - stable business data (seller info changes rarely)
    gcTime: 30 * 60 * 1000,    // 30min retention for sellers
    retry: 2,                  // Fewer retries for seller data
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })

  const result: UseFetchSellersResult = {
    sellers: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }

  apiLogger.logResponse(
    "useFetchSellers",
    {},
    {
      sellersCount: result.sellers.length,
      isLoading: result.isLoading,
      isFetching: result.isFetching,
      isError: result.isError,
      hasError: !!result.error,
    }
  )

  return result
}
