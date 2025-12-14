/**
 * Check Crop King Seeds listing URLs for pagination patterns
 */

async function checkListingURLs() {
  const listingURLs = [
    'https://www.cropkingseeds.ca/shop/',
    'https://www.cropkingseeds.ca/marijuana-seeds/',
    'https://www.cropkingseeds.ca/feminized-seeds-canada/',
    'https://www.cropkingseeds.ca/autoflower-seeds-canada/',
    'https://www.cropkingseeds.ca/cbd-seeds-canada/'
  ];

  console.log('🔍 Checking Crop King Seeds listing URLs for pagination...\n');

  for (const url of listingURLs) {
    try {
      console.log(`📄 Checking: ${url}`);
      
      const response = await fetch(url);
      const html = await response.text();
      
      // Check for pagination patterns
      const paginationPatterns = [
        /page.*?(\d+)/gi,
        /pagination/gi,
        /next.*page/gi,
        /load.*more/gi,
        /show.*more/gi,
        /page-numbers/gi,
        /wp-pagenavi/gi,
        /nav-links/gi
      ];
      
      let foundPagination = false;
      let maxPage = 0;
      
      for (const pattern of paginationPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          foundPagination = true;
          console.log(`   ✅ Found pagination pattern: ${pattern.source}`);
          console.log(`   📊 Matches: ${matches.slice(0, 5).join(', ')}${matches.length > 5 ? '...' : ''}`);
          
          // Extract page numbers
          const pageNumbers = html.match(/page.*?(\d+)/gi);
          if (pageNumbers) {
            pageNumbers.forEach(match => {
              const num = parseInt(match.match(/\d+/)?.[0] || '0');
              if (num > maxPage) maxPage = num;
            });
          }
        }
      }
      
      if (!foundPagination) {
        console.log('   ❌ No pagination patterns found');
      } else {
        console.log(`   📈 Maximum page number detected: ${maxPage}`);
      }
      
      // Count product links
      const productLinks = html.match(/href="[^"]*marijuana-seeds[^"]*"/gi) || [];
      console.log(`   🌱 Product links found: ${productLinks.length}`);
      
      console.log('');
      
    } catch (error) {
      console.error(`   ❌ Error checking ${url}:`, error);
      console.log('');
    }
  }
}

checkListingURLs().catch(console.error);