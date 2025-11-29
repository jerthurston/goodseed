/**
 * Test Navigation Scraper - Extract all categories from Seed Supreme
 * 
 * Usage: pnpm tsx scrapers/seedsupreme/scripts/test-navigation.ts
 */

import { NavigationScraper } from '../navigation-scraper';

async function main() {
    console.log('='.repeat(60));
    console.log('🗺️  Seed Supreme Navigation Scraper Test');
    console.log('='.repeat(60));
    console.log('Target: https://seedsupreme.com/');
    console.log('');

    try {
        const scraper = new NavigationScraper();
        console.log('⏳ Extracting categories from navigation menu...\n');

        const categories = await scraper.extractCategories();

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Found ${categories.length} seed categories\n`);

        // Group by level
        const mainCategories = categories.filter(c => c.level === 0);
        const subCategories = categories.filter(c => c.level === 1);

        // Display main categories
        console.log('📂 Main Categories (Level 0):');
        console.log('-'.repeat(60));
        mainCategories.forEach((cat, index) => {
            console.log(`${index + 1}. ${cat.name}`);
            console.log(`   Slug: ${cat.slug}`);
            console.log(`   Type: ${cat.seedType || 'N/A'}`);
            console.log(`   URL: ${cat.url}`);
            console.log('');
        });

        // Display sub-categories
        if (subCategories.length > 0) {
            console.log('📁 Sub-Categories (Level 1):');
            console.log('-'.repeat(60));
            subCategories.forEach((cat, index) => {
                console.log(`${index + 1}. ${cat.name}`);
                console.log(`   Parent: ${cat.parent || 'N/A'}`);
                console.log(`   Slug: ${cat.slug}`);
                console.log(`   Type: ${cat.seedType || 'N/A'}`);
                console.log(`   URL: ${cat.url}`);
                console.log('');
            });
        }

        // Statistics
        console.log('='.repeat(60));
        console.log('📊 Statistics:');
        console.log('-'.repeat(60));
        console.log(`Total Categories: ${categories.length}`);
        console.log(`  - Main (Level 0): ${mainCategories.length}`);
        console.log(`  - Sub (Level 1): ${subCategories.length}`);

        // Group by seed type
        const byType = categories.reduce((acc, cat) => {
            const type = cat.seedType || 'OTHER';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('\nBy Seed Type:');
        Object.entries(byType)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
                console.log(`  - ${type}: ${count}`);
            });

        // Export to JSON for further use
        console.log('\n💾 Category List:');
        console.log('-'.repeat(60));
        console.log(JSON.stringify(categories, null, 2));

        console.log('\n' + '='.repeat(60));
        console.log('✅ Test Complete!');
        console.log('='.repeat(60));

        // Summary for next steps
        console.log('\n📝 Next Steps:');
        console.log('1. Review extracted categories');
        console.log('2. Run: pnpm tsx scripts/scrape-all-categories.ts');
        console.log('3. Or scrape specific category:');
        console.log('   pnpm tsx scripts/test/test-seedsupreme-category.ts <slug> 1');
        console.log('');

    } catch (error) {
        console.error('\n❌ Error during test:');
        console.error(error);
        process.exit(1);
    }
}

main();
