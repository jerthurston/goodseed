/**
 * Demo Script: Enhanced Scraper Factory Usage
 * 
 * Demonstrates how to use the enhanced factory with both legacy and hybrid extraction modes
 */

import { PrismaClient } from '@prisma/client';
import ScraperFactory, { ScraperSource, ExtractionMode } from '@/lib/factories/scraper-factory';
import { validateProduct } from '@/lib/services/validation/cannabis-validator';

const prisma = new PrismaClient();
const factory = new ScraperFactory(prisma);

/**
 * Demo: Legacy vs Hybrid extraction comparison
 */
async function demonstrateExtractionModes(): Promise<void> {
  console.log('🏭 Enhanced Scraper Factory Demo');
  console.log('=' .repeat(50));

  const sources: ScraperSource[] = ['vancouverseedbank', 'sunwestgenetics'];
  
  for (const source of sources) {
    console.log(`\n🏢 Testing source: ${source}`);
    console.log('-'.repeat(30));
    
    // Check hybrid support
    const supportsHybrid = ScraperFactory.supportsHybridExtraction(source);
    console.log(`Hybrid Support: ${supportsHybrid ? '✅' : '❌'}`);
    
    if (supportsHybrid) {
      try {
        // Create hybrid scraper
        console.log('\n🔄 Creating hybrid scraper...');
        const hybridScraper = await factory.createHybridScraper(source, {
          enableCrossValidation: true,
          minQualityScore: 75
        });
        
        console.log('✅ Hybrid scraper created successfully');
        console.log(`   Type: ${hybridScraper.constructor.name}`);
        
        // Create legacy scraper for comparison
        console.log('\n📋 Creating legacy scraper...');
        const legacyScraper = factory.createProductListScraper(source);
        console.log('✅ Legacy scraper created successfully');
        console.log(`   Type: ${legacyScraper.constructor.name}`);
        
      } catch (error) {
        console.error(`❌ Error creating scrapers: ${error}`);
      }
    }
    
    // Show configuration
    const sellerName = factory.getSellerName(source);
    console.log(`\nSeller Name: ${sellerName}`);
  }
}

/**
 * Demo: Factory utility methods
 */
async function demonstrateFactoryUtilities(): Promise<void> {
  console.log('\n🛠️ Factory Utilities Demo');
  console.log('=' .repeat(40));
  
  console.log(`Supported Sources: ${ScraperFactory.getSupportedSources().join(', ')}`);
  console.log(`Extraction Modes: ${ScraperFactory.getSupportedExtractionModes().join(', ')}`);
  
  // Validate source
  const testSources = ['vancouverseedbank', 'invalid-source', 'sunwestgenetics'];
  console.log('\n🔍 Source Validation:');
  testSources.forEach(source => {
    const isValid = ScraperFactory.isValidSource(source);
    console.log(`   ${source}: ${isValid ? '✅' : '❌'}`);
  });
}

/**
 * Demo: Create scraper with different modes
 */
async function demonstrateScraperCreation(): Promise<void> {
  console.log('\n🏗️ Scraper Creation Demo');
  console.log('=' .repeat(40));
  
  const source: ScraperSource = 'vancouverseedbank';
  
  try {
    console.log(`\n📦 Creating scrapers for: ${source}`);
    
    // Legacy mode
    console.log('\n1. Legacy Mode:');
    const legacyScraper = await factory.createScraper(source, 'legacy');
    console.log(`   ✅ Created: ${legacyScraper.constructor.name}`);
    
    // Hybrid mode (default)
    console.log('\n2. Hybrid Mode (default):');
    const hybridScraper = await factory.createScraper(source);
    console.log(`   ✅ Created: ${hybridScraper.constructor.name}`);
    
    // Hybrid mode with custom config
    console.log('\n3. Hybrid Mode (custom config):');
    const customHybridScraper = await factory.createHybridScraper(source, {
      enableCrossValidation: false,
      minQualityScore: 60
    });
    console.log(`   ✅ Created: ${customHybridScraper.constructor.name}`);
    
  } catch (error) {
    console.error(`❌ Error in scraper creation: ${error}`);
  }
}

/**
 * Demo: Database service integration
 */
async function demonstrateDatabaseIntegration(): Promise<void> {
  console.log('\n💾 Database Service Demo');
  console.log('=' .repeat(40));
  
  const source: ScraperSource = 'vancouverseedbank';
  
  try {
    // Create database service
    const dbService = factory.createSaveDbService(source);
    console.log(`✅ Database service created for: ${source}`);
    
    // Initialize seller (this would actually create/update database records)
    console.log('\n📊 Database operations (simulation):');
    console.log('   • Initialize seller: Ready');
    console.log('   • Create categories: Ready');  
    console.log('   • Save products: Ready');
    console.log('   • Log activities: Ready');
    
    console.log('\n💡 Note: Actual database operations skipped in demo');
    
  } catch (error) {
    console.error(`❌ Error in database service: ${error}`);
  }
}

/**
 * Main demo function
 */
async function runDemo(): Promise<void> {
  try {
    await demonstrateExtractionModes();
    await demonstrateFactoryUtilities();
    await demonstrateScraperCreation();
    await demonstrateDatabaseIntegration();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Enhanced Scraper Factory Demo Complete!');
    console.log('='.repeat(50));
    
    console.log('\n📋 Summary:');
    console.log('   • Factory supports both legacy and hybrid extraction');
    console.log('   • Hybrid mode uses JSON-LD + manual selector fallback');
    console.log('   • Cross-validation and quality scoring available');
    console.log('   • Seamless integration with existing database services');
    
    console.log('\n🔗 Integration Examples:');
    console.log('   // Legacy extraction');
    console.log('   const scraper = await factory.createScraper("vancouverseedbank", "legacy");');
    console.log('   ');
    console.log('   // Hybrid extraction (default)');  
    console.log('   const scraper = await factory.createScraper("vancouverseedbank");');
    console.log('   ');
    console.log('   // Custom hybrid config');
    console.log('   const scraper = await factory.createHybridScraper("vancouverseedbank", {');
    console.log('     enableCrossValidation: true,');
    console.log('     minQualityScore: 85');
    console.log('   });');
    
  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute demo if script is run directly  
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };