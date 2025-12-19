import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ScrapingSourceService, type ScrapingSource, type CreateScrapingSourceData } from '@/lib/services/scraping-sources/scraping-source.service'
import { toast } from 'sonner'
import { apiLogger } from '@/lib/helpers/api-logger'

/**
 * Query keys for scraping sources
 */
export const scrapingSourcesKeys = {
  all: ['scrapingSources'] as const,
  lists: () => [...scrapingSourcesKeys.all, 'list'] as const,
  list: (sellerId: string) => [...scrapingSourcesKeys.lists(), sellerId] as const,
  details: () => [...scrapingSourcesKeys.all, 'detail'] as const,
  detail: (id: string) => [...scrapingSourcesKeys.details(), id] as const,
}

/**
 * Hook for fetching scraping sources using React Query
 */
export function useScrapingSources(sellerId: string | null) {
  const query = useQuery({
    queryKey: scrapingSourcesKeys.list(sellerId || ''),
    queryFn: async () => {
      if (!sellerId) {
        return []
      }
      apiLogger.debug('Fetching scraping sources for seller:', { sellerId })
      const sources = await ScrapingSourceService.getScrapingSources(sellerId)
      apiLogger.debug('Fetched scraping sources successfully:', { count: sources.length, sellerId })
      return sources
    },
    enabled: !!sellerId,
    staleTime: 0, // Always fetch fresh data for admin
    gcTime: 0, // No cache retention for admin
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnReconnect: true, // Refetch on network reconnect
  })

  return {
    scrapingSources: query.data || [],
    isLoading: query.isPending,
    error: query.error?.message || null,
    refetch: query.refetch,
    isError: query.isError,
  }
}

/**
 * Hook for creating scraping sources using React Query
 */
export function useCreateScrapingSource() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ sellerId, data }: { sellerId: string; data: CreateScrapingSourceData }) => {
      apiLogger.debug('Creating scraping source:', { sellerId, data })
      const newSource = await ScrapingSourceService.createScrapingSource(sellerId, data)
      apiLogger.debug('Scraping source created successfully:', { newSource })
      return { sellerId, newSource }
    },
    
    // No cache for admin mutations
    gcTime: 0,

    onSuccess: ({ sellerId, newSource }) => {
      // Invalidate and refetch scraping sources for this seller - no cache for admin
      queryClient.invalidateQueries({
        queryKey: scrapingSourcesKeys.list(sellerId)
      })
      
      // Also invalidate all related queries to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: scrapingSourcesKeys.all
      })

      toast.success('Scraping Source Created', {
        description: `${newSource.scrapingSourceName} has been added successfully`,
        duration: 4000,
      })
    },

    onError: (error: any) => {
      apiLogger.logError('Error creating scraping source:', error)
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create scraping source'
      
      toast.error('Failed to Create Scraping Source', {
        description: errorMessage,
        duration: 5000,
      })
    }
  })

  return {
    createScrapingSource: async (sellerId: string, data: CreateScrapingSourceData) => {
      return mutation.mutateAsync({ sellerId, data })
    },
    isCreating: mutation.isPending,
    error: mutation.error?.message || null,
    fieldErrors: mutation.error?.response?.data?.fields || {},
    clearErrors: () => mutation.reset(),
  }
}

/**
 * Hook for updating scraping sources using React Query
 */
export function useUpdateScrapingSource() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ 
      sellerId, 
      sourceId, 
      data 
    }: { 
      sellerId: string; 
      sourceId: string; 
      data: Partial<CreateScrapingSourceData> 
    }) => {
      apiLogger.debug('Updating scraping source:', { sellerId, sourceId, data })
      const updatedSource = await ScrapingSourceService.updateScrapingSource(sellerId, sourceId, data)
      apiLogger.debug('Scraping source updated successfully:', { updatedSource })
      return { sellerId, updatedSource }
    },
    
    // No cache for admin mutations
    gcTime: 0,

    onSuccess: ({ sellerId }) => {
      // Invalidate and refetch scraping sources for this seller - no cache for admin
      queryClient.invalidateQueries({
        queryKey: scrapingSourcesKeys.list(sellerId)
      })
      
      // Also invalidate all related queries to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: scrapingSourcesKeys.all
      })

      toast.success('Scraping Source Updated', {
        description: 'Changes have been saved successfully',
        duration: 4000,
      })
    },

    onError: (error: any) => {
      apiLogger.logError('Error updating scraping source:', error)
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update scraping source'
      
      toast.error('Failed to Update Scraping Source', {
        description: errorMessage,
        duration: 5000,
      })
    }
  })

  return {
    updateScrapingSource: async (
      sellerId: string,
      sourceId: string,
      data: Partial<CreateScrapingSourceData>
    ) => {
      return mutation.mutateAsync({ sellerId, sourceId, data })
    },
    isUpdating: mutation.isPending,
    error: mutation.error?.message || null,
  }
}

/**
 * Hook for deleting scraping sources using React Query
 */
export function useDeleteScrapingSource() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ 
      sellerId, 
      sourceId, 
      sourceName 
    }: { 
      sellerId: string; 
      sourceId: string; 
      sourceName: string 
    }) => {
      apiLogger.debug('Deleting scraping source:', { sellerId, sourceId, sourceName })
      await ScrapingSourceService.deleteScrapingSource(sellerId, sourceId)
      apiLogger.debug('Scraping source deleted successfully:', { sourceId })
      return { sellerId, sourceName }
    },
    
    // No cache for admin mutations
    gcTime: 0,

    onSuccess: ({ sellerId, sourceName }) => {
      // Invalidate and refetch scraping sources for this seller - no cache for admin
      queryClient.invalidateQueries({
        queryKey: scrapingSourcesKeys.list(sellerId)
      })
      
      // Also invalidate all related queries to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: scrapingSourcesKeys.all
      })

      toast.success('Scraping Source Deleted', {
        description: `${sourceName} has been removed`,
        duration: 4000,
      })
    },

    onError: (error: any) => {
      apiLogger.logError('Error deleting scraping source:', error)
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete scraping source'
      
      toast.error('Failed to Delete Scraping Source', {
        description: errorMessage,
        duration: 5000,
      })
    }
  })

  return {
    deleteScrapingSource: async (
      sellerId: string,
      sourceId: string,
      sourceName: string
    ) => {
      await mutation.mutateAsync({ sellerId, sourceId, sourceName })
      return true
    },
    isDeleting: mutation.isPending,
    error: mutation.error?.message || null,
  }
}