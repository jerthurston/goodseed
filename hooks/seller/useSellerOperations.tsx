"use client"

import { apiLogger } from "@/lib/helpers/api-logger"
import { SellerService } from "@/lib/services/seller/seller.service"
import { useMutation } from "@tanstack/react-query"

export interface UseSellerOperationsResult {
  toggleSellerStatus: (id: string, currentStatus: boolean) => Promise<void>
  isToggling: boolean
  toggleError: Error | null
}

/**
 * Custom hook for seller operations (toggle status, update settings, etc.)
 * Uses TanStack Query mutations for optimistic updates and error handling
 */
export function useSellerOperations(onSuccess?: () => void): UseSellerOperationsResult {
  apiLogger.logRequest("useSellerOperations", {})

  // Mutation for toggling seller status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: boolean }) => {
      const startTime = Date.now()
      try {
        const result = await SellerService.updateSellerStatus(id, newStatus)
        const duration = Date.now() - startTime
        
        apiLogger.logResponse(
          "useSellerOperations.toggleStatus",
          { id, newStatus },
          {
            sellerId: result.id,
            sellerName: result.name,
            isActive: result.isActive,
            duration: `${duration}ms`,
          }
        )
        
        return result
      } catch (error) {
        apiLogger.logError("useSellerOperations.toggleStatus", error as Error)
        throw error
      }
    },
    onSuccess: () => {
      // Trigger refetch of sellers data
      if (onSuccess) {
        onSuccess()
      }
    },
    onError: (error) => {
      apiLogger.logError("useSellerOperations.toggleStatus.onError", error as Error)
    }
  })

  const toggleSellerStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    
    apiLogger.logRequest("useSellerOperations.toggleSellerStatus", {
      id,
      currentStatus,
      newStatus
    })
    
    await toggleStatusMutation.mutateAsync({ id, newStatus })
  }

  const result: UseSellerOperationsResult = {
    toggleSellerStatus,
    isToggling: toggleStatusMutation.isPending,
    toggleError: toggleStatusMutation.error,
  }

  return result
}