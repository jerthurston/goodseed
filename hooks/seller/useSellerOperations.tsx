"use client"

import { apiLogger } from "@/lib/helpers/api-logger"
import { SellerService } from "@/lib/services/seller/seller.service"
import { useMutation } from "@tanstack/react-query"
import { updateSellerSchema, type UpdateSellerInput } from "@/schemas/seller.schema"
import { z } from "zod"

// Infer update data type from Zod schema (omit id field for updates)
export type SellerUpdateData = Omit<Partial<UpdateSellerInput>, 'id'>

export interface UseSellerOperationsResult {
  updateSeller: (id: string, data: SellerUpdateData) => Promise<void>
  toggleSellerStatus: (id: string, currentStatus: boolean) => Promise<void>
  isUpdating: boolean
  updateError: Error | null
}

/**
 * Custom hook for seller operations (toggle status, update settings, etc.)
 * Uses TanStack Query mutations for optimistic updates and error handling
 */
export function useSellerOperations(onSuccess?: () => void): UseSellerOperationsResult {
  apiLogger.logRequest("useSellerOperations", {})

  // Generic mutation for updating seller with flexible data
  const updateSellerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SellerUpdateData }) => {
      const startTime = Date.now()
      try {
        const result = await SellerService.updateSeller(id, data)
        const duration = Date.now() - startTime
        
        apiLogger.logResponse(
          "useSellerOperations.updateSeller",
          { id, data },
          {
            sellerId: result.id,
            sellerName: result.name,
            fieldsUpdated: Object.keys(data),
            duration: `${duration}ms`,
          }
        )
        
        return result
      } catch (error) {
        apiLogger.logError("useSellerOperations.updateSeller", error as Error)
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
      apiLogger.logError("useSellerOperations.updateSeller.onError", error as Error)
    }
  })



  // Generic update function
  const updateSeller = async (id: string, data: SellerUpdateData) => {
    apiLogger.logRequest("useSellerOperations.updateSeller", {
      id,
      data,
      fieldsToUpdate: Object.keys(data)
    })
    
    await updateSellerMutation.mutateAsync({ id, data })
  }

  // Convenience function for toggling status (uses generic updateSeller)
  const toggleSellerStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    
    apiLogger.logRequest("useSellerOperations.toggleSellerStatus", {
      id,
      currentStatus,
      newStatus
    })
    
    await updateSeller(id, { isActive: newStatus })
  }

  const result: UseSellerOperationsResult = {
    updateSeller,
    toggleSellerStatus,
    isUpdating: updateSellerMutation.isPending,
    updateError: updateSellerMutation.error,
  }

  return result
}