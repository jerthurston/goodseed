// scripts/test-cloudflare-connection.js
const fs = require('fs')
const dotenv = require('dotenv')
const path = require('path')

function loadEnvironment() {
  const candidatePaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env.development'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env.development'),
    path.join(__dirname, '../.env'),
  ]

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath })
      if (!result.error) {
        console.log(`[dotenv] Loaded ${path.basename(envPath)} for Cloudflare tests`)
        return
      }
    }
  }

  dotenv.config()
  console.warn('[dotenv] No specific env file found, falling back to process.env only')
}

loadEnvironment()

async function testCloudflareConnection() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const domain = process.env.CLOUDFLARE_DOMAIN

  console.log('🔍 Testing Cloudflare Connection...')
  console.log('📋 Configuration:')
  console.log(`   Domain: ${domain}`)
  console.log(`   Zone ID: ${zoneId}`)
  console.log(`   API Token: ${apiToken ? '***' + apiToken.slice(-4) : 'NOT_SET'}`)
  console.log('')

  if (!zoneId || !apiToken || !domain) {
    console.error('❌ Missing Cloudflare configuration in .env file')
    console.log('Required variables:')
    console.log('- CLOUDFLARE_ZONE_ID')
    console.log('- CLOUDFLARE_API_TOKEN') 
    console.log('- CLOUDFLARE_DOMAIN')
    process.exit(1)
  }

  try {
    // Test 1: Verify API token and zone access
    console.log('🔐 Test 1: Verifying API token and zone access...')
    const zoneResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const zoneData = await zoneResponse.json()

    if (!zoneResponse.ok) {
      console.error('❌ Zone API failed:', zoneData.errors?.[0]?.message || zoneResponse.statusText)
      return false
    }

    const zone = zoneData.result
    console.log(`✅ Zone access successful!`)
    console.log(`   Zone Name: ${zone.name}`)
    console.log(`   Zone Status: ${zone.status}`)
    console.log(`   Development Mode: ${zone.development_mode ? 'ON' : 'OFF'}`)
    console.log('')

    // Test 2: Verify domain matches zone
    if (zone.name !== domain) {
      console.warn(`⚠️  Domain mismatch: .env has "${domain}" but zone is "${zone.name}"`)
      console.log(`   Consider updating CLOUDFLARE_DOMAIN=${zone.name} in .env`)
      console.log('')
    }

    // Test 3: Check DNS records
    console.log('🌐 Test 2: Checking DNS records...')
    const dnsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const dnsData = await dnsResponse.json()
    if (dnsResponse.ok && dnsData.result) {
      const records = dnsData.result
      console.log(`✅ DNS Records found: ${records.length}`)
      
      const aRecords = records.filter(r => r.type === 'A')
      const cnameRecords = records.filter(r => r.type === 'CNAME')
      
      console.log(`   A Records: ${aRecords.length}`)
      aRecords.forEach(record => {
        console.log(`     ${record.name} → ${record.content} (${record.proxied ? 'Proxied' : 'DNS Only'})`)
      })
      
      console.log(`   CNAME Records: ${cnameRecords.length}`)
      cnameRecords.forEach(record => {
        console.log(`     ${record.name} → ${record.content} (${record.proxied ? 'Proxied' : 'DNS Only'})`)
      })
    }
    console.log('')

    // Test 4: Test cache purge capability (dry run)
    console.log('🗑️  Test 3: Testing cache purge capability...')
    const purgeResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tags: ['test-connection']
        })
      }
    )

    const purgeData = await purgeResponse.json()
    if (purgeResponse.ok) {
      console.log('✅ Cache purge API accessible')
      console.log(`   Purge ID: ${purgeData.result?.id || 'N/A'}`)
    } else {
      console.warn('⚠️  Cache purge failed:', purgeData.errors?.[0]?.message)
    }
    console.log('')

    // Test 5: Check current caching settings
    console.log('⚙️  Test 4: Checking cache settings...')
    const settingsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const settingsData = await settingsResponse.json()
    if (settingsResponse.ok && settingsData.result) {
      const settings = settingsData.result
      const cacheLevel = settings.find(s => s.id === 'cache_level')
      const browserCacheTtl = settings.find(s => s.id === 'browser_cache_ttl')
      
      console.log('✅ Cache settings retrieved:')
      if (cacheLevel) console.log(`   Cache Level: ${cacheLevel.value}`)
      if (browserCacheTtl) console.log(`   Browser Cache TTL: ${browserCacheTtl.value}`)
    }
    console.log('')

    console.log('🎉 Cloudflare connection test completed successfully!')
    console.log('📋 Next steps:')
    console.log('   1. Implement cache headers in your Next.js API routes')
    console.log('   2. Set up page rules for static assets')
    console.log('   3. Test cache invalidation with your scraper workflow')
    
    return true

  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    
    if (error.message.includes('fetch is not defined')) {
      console.log('💡 Note: This script requires Node.js 18+ or install node-fetch')
      console.log('   Try: npm install node-fetch@2')
    }
    
    return false
  }
}

// Run the test
testCloudflareConnection().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})