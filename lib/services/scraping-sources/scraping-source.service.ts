import api from '@/lib/api'
import { scrapingSourceSchema, type ScrapingSourceInput } from '@/schemas/seller.schema'
import { z } from 'zod'

// Types for service layer
export interface ScrapingSource {
  id: string
  sellerId: string
  scrapingSourceName: string
  scrapingSourceUrl: string
  maxPage: number
}

export interface CreateScrapingSourceData {
  scrapingSourceName?: string // Optional, will be computed from URL
  scrapingSourceUrl: string
  maxPage: number
}

export interface ApiErrorResponse {
  error: string
  fields?: Record<string, string>
}

/**
 * Service class for handling scraping sources operations
 */
export class ScrapingSourceService {
  /**
   * Fetch all scraping sources for a seller
   */
  static async getScrapingSources(sellerId: string): Promise<ScrapingSource[]> {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}/scraping-sources`)
      return response.data
    } catch (error: any) {
      console.error('Error fetching scraping sources:', error)
      throw new Error(error.response?.data?.error || 'Failed to fetch scraping sources')
    }
  }

  /**
   * Create a new scraping source for a seller
   */
  static async createScrapingSource(
    sellerId: string, 
    data: CreateScrapingSourceData
  ): Promise<ScrapingSource> {
    try {
      // Client-side validation using Zod schema
      const validationResult = scrapingSourceSchema
        .omit({ id: true, sellerId: true, scrapingSourceName: true })
        .safeParse(data)

      if (!validationResult.success) {
        const fieldErrors: Record<string, string> = {}
        validationResult.error.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            fieldErrors[issue.path[0] as string] = issue.message
          }
        })
        throw {
          response: {
            data: {
              error: 'Validation failed',
              fields: fieldErrors
            }
          }
        }
      }

      const response = await api.post(`/admin/sellers/${sellerId}/scraping-sources`, validationResult.data)
      return response.data
    } catch (error: any) {
      console.error('Error creating scraping source:', error)
      
      // Re-throw structured errors from API
      if (error.response?.data) {
        throw error
      }
      
      // Wrap unexpected errors
      throw new Error(error.message || 'Failed to create scraping source')
    }
  }

  /**
   * Update an existing scraping source
   */
  static async updateScrapingSource(
    sellerId: string,
    sourceId: string,
    data: Partial<CreateScrapingSourceData>
  ): Promise<ScrapingSource> {
    try {
      const response = await api.put(`/admin/sellers/${sellerId}/scraping-sources/${sourceId}`, data)
      return response.data
    } catch (error: any) {
      console.error('Error updating scraping source:', error)
      
      if (error.response?.data) {
        throw error
      }
      
      throw new Error(error.message || 'Failed to update scraping source')
    }
  }

  /**
   * Delete a scraping source
   */
  static async deleteScrapingSource(sellerId: string, sourceId: string): Promise<void> {
    try {
      await api.delete(`/admin/sellers/${sellerId}/scraping-sources/${sourceId}`)
    } catch (error: any) {
      console.error('Error deleting scraping source:', error)
      
      if (error.response?.data) {
        throw error
      }
      
      throw new Error(error.message || 'Failed to delete scraping source')
    }
  }

  /**
   * Validate scraping source data on the client side
   */
  static validateScrapingSourceData(data: CreateScrapingSourceData): {
    success: boolean
    errors?: Record<string, string>
  } {
    const validationResult = scrapingSourceSchema
      .omit({ id: true, sellerId: true, scrapingSourceName: true })
      .safeParse(data)

    if (validationResult.success) {
      return { success: true }
    }

    const errors: Record<string, string> = {}
    validationResult.error.issues.forEach((issue) => {
      if (issue.path.length > 0) {
        errors[issue.path[0] as string] = issue.message
      }
    })

    return { success: false, errors }
  }
}