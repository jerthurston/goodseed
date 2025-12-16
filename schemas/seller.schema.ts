import { z } from 'zod'

/**
 * Schema for creating a new seller
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
  
  scrapingSourceUrl: z
    .union([
      z.string().url('Please enter a valid scraping source URL'),
      z.array(z.string().url('Each URL must be valid'))
    ])
    .transform((val) => {
      // If it's a string, convert to array
      if (typeof val === 'string') {
        return [val]
      }
      return val
    })
    .refine(
      (urls) => urls.length > 0,
      'At least one scraping source URL is required'
    )
    .refine(
      (urls) => urls.every(url => url.startsWith('http://') || url.startsWith('https://')),
      'All URLs must start with http:// or https://'
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
    )
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