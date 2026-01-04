// lib/cache-invalidation.ts
import { apiLogger } from './helpers/api-logger'

export class CloudflareCache {
  private zoneId: string
  private apiToken: string
  
  constructor() {
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID!
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN!
    
    if (!this.zoneId || !this.apiToken) {
      throw new Error('Cloudflare configuration missing: CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN required')
    }
  }
  
  async purgeByTag(tags: string[]): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tags })
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Cloudflare purge failed: ${error.errors?.[0]?.message || response.statusText}`)
      }
      
      const result = await response.json()
      apiLogger.info('Cache purged successfully', { tags, purgeId: result.result?.id })
      return true
      
    } catch (error) {
      apiLogger.logError('cloudflare-cache-purge', error as Error, { tags })
      return false
    }
  }
  
  async purgeAll(): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ purge_everything: true })
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Cloudflare purge all failed: ${error.errors?.[0]?.message || response.statusText}`)
      }
      
      const result = await response.json()
      apiLogger.warn('All cache purged', { purgeId: result.result?.id })
      return true
      
    } catch (error) {
      apiLogger.logError('cloudflare-cache-purge-all', error as Error)
      return false
    }
  }
  
  async purgeUrls(urls: string[]): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ files: urls })
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Cloudflare URL purge failed: ${error.errors?.[0]?.message || response.statusText}`)
      }
      
      const result = await response.json()
      apiLogger.info('URLs purged successfully', { urls, purgeId: result.result?.id })
      return true
      
    } catch (error) {
      apiLogger.logError('cloudflare-cache-purge-urls', error as Error, { urls })
      return false
    }
  }
}

// Singleton instance
export const cloudflareCache = new CloudflareCache()