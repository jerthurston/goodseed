/**
 * Phase 4.3: Validate Output Quality for Crop King Seeds
 * Following add-new-scraper-guide(JSON-LD).md - Phase 4.3
 * 
 * Full scraper test with comprehensive validation
 */

const TEST_PRODUCT_URLS = [
  'https://www.cropkingseeds.ca/feminized-seeds-canada/white-widow-marijuana-seeds/',
  'https://www.cropkingseeds.ca/feminized-seeds-canada/gelato-marijuana-seeds/',
  'https://www.cropkingseeds.ca/autoflower-seeds-canada/amnesia-haze-marijuana-seeds/',
  'https://www.cropkingseeds.ca/cbd-seeds-canada/cb-diesel-marijuana-seeds/',
  'https://www.cropkingseeds.ca/autoflower-seeds-canada/northern-lights-marijuana-seeds/'
];

function validatePrice(priceStr) {
  if (!priceStr) return { valid: false, reason: 'No price found' };
  
  // Handle price ranges like "$65.00 - $240.00"
  const rangeMatch = priceStr.match(/\$(\d+\.?\d*)\s*-\s*\$(\d+\.?\d*)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (low > 0 && high >= low) {
      return { valid: true, format: 'range', lowPrice: low, highPrice: high };
    }
  }
  
  // Handle single price like "$89.99"
  const singleMatch = priceStr.match(/\$(\d+\.?\d*)/);
  if (singleMatch) {
    const price = parseFloat(singleMatch[1]);
    if (price > 0) {
      return { valid: true, format: 'single', price: price };
    }
  }
  
  return { valid: false, reason: 'Invalid price format' };
}

function validateCannabisData(product) {
  const validation = {
    thc: null,
    cbd: null,
    strainType: null,
    isCannabisRelated: false,
    score: 0
  };
  
  if (product.description) {
    const desc = product.description.toLowerCase();
    
    // Check for cannabis keywords
    const cannabisKeywords = ['cannabis', 'marijuana', 'strain', 'seeds', 'feminized', 'autoflower'];
    validation.isCannabisRelated = cannabisKeywords.some(keyword => desc.includes(keyword));
    if (validation.isCannabisRelated) validation.score += 30;
    
    // Extract THC content
    const thcMatch = desc.match(/thc:?\s*(\d+(?:\.\d+)?)%?/i);
    if (thcMatch) {
      validation.thc = parseFloat(thcMatch[1]);
      validation.score += 25;
    }
    
    // Extract CBD content  
    const cbdMatch = desc.match(/cbd:?\s*(\d+(?:\.\d+)?)%?/i);
    if (cbdMatch) {
      validation.cbd = parseFloat(cbdMatch[1]);
      validation.score += 25;
    }
    
    // Detect strain type
    if (desc.includes('indica')) {
      validation.strainType = 'indica';
      validation.score += 20;
    } else if (desc.includes('sativa')) {
      validation.strainType = 'sativa';
      validation.score += 20;
    } else if (desc.includes('hybrid')) {
      validation.strainType = 'hybrid';
      validation.score += 20;
    }
  }
  
  return validation;
}

function validateImages(images) {
  const validation = {
    count: images.length,
    hasHighQuality: false,
    score: 0
  };
  
  if (validation.count >= 4) {
    validation.score = 100;
  } else if (validation.count >= 2) {
    validation.score = 75;
  } else if (validation.count >= 1) {
    validation.score = 50;
  }
  
  // Check for high quality indicators in URLs
  validation.hasHighQuality = images.some(img => 
    img.includes('1024x') || 
    img.includes('large') || 
    img.includes('_full') ||
    img.includes('high-res')
  );
  
  return validation;
}

