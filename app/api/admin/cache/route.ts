// app/api/admin/cache/route.ts
import { cloudflareCache } from '@/lib/cache-invalidation'
import { NextRequest, NextResponse } from 'next/server'
import { apiLogger } from '@/lib/helpers/api-logger'

export async function POST(request: NextRequest) {
  try {
    const { action, sellerId, tags } = await request.json()
    
    apiLogger.info('Admin cache purge request', { action, sellerId, tags })
    
    let result = false
    let message = ''
    
    switch (action) {
      case 'purge_seeds':
        result = await cloudflareCache.purgeByTag(['seeds', 'products'])
        message = 'Seeds and products cache purged'
        break
        
      case 'purge_seller':
        if (!sellerId) {
          return NextResponse.json({ error: 'sellerId required for seller purge' }, { status: 400 })
        }
        result = await cloudflareCache.purgeByTag([`seller_${sellerId}`, 'seeds'])
        message = `Seller ${sellerId} cache purged`
        break
        
      case 'purge_search':
        result = await cloudflareCache.purgeByTag(['search', 'seeds'])
        message = 'Search results cache purged'
        break
        
      case 'purge_cannabis_type':
        const { searchParams } = new URL(request.url)
        const cannabisType = searchParams.get('type') || request.nextUrl.searchParams.get('type')
        if (cannabisType) {
          result = await cloudflareCache.purgeByTag([`cannabis_${cannabisType.toLowerCase()}`, 'seeds'])
          message = `Cannabis type ${cannabisType} cache purged`
        } else {
          return NextResponse.json({ error: 'type parameter required for cannabis type purge' }, { status: 400 })
        }
        break
        
      case 'purge_all':
        result = await cloudflareCache.purgeAll()
        message = 'All cache purged (use with caution!)'
        break
        
      case 'purge_custom':
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({ error: 'tags array required for custom purge' }, { status: 400 })
        }
        result = await cloudflareCache.purgeByTag(tags)
        message = `Custom tags purged: ${tags.join(', ')}`
        break
        
      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 })
    }
    
    if (result) {
      apiLogger.info('Cache purge successful', { action, sellerId, message })
      return NextResponse.json({ 
        success: true, 
        message,
        action,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    } else {
      apiLogger.logError('/api/admin/cache', new Error('Cache purge failed'), { action, sellerId })
      return NextResponse.json({ 
        success: false, 
        message: `Cache purge ${action} failed`,
        action
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache', 
          'Expires': '0'
        }
      })
    }
    
  } catch (error) {
    apiLogger.logError('/api/admin/cache', error as Error)
    return NextResponse.json({ 
      success: false, 
      error: 'Cache purge operation failed',
      message: (error as Error).message || 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

// GET method for cache status/info
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      info: {
        domain: process.env.CLOUDFLARE_DOMAIN,
        available_actions: [
          'purge_seeds',
          'purge_seller', 
          'purge_search',
          'purge_cannabis_type',
          'purge_all',
          'purge_custom'
        ],
        cache_tags: [
          'seeds',
          'products', 
          'search',
          'cannabis_[type]',
          'seed_[type]',
          'seller_[id]'
        ]
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}