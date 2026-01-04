// scripts/test-cache-implementation.js
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

async function testCacheImplementation() {
  const domain = process.env.CLOUDFLARE_DOMAIN || 'localhost:3000'
  const baseUrl = domain.includes('localhost') ? `http://${domain}` : `https://${domain}`
  
  console.log('🧪 Testing Cloudflare Cache Implementation')
  console.log(`🌐 Base URL: ${baseUrl}`)
  console.log('')

  // Test 1: Seeds API with caching headers
  console.log('📋 Test 1: Seeds API caching headers...')
  try {
    const seedsUrl = `${baseUrl}/api/seed?search=indica&page=1`
    console.log(`Testing: ${seedsUrl}`)
    
    const response = await fetch(seedsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Cache-Test-Script/1.0'
      }
    })
    
    if (response.ok) {
      console.log('✅ Seeds API responded successfully')
      
      // Check cache headers
      const cacheControl = response.headers.get('Cache-Control')
      const cdnCacheControl = response.headers.get('CDN-Cache-Control')
      const cfCacheTag = response.headers.get('CF-Cache-Tag')
      
      console.log(`   Cache-Control: ${cacheControl || 'NOT SET'}`)
      console.log(`   CDN-Cache-Control: ${cdnCacheControl || 'NOT SET'}`)
      console.log(`   CF-Cache-Tag: ${cfCacheTag || 'NOT SET'}`)
      
      // Verify cache headers are set correctly
      if (cacheControl && cacheControl.includes('max-age')) {
        console.log('✅ Cache-Control header configured correctly')
      } else {
        console.log('❌ Cache-Control header missing or incorrect')
      }
      
      if (cfCacheTag) {
        console.log('✅ CF-Cache-Tag header present for selective purging')
      } else {
        console.log('❌ CF-Cache-Tag header missing')
      }
      
    } else {
      console.log(`❌ Seeds API failed: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.log(`❌ Seeds API test failed: ${error.message}`)
  }
  console.log('')

  // Test 2: Admin Cache API
  console.log('🔧 Test 2: Admin Cache API...')
  try {
    const adminCacheUrl = `${baseUrl}/api/admin/cache`
    
    // Test GET (info)
    const infoResponse = await fetch(adminCacheUrl)
    if (infoResponse.ok) {
      const info = await infoResponse.json()
      console.log('✅ Admin cache info API working')
      console.log(`   Available actions: ${info.info?.available_actions?.length || 0}`)
    }
    
    // Test POST (purge seeds) - only if not localhost
    if (!baseUrl.includes('localhost')) {
      console.log('   Testing cache purge...')
      const purgeResponse = await fetch(adminCacheUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge_seeds' })
      })
      
      if (purgeResponse.ok) {
        const result = await purgeResponse.json()
        console.log(`✅ Cache purge test: ${result.message}`)
      } else {
        console.log('⚠️  Cache purge test failed (may need authentication)')
      }
    } else {
      console.log('   ⚠️  Skipping purge test on localhost')
    }
    
  } catch (error) {
    console.log(`❌ Admin cache API test failed: ${error.message}`)
  }
  console.log('')

  // Test 3: Static assets caching
  console.log('📦 Test 3: Static assets caching...')
  try {
    const staticUrl = `${baseUrl}/_next/static/css/app.css`
    const staticResponse = await fetch(staticUrl, { method: 'HEAD' })
    
    if (staticResponse.ok || staticResponse.status === 404) {
      const staticCacheControl = staticResponse.headers.get('Cache-Control')
      console.log(`   Static Cache-Control: ${staticCacheControl || 'NOT SET'}`)
      
      if (staticCacheControl && staticCacheControl.includes('max-age=31536000')) {
        console.log('✅ Static assets cache configured correctly (1 year)')
      } else {
        console.log('⚠️  Static assets cache needs configuration')
      }
    }
  } catch (error) {
    console.log(`ℹ️  Static assets test: ${error.message}`)
  }
  console.log('')

  // Test 4: Check if running on Cloudflare
  console.log('☁️  Test 4: Cloudflare detection...')
  try {
    const testResponse = await fetch(`${baseUrl}/api/seed?limit=1`)
    const cfRay = testResponse.headers.get('CF-Ray')
    const cfCacheStatus = testResponse.headers.get('CF-Cache-Status')
    
    if (cfRay) {
      console.log(`✅ Running behind Cloudflare (CF-Ray: ${cfRay})`)
      console.log(`   Cache Status: ${cfCacheStatus || 'Unknown'}`)
    } else {
      console.log('ℹ️  Not detecting Cloudflare headers (may be localhost or DNS not propagated)')
    }
  } catch (error) {
    console.log(`ℹ️  Cloudflare detection: ${error.message}`)
  }
  console.log('')

  // Summary
  console.log('📊 Implementation Summary:')
  console.log('✅ Cache headers utility created')
  console.log('✅ Cache invalidation class created') 
  console.log('✅ Seeds API updated with caching headers')
  console.log('✅ Admin cache API created')
  console.log('✅ Logger utility created')
  console.log('')
  console.log('🚀 Next Steps:')
  console.log('1. Setup Cloudflare Page Rules in dashboard')
  console.log('2. Test cache purging with scraper runs')
  console.log('3. Monitor cache hit ratios')
  console.log('4. Add cache controls to admin UI')
}

// Run the test
testCacheImplementation().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})