async function validateProduct(url) {
  console.log(`🔍 Validating: ${url}`);
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract product data using hybrid approach
    let product = {
      name: null,
      price: null,
      description: null,
      images: []
    };
    
    let jsonLdQuality = 0;
    
    // JSON-LD extraction
    const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis;
    const matches = [...html.matchAll(jsonLdRegex)];
    
    matches.forEach((match) => {
      try {
        const jsonData = JSON.parse(match[1]);
        
        if (jsonData['@type'] === 'Product') {
          jsonLdQuality = 95; // High quality JSON-LD found
          
          product.name = jsonData.name;
          product.description = jsonData.description;
          
          // Handle AggregateOffer pricing
          if (jsonData.offers) {
            const offer = Array.isArray(jsonData.offers) ? jsonData.offers[0] : jsonData.offers;
            
            if (offer['@type'] === 'AggregateOffer') {
              if (offer.lowPrice && offer.highPrice && offer.lowPrice !== offer.highPrice) {
                product.price = `$${offer.lowPrice} - $${offer.highPrice}`;
              } else {
                product.price = `$${offer.lowPrice || offer.highPrice}`;
              }
            } else {
              product.price = offer.price;
            }
          }
          
          // Extract images
          if (jsonData.image) {
            if (Array.isArray(jsonData.image)) {
              product.images = jsonData.image;
            } else if (typeof jsonData.image === 'string') {
              product.images = [jsonData.image];
            }
          }
        }
        
      } catch (error) {
        // Continue with next script
      }
    });
    
    // Validation checks
    const priceValidation = validatePrice(product.price);
    const cannabisValidation = validateCannabisData(product);  
    const imageValidation = validateImages(product.images);
    
    // Calculate overall quality score
    let overallScore = 0;
    if (product.name) overallScore += 20;
    if (priceValidation.valid) overallScore += 20;
    if (product.description) overallScore += 15;
    if (jsonLdQuality > 0) overallScore += 20;
    overallScore += Math.round(cannabisValidation.score * 0.15); // 15% weight for cannabis data
    overallScore += Math.round(imageValidation.score * 0.1); // 10% weight for images
    
    // Display results
    const productName = product.name ? product.name.substring(0, 40) : 'Unknown';
    console.log(`   📦 Product: "${productName}"`);
    console.log(`   ${jsonLdQuality >= 90 ? '✅' : '🟡'} JSON-LD: ${jsonLdQuality >= 90 ? 'Complete' : 'Partial'} (${jsonLdQuality}% quality)`);
    
    if (cannabisValidation.score >= 70) {
      const cannabisInfo = [];
      if (cannabisValidation.thc) cannabisInfo.push(`THC ${cannabisValidation.thc}%`);
      if (cannabisValidation.cbd) cannabisInfo.push(`CBD ${cannabisValidation.cbd}%`);  
      if (cannabisValidation.strainType) cannabisInfo.push(`${cannabisValidation.strainType}`);
      console.log(`   ✅ Cannabis data: ${cannabisInfo.join(', ') || 'Cannabis-related'}`);
    } else {
      console.log(`   🟡 Cannabis data: Limited information available`);
    }
    
    console.log(`   ${imageValidation.count >= 4 ? '✅' : imageValidation.count >= 1 ? '🟡' : '❌'} Images: ${imageValidation.count} found`);
    console.log(`   ${priceValidation.valid ? '✅' : '❌'} Price: ${product.price || 'N/A'} ${priceValidation.valid ? '(valid format)' : '(invalid)'}`);
    console.log(`   🎯 Overall Quality: ${overallScore}%`);
    
    return {
      url,
      product,
      validations: {
        price: priceValidation,
        cannabis: cannabisValidation,
        images: imageValidation,
        jsonLd: jsonLdQuality
      },
      overallScore,
      passed: overallScore >= 85
    };
    
  } catch (error) {
    console.error(`   ❌ Error validating ${url}:`, error.message);
    return {
      url,
      product: null,
      validations: null,
      overallScore: 0,
      passed: false
    };
  }
}

