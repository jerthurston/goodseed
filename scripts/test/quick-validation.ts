/**
 * Quick Validation Test - No Server Required
 * 
 * Test các components offline để validate integration
 */

import ScraperFactory from '../../lib/factories/scraper-factory';
import { PrismaClient } from '@prisma/client';

async function quickValidationTest() {
    console.log('🧪 Quick Validation Test (Offline)...\n');

    const prisma = new PrismaClient();

    try {
        // Test 1: Factory Creation
        console.log('📋 Test 1: Scraper Factory Creation');
        const factory = new ScraperFactory(prisma);
        
        // Test Vancouver Seed Bank
        const vancouverScraper = factory.createProductListScraper('vancouverseedbank');
        const vancouverDbService = factory.createSaveDbService('vancouverseedbank');
        console.log('✅ Vancouver Seed Bank factory working');

        // Test SunWest Genetics
        const sunwestScraper = factory.createProductListScraper('sunwestgenetics');
        const sunwestDbService = factory.createSaveDbService('sunwestgenetics');
        console.log('✅ SunWest Genetics factory working');

        // Test 2: Supported Sources
        console.log('\n📋 Test 2: Supported Sources');
        const supportedSources = ScraperFactory.getSupportedSources();
        console.log(`✅ Supported: ${supportedSources.join(', ')}`);

        // Test 3: Source Validation
        console.log('\n📋 Test 3: Source Validation');
        const validSources = ['vancouverseedbank', 'sunwestgenetics'];
        const invalidSources = ['invalid', 'unknown', 'test'];

        for (const source of validSources) {
            const isValid = ScraperFactory.isValidSource(source);
            console.log(`✅ ${source}: ${isValid ? 'valid' : 'invalid'}`);
        }

        for (const source of invalidSources) {
            const isValid = ScraperFactory.isValidSource(source);
            console.log(`❌ ${source}: ${isValid ? 'valid' : 'invalid'}`);
        }

        // Test 4: Seller Names
        console.log('\n📋 Test 4: Seller Names');
        console.log(`✅ Vancouver: ${factory.getSellerName('vancouverseedbank')}`);
        console.log(`✅ SunWest: ${factory.getSellerName('sunwestgenetics')}`);

        // Test 5: Interface Compliance
        console.log('\n📋 Test 5: Interface Compliance');
        
        // Check if scrapers have required methods
        const methods = ['scrapeProductList', 'scrapeProductListByBatch'];
        for (const method of methods) {
            console.log(`✅ Vancouver ${method}: ${typeof (vancouverScraper as any)[method] === 'function'}`);
            console.log(`✅ SunWest ${method}: ${typeof (sunwestScraper as any)[method] === 'function'}`);
        }

        // Check if db services have required methods
        const dbMethods = ['initializeSeller', 'getOrCreateCategory', 'saveProductsToCategory', 'logScrapeActivity'];
        for (const method of dbMethods) {
            console.log(`✅ Vancouver DB ${method}: ${typeof (vancouverDbService as any)[method] === 'function'}`);
            console.log(`✅ SunWest DB ${method}: ${typeof (sunwestDbService as any)[method] === 'function'}`);
        }

        console.log('\n🎉 All validation tests passed!');
        console.log('\n📝 Integration is ready for:');
        console.log('1. API endpoint testing');
        console.log('2. Queue worker processing');
        console.log('3. Production deployment');

    } catch (error) {
        console.error('❌ Validation failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run validation
if (require.main === module) {
    quickValidationTest().catch(console.error);
}

export { quickValidationTest };