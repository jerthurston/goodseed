import { z } from 'zod'

/**
 * ScrapingSource schema - matches Prisma ScrapingSource model
 */
export const scrapingSourceSchema = z.object({
  id: z.string().cuid().optional(), // Optional for creation
  sellerId: z.string().cuid().optional(), // Optional for creation, will be set by backend
  scrapingSourceUrl: z
    .string()
    .min(1, 'Scraping source URL is required')
    .url('Please enter a valid scraping source URL')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must start with http:// or https://'
    ),
  scrapingSourceName: z
    .string()
    .min(2, 'Source name must be at least 2 characters')
    .max(100, 'Source name must be less than 100 characters')
    .trim()
    .optional(), // Will be computed from URL
  maxPage: z
    .number()
    .int('Max page must be an integer')
    .min(1, 'Max page must be at least 1')
    .max(1000, 'Max page cannot exceed 1000')
    .default(10)
})

export type ScrapingSourceInput = z.infer<typeof scrapingSourceSchema>

/**
 * Schema for creating a new seller - matches Prisma Seller model
 * Used for both server-side and client-side validation
 */
export const createSellerSchema = z.object({
  name: z
    .string()
    .min(1, 'Seller name is required')
    .min(2, 'Seller name must be at least 2 characters')
    .max(100, 'Seller name must be less than 100 characters')
    .trim()
    .refine(
      (name) => name.length > 0,
      'Seller name cannot be empty after trimming'
    ),
  
  url: z
    .string()
    .min(1, 'Website URL is required')
    .url('Please enter a valid URL')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must start with http:// or https://'
    ),
  
  isActive: z
    .boolean()
    .default(true),
  
  affiliateTag: z
    .string()
    .optional()
    .transform((val) => val?.trim() || null)
    .refine(
      (val) => !val || val.length <= 100,
      'Affiliate tag must be less than 100 characters'
    ),

  // ScrapingSources as separate relation - optional for creation, can be added later
  scrapingSources: z
    .array(scrapingSourceSchema.omit({ id: true, sellerId: true }))
    .max(5, 'Maximum 5 scraping sources allowed')
    .optional()
    .default([])
})

/**
 * Type inference from the schema
 */
export type CreateSellerInput = z.infer<typeof createSellerSchema>

/**
 * Schema for updating an existing seller
 */
export const updateSellerSchema = createSellerSchema.partial().extend({
  id: z.string().cuid('Invalid seller ID format')
})

export type UpdateSellerInput = z.infer<typeof updateSellerSchema>

/**
 * Schema for updating scraping sources separately
 */
export const updateScrapingSourceSchema = scrapingSourceSchema.partial().extend({
  id: z.string().cuid('Invalid scraping source ID format')
})

export type UpdateScrapingSourceInput = z.infer<typeof updateScrapingSourceSchema>

/**
 * Schema for seller with populated relations (for API responses)
 */
export const sellerWithRelationsSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  url: z.string().url(),
  isActive: z.boolean(),
  autoScrapeInterval: z.number().int().nullable(),
  affiliateTag: z.string().nullable(),
  lastScraped: z.date().nullable(),
  status: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  scrapingSources: z.array(scrapingSourceSchema),
  // Add other relations as needed
  // seedCategories: z.array(...),
  // scrapeLogs: z.array(...),
  // scrapeJobs: z.array(...)
})

export type SellerWithRelations = z.infer<typeof sellerWithRelationsSchema>

/**
 * Validation helper to parse and validate seller data
 * Returns either success with data or error with formatted messages
 */
export function validateSellerData(data: unknown) {
  try {
    const validatedData = createSellerSchema.parse(data)
    return {
      success: true as const,
      data: validatedData,
      error: null
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      
      return {
        success: false as const,
        data: null,
        error: {
          message: 'Validation failed',
          details: formattedErrors,
          fields: formattedErrors.reduce((acc: Record<string, string>, curr: { field: string; message: string }) => {
            acc[curr.field] = curr.message
            return acc
          }, {} as Record<string, string>)
        }
      }
    }
    
    return {
      success: false as const,
      data: null,
      error: {
        message: 'Unknown validation error',
        details: [],
        fields: {}
      }
    }
  }
}

/**
 * Validation helper for scraping source data
 */
export function validateScrapingSourceData(data: unknown) {
  try {
    const validatedData = scrapingSourceSchema.parse(data)
    return {
      success: true as const,
      data: validatedData,
      error: null
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      
      return {
        success: false as const,
        data: null,
        error: {
          message: 'Scraping source validation failed',
          details: formattedErrors,
          fields: formattedErrors.reduce((acc: Record<string, string>, curr: { field: string; message: string }) => {
            acc[curr.field] = curr.message
            return acc
          }, {} as Record<string, string>)
        }
      }
    }
    
    return {
      success: false as const,
      data: null,
      error: {
        message: 'Unknown scraping source validation error',
        details: [],
        fields: {}
      }
    }
  }
}

/**
 * URL validation helper for both website and scraping URLs
 */
export function isValidSellerURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Seller name validation helper
 */
export function isValidSellerName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 100
}

/**
 * Scraping source name validation helper
 */
export function isValidScrapingSourceName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 100
}

/**
 * Max page validation helper
 */
export function isValidMaxPage(maxPage: number): boolean {
  return Number.isInteger(maxPage) && maxPage >= 1 && maxPage <= 1000
}

/**
 * Auto scrape interval validation helper  
 */
export function isValidAutoScrapeInterval(interval: number): boolean {
  return Number.isInteger(interval) && interval >= 1 && interval <= 168
}