async function main() {
  console.log('🧪 Phase 4.3: Validate Output Quality for Crop King Seeds');
  console.log('='.repeat(65));
  console.log('Following: docs/implementation/add-new-scraper-guide(JSON-LD).md - Phase 4.3\n');
  
  const results = [];
  let testCount = 0;
  
  for (const url of TEST_PRODUCT_URLS) {
    testCount++;
    console.log(`\n📦 Validation ${testCount}/${TEST_PRODUCT_URLS.length}`);
    console.log('-'.repeat(50));
    
    const result = await validateProduct(url);
    results.push(result);
    
    console.log('');
  }
  
  // Summary Report
  console.log('📊 PHASE 4.3 VALIDATION REPORT');
  console.log('='.repeat(40));
  
  const totalProducts = results.length;
  const passedValidation = results.filter(r => r.passed).length;
  const avgQuality = results.reduce((sum, r) => sum + r.overallScore, 0) / totalProducts;
  
  // Quality requirements check
  const jsonLdCoverage = results.filter(r => r.validations?.jsonLd >= 80).length / totalProducts * 100;
  const priceAccuracy = results.filter(r => r.validations?.price.valid).length / totalProducts * 100;
  const cannabisData = results.filter(r => r.validations?.cannabis.score >= 70).length / totalProducts * 100;
  const imageQuality = results.filter(r => r.validations?.images.count >= 3).length / totalProducts * 100;
  
  console.log(`✅ Products passed validation: ${passedValidation}/${totalProducts} (${Math.round(passedValidation/totalProducts*100)}%)`);
  console.log(`🎯 Average quality score: ${Math.round(avgQuality)}%`);
  console.log(`📋 JSON-LD coverage: ${Math.round(jsonLdCoverage)}%`);
  console.log(`💰 Price accuracy: ${Math.round(priceAccuracy)}%`);
  console.log(`🌿 Cannabis data coverage: ${Math.round(cannabisData)}%`);
  console.log(`🖼️ Image quality (3+ images): ${Math.round(imageQuality)}%`);
  
  // Phase 4.3 Requirements Check
  console.log('\n📋 PHASE 4.3 QUALITY REQUIREMENTS');
  console.log('='.repeat(40));
  
  console.log(`${jsonLdCoverage >= 80 ? '✅' : '❌'} JSON-LD Coverage: ${Math.round(jsonLdCoverage)}% (requirement: >80%)`);
  console.log(`${priceAccuracy >= 100 ? '✅' : '❌'} Price Accuracy: ${Math.round(priceAccuracy)}% (requirement: 100%)`);
  console.log(`${cannabisData >= 90 ? '✅' : '❌'} Cannabis Data: ${Math.round(cannabisData)}% (requirement: >90%)`);
  console.log(`${imageQuality >= 75 ? '✅' : '❌'} Image Quality: ${Math.round(imageQuality)}% (requirement: >75%)`);
  console.log(`${avgQuality >= 85 ? '✅' : '❌'} Quality Average: ${Math.round(avgQuality)}% (requirement: >85%)`);
  
  const allRequirementsMet = 
    jsonLdCoverage >= 80 && 
    priceAccuracy >= 100 && 
    cannabisData >= 90 && 
    imageQuality >= 75 && 
    avgQuality >= 85;
  
  if (allRequirementsMet) {
    console.log('\n🎉 Phase 4.3 PASSED! Ready for Phase 5 - Integration');
    console.log('\nNext step: Run Phase 5 - Integration & Registration');
    console.log('Command: npm run factory:list');
  } else {
    console.log('\n⚠️ Phase 4.3 needs improvement before proceeding to Phase 5');
    
    if (jsonLdCoverage < 80) console.log('   → Need to improve JSON-LD coverage');
    if (priceAccuracy < 100) console.log('   → Need to fix price extraction accuracy');
    if (cannabisData < 90) console.log('   → Need to enhance cannabis data extraction');
    if (imageQuality < 75) console.log('   → Need to improve image extraction');
    if (avgQuality < 85) console.log('   → Need to improve overall quality');
  }
  
  // Sample validation output (as requested in guide)
  console.log('\n🔍 SAMPLE VALIDATION OUTPUT');
  console.log('='.repeat(35));
  const sampleResult = results.find(r => r.passed);
  if (sampleResult && sampleResult.product) {
    console.log(`Product: "${sampleResult.product.name}"`);
    console.log(`✅ JSON-LD: Complete (${sampleResult.validations.jsonLd}% quality)`);
    
    const cannabis = sampleResult.validations.cannabis;
    const cannabisInfo = [];
    if (cannabis.thc) cannabisInfo.push(`THC ${cannabis.thc}%`);
    if (cannabis.cbd) cannabisInfo.push(`CBD ${cannabis.cbd}%`);
    if (cannabis.strainType) cannabisInfo.push(`${cannabis.strainType}`);
    
    console.log(`✅ Cannabis data: ${cannabisInfo.join(', ') || 'Cannabis-related product'}`);
    console.log(`✅ Images: ${sampleResult.validations.images.count} images found`);
    console.log(`✅ Price: ${sampleResult.product.price} (valid format)`);
  }
}

main().catch(console.error);