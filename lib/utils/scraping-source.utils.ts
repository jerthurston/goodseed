/**
 * Extract scraping source name from URL
 * Takes the domain name (before first dot) 
 * Multiple URLs from same domain will have same name - this is intentional
 * Example: https://vancouverseedbank.ca/any/path -> vancouverseedbank
 */
export function extractScrapingSourceName(url: string): string {
  try {
    // Remove protocol (http:// or https://)
    const withoutProtocol = url.replace(/^https?:\/\//, '')
    
    // Extract hostname part (before first slash)
    const hostname = withoutProtocol.split('/')[0]
    
    // Split by dots and find the actual domain name
    const parts = hostname.split('.')
    
    // Skip 'www' prefix if present and get the main domain name
    let name = parts[0]
    if (name.toLowerCase() === 'www' && parts.length > 1) {
      name = parts[1] // Use the second part as the domain name
    }
    
    // Clean up and validate
    const cleanName = name.toLowerCase().trim()
    
    if (cleanName.length === 0) {
      throw new Error('Cannot extract valid name from URL')
    }
    
    return cleanName
  } catch (error) {
    console.error('Error extracting scraping source name from URL:', url, error)
    // Fallback: use a generic name
    return 'unknown-source'
  }
}

/**
 * Validate if URL can generate a valid scraping source name
 */
export function validateScrapingSourceUrl(url: string): boolean {
  try {
    const name = extractScrapingSourceName(url)
    return name !== 'unknown-source' && name.length >= 2
  } catch {
    return false
  }
}