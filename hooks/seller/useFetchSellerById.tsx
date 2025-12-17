"use client"

import { apiLogger } from "@/lib/helpers/api-logger"
import { SellerService } from "@/lib/services/seller/seller.service"
import { SellerTransformer } from "@/lib/transfomers/seller.transformer"
import { Seller, SellerUI } from "@/types/seller.type"
import { useQuery } from "@tanstack/react-query"

export interface UseFetchSellerByIdResult {
  seller: SellerUI | null
  rawSeller: Seller | null
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Custom hook to fetch a specific seller by ID
 * Returns both raw seller data and UI-transformed data
 */
export function useFetchSellerById(sellerId: string | undefined): UseFetchSellerByIdResult {
  apiLogger.logRequest("useFetchSellerById", { sellerId })

  const query = useQuery({
    queryKey: ["seller", sellerId],
    queryFn: async () => {
      if (!sellerId) {
        throw new Error("Seller ID is required")
      }

      const startTime = Date.now()
      try {
        // Fetch specific seller by ID using dedicated API endpoint
        const seller = await SellerService.fetchSellerById(sellerId)

        const duration = Date.now() - startTime
        apiLogger.logResponse(
          "useFetchSellerById.queryFn",
          { sellerId },
          {
            sellerName: seller.name,
            duration: `${duration}ms`,
          }
        )
        
        return seller
      } catch (error) {
        apiLogger.logError("useFetchSellerById.queryFn", error as Error, { sellerId })
        throw error
      }
    },
    enabled: !!sellerId, // Only run query if sellerId is provided
    // Disable cache for admin dashboard - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })

  const result: UseFetchSellerByIdResult = {
    seller: query.data ? SellerTransformer.toUI(query.data) : null,
    rawSeller: query.data || null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }

  apiLogger.logResponse("useFetchSellerById", { sellerId }, {
    hasData: !!query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  })

  return result
}