#!/usr/bin/env node

/**
 * Script kiểm tra sort displayPrice từ API /api/seed
 * 
 * LƯU Ý: Script này test việc sort theo `displayPrice` từ model SeedProduct
 * displayPrice là giá per seed của pack size nhỏ nhất (được tính sẵn trong DB)
 * 
 * Usage: node scripts/test-price-sort.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testPriceSort() {
  console.log('🔍 Testing Price Sort API...\n');
  
  try {
    // Test 1: Sort Low to High - Sample from multiple pages
    console.log('📊 Test 1: Sort Price Low to High (priceLowToHigh)');
    console.log('Testing samples from pages 1, 100, 200, 300, 400, 500');
    console.log('='.repeat(60));
    
    const pagesToTest = [1, 100, 200, 300, 400, 500];
    const samplesPerPage = 5;
    const allSamples = [];
    
    for (const page of pagesToTest) {
      const response = await fetch(`${API_URL}/api/seed?sortBy=priceLowToHigh&page=${page}&limit=${samplesPerPage}`);
      const data = await response.json();
      
      if (data.seeds && data.seeds.length > 0) {
        const samples = data.seeds.map(seed => ({
          page,
          name: seed.name,
          displayPrice: seed.displayPrice,
          minPricing: seed.pricings[0]?.pricePerSeed
        }));
        allSamples.push(...samples);
        
        console.log(`\n📄 Page ${page} (Total: ${data.pagination.total}):`);
        samples.forEach((seed, idx) => {
          console.log(`   ${idx + 1}. ${seed.name}`);
          console.log(`      displayPrice: $${seed.displayPrice?.toFixed(2) || 'N/A'}`);
        });
      } else {
        console.log(`\n📄 Page ${page}: No data (end of results)`);
        break;
      }
    }
    
    // Validate sorting across all pages
    console.log('\n' + '='.repeat(60));
    console.log('� Validating sort order across all pages...\n');
    
    let isSortedAsc = true;
    const sortErrors = [];
    
    for (let i = 1; i < allSamples.length; i++) {
      const current = allSamples[i];
      const previous = allSamples[i - 1];
      
      if (current.displayPrice < previous.displayPrice) {
        isSortedAsc = false;
        sortErrors.push({
          index: i,
          previous: { page: previous.page, name: previous.name, price: previous.displayPrice },
          current: { page: current.page, name: current.name, price: current.displayPrice }
        });
      }
    }
    
    if (isSortedAsc) {
      console.log('✅ Low to High sort is CORRECT across all tested pages!');
      console.log(`   Tested ${allSamples.length} samples from ${pagesToTest.length} different pages`);
      
      // Show price progression
      const prices = allSamples.map(s => s.displayPrice).filter(p => p !== null);
      console.log(`\n� Price Progression:`);
      console.log(`   Page 1 (lowest): $${allSamples[0]?.displayPrice?.toFixed(2)}`);
      console.log(`   Page ${pagesToTest[Math.floor(pagesToTest.length/2)]}: $${allSamples[Math.floor(allSamples.length/2)]?.displayPrice?.toFixed(2)}`);
      console.log(`   Page ${pagesToTest[pagesToTest.length-1]}: $${allSamples[allSamples.length-1]?.displayPrice?.toFixed(2)}`);
    } else {
      console.log('❌ Low to High sort has ERRORS!');
      console.log(`\nFound ${sortErrors.length} sorting errors:\n`);
      sortErrors.slice(0, 5).forEach(err => {
        console.log(`   Error at position ${err.index}:`);
        console.log(`   Previous (Page ${err.previous.page}): ${err.previous.name} - $${err.previous.price}`);
        console.log(`   Current (Page ${err.current.page}): ${err.current.name} - $${err.current.price}`);
        console.log(`   ❌ ${err.current.price} < ${err.previous.price} (should be >=)\n`);
      });
    }
    
    // Test 2: Sort High to Low - Sample from multiple pages
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test 2: Sort Price High to Low (priceHighToLow)');
    console.log('Testing samples from pages 1, 100, 200, 300, 400, 500');
    console.log('='.repeat(60));
    
    const highToLowSamples = [];
    
    for (const page of pagesToTest) {
      const response = await fetch(`${API_URL}/api/seed?sortBy=priceHighToLow&page=${page}&limit=${samplesPerPage}`);
      const data = await response.json();
      
      if (data.seeds && data.seeds.length > 0) {
        const samples = data.seeds.map(seed => ({
          page,
          name: seed.name,
          displayPrice: seed.displayPrice,
          minPricing: seed.pricings[0]?.pricePerSeed
        }));
        highToLowSamples.push(...samples);
        
        console.log(`\n📄 Page ${page} (Total: ${data.pagination.total}):`);
        samples.forEach((seed, idx) => {
          console.log(`   ${idx + 1}. ${seed.name}`);
          console.log(`      displayPrice: $${seed.displayPrice?.toFixed(2) || 'N/A'}`);
        });
      } else {
        console.log(`\n� Page ${page}: No data (end of results)`);
        break;
      }
    }
    
    // Validate sorting
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Validating sort order across all pages...\n');
    
    let isSortedDesc = true;
    const descSortErrors = [];
    
    for (let i = 1; i < highToLowSamples.length; i++) {
      const current = highToLowSamples[i];
      const previous = highToLowSamples[i - 1];
      
      if (current.displayPrice > previous.displayPrice) {
        isSortedDesc = false;
        descSortErrors.push({
          index: i,
          previous: { page: previous.page, name: previous.name, price: previous.displayPrice },
          current: { page: current.page, name: current.name, price: current.displayPrice }
        });
      }
    }
    
    if (isSortedDesc) {
      console.log('✅ High to Low sort is CORRECT across all tested pages!');
      console.log(`   Tested ${highToLowSamples.length} samples from ${pagesToTest.length} different pages`);
      
      // Show price progression
      console.log(`\n📊 Price Progression:`);
      console.log(`   Page 1 (highest): $${highToLowSamples[0]?.displayPrice?.toFixed(2)}`);
      console.log(`   Page ${pagesToTest[Math.floor(pagesToTest.length/2)]}: $${highToLowSamples[Math.floor(highToLowSamples.length/2)]?.displayPrice?.toFixed(2)}`);
      console.log(`   Page ${pagesToTest[pagesToTest.length-1]}: $${highToLowSamples[highToLowSamples.length-1]?.displayPrice?.toFixed(2)}`);
    } else {
      console.log('❌ High to Low sort has ERRORS!');
      console.log(`\nFound ${descSortErrors.length} sorting errors:\n`);
      descSortErrors.slice(0, 5).forEach(err => {
        console.log(`   Error at position ${err.index}:`);
        console.log(`   Previous (Page ${err.previous.page}): ${err.previous.name} - $${err.previous.price}`);
        console.log(`   Current (Page ${err.current.page}): ${err.current.name} - $${err.current.price}`);
        console.log(`   ❌ ${err.current.price} > ${err.previous.price} (should be <=)\n`);
      });
    }
    
    // Test 3: Price Range Filter
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test 3: Price Range Filter (minPrice=5, maxPrice=10)');
    console.log('='.repeat(60));
    
    const filterResponse = await fetch(`${API_URL}/api/seed?minPrice=5&maxPrice=10&limit=20`);
    const filterData = await filterResponse.json();
    
    console.log(`Total seeds in range: ${filterData.pagination.total}`);
    console.log(`Returned: ${filterData.seeds.length}\n`);
    
    const filteredPrices = filterData.seeds.map(seed => ({
      name: seed.name,
      displayPrice: seed.displayPrice,
      minPricing: seed.pricings[0]?.pricePerSeed
    }));
    
    console.log('Seeds in price range $5-$10:');
    filteredPrices.slice(0, 10).forEach((seed, index) => {
      const inRange = seed.minPricing >= 5 && seed.minPricing <= 10;
      const status = inRange ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${seed.name}`);
      console.log(`   displayPrice: $${seed.displayPrice?.toFixed(2) || 'N/A'}`);
      console.log(`   minPricing: $${seed.minPricing?.toFixed(2) || 'N/A'}\n`);
    });
    
    // Validate filter
    let isFilterCorrect = true;
    filteredPrices.forEach(seed => {
      if (seed.minPricing < 5 || seed.minPricing > 10) {
        isFilterCorrect = false;
        console.log(`❌ Filter Error: ${seed.name} ($${seed.minPricing}) is outside range $5-$10`);
      }
    });
    
    if (isFilterCorrect) {
      console.log('✅ Price range filter is correct!\n');
    } else {
      console.log('❌ Price range filter has errors!\n');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Low to High Sort: ${isSortedAsc ? 'PASS' : 'FAIL'}`);
    console.log(`✅ High to Low Sort: ${isSortedDesc ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Price Range Filter: ${isFilterCorrect ? 'PASS' : 'FAIL'}`);
    
    if (isSortedAsc && isSortedDesc && isFilterCorrect) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.error('Make sure the server is running at', API_URL);
    process.exit(1);
  }
}

// Run tests
testPriceSort();
