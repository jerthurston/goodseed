/**
 * Quick script to find real product URLs from Crop King Seeds
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function findProductUrls() {
  try {
    console.log('🔍 Fetching Crop King Seeds homepage...');
    const response = await axios.get('https://www.cropkingseeds.ca');
    const $ = cheerio.load(response.data);
    
    console.log('\n🌱 Looking for product links...');
    const productLinks: string[] = [];
    
    // Look for common product link patterns
    $('a[href*="/product"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !productLinks.includes(href)) {
        productLinks.push(href.startsWith('http') ? href : `https://www.cropkingseeds.ca${href}`);
      }
    });
    
    $('a[href*="/shop"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('product') && !productLinks.includes(href)) {
        productLinks.push(href.startsWith('http') ? href : `https://www.cropkingseeds.ca${href}`);
      }
    });
    
    console.log(`\n✅ Found ${productLinks.length} product URLs:`);
    productLinks.slice(0, 5).forEach((url, i) => {
      console.log(`${i + 1}. ${url}`);
    });
    
    if (productLinks.length === 0) {
      console.log('🤔 No direct product links found. Looking for shop/category pages...');
      
      $('a[href*="shop"], a[href*="seeds"], a[href*="cannabis"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
          console.log(`- ${href.startsWith('http') ? href : `https://www.cropkingseeds.ca${href}`}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching URLs:', error);
  }
}

findProductUrls();