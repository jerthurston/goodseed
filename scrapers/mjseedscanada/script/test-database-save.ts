/**
 * Test Database Save for MJ Seeds Canada
 * 
 * This script tests if data is being saved correctly to database
 * with all required fields including images, pricing, and product details
 */

import { ProductCardDataFromCrawling } from '@/types/crawl.type';
import { SaveDbService } from '@/scrapers/(common)/save-db-service';
import { apiLogger } from '@/lib/helpers/api-logger';
import { prisma } from '@/lib/prisma';

// Test products data
const TEST_PRODUCTS: ProductCardDataFromCrawling[] = [
    {
        name: "Test Afghan Chocolope Feminized Fast Version Marijuana Seeds",
        url: "https://www.mjseedscanada.ca/product/afghan-chocolope-feminized-fast-version/",
        slug: "test-afghan-chocolope-feminized-fast-version",
        imageUrl: "https://www.mjseedscanada.ca/wp-content/uploads/2021/04/Afghan-Chocolope-Feminized-Fast-Version-Marijuana-Seeds.jpg",
        seedType: "feminized",
        cannabisType: "hybrid",
        badge: "Fast Version",
        rating: 4.5,
        reviewCount: 12,
        thcLevel: "THC: 18-22%",
        thcMin: 18,
        thcMax: 22,
        cbdLevel: "CBD: Low",
        cbdMin: 0.1,
        cbdMax: 1.0,
        floweringTime: "7-8 weeks",
        growingLevel: "Intermediate",
        pricings: [
            {
                packSize: 5,
                totalPrice: 65.00,
                pricePerSeed: 13.00
            },
            {
                packSize: 10,
                totalPrice: 120.00,
                pricePerSeed: 12.00
            },
            {
                packSize: 25,
                totalPrice: 280.00,
                pricePerSeed: 11.20
            }
        ]
    },
    {
        name: "Test Blue Dream Autoflowering Marijuana Seeds",
        url: "https://www.mjseedscanada.ca/product/blue-dream-autoflowering/",
        slug: "test-blue-dream-autoflowering",
        imageUrl: "https://www.mjseedscanada.ca/wp-content/uploads/2021/03/Blue-Dream-Auto-Seeds.jpg",
        seedType: "autoflower",
        cannabisType: "sativa",
        badge: "Popular Strain",
        rating: 4.8,
        reviewCount: 24,
        thcLevel: "THC: 15-20%",
        thcMin: 15,
        thcMax: 20,
        cbdLevel: "CBD: Medium",
        cbdMin: 2,
        cbdMax: 5,
        floweringTime: "8-9 weeks",
        growingLevel: "Beginner",
        pricings: [
            {
                packSize: 3,
                totalPrice: 45.00,
                pricePerSeed: 15.00
            },
            {
                packSize: 5,
                totalPrice: 70.00,
                pricePerSeed: 14.00
            }
        ]
    }
];

async function testDatabaseSave() {
    console.log('🧪 Testing MJ Seeds Canada Database Save...\n');

    const dbService = new SaveDbService(prisma);

    try {
        // Step 1: Get MJ Seeds Canada seller ID
        const seller = await prisma.seller.findFirst({
            where: {
                name: 'MJ Seeds Canada'
            }
        });

        if (!seller) {
            console.log('❌ MJ Seeds Canada seller not found in database');
            return;
        }

        console.log(`📝 Found seller: ${seller.name} (ID: ${seller.id})`);

        // Step 2: Initialize database service
        console.log('🔧 Initializing database service...');
        await dbService.initializeSeller(seller.id);

        // Step 3: Get or create category
        console.log('📂 Setting up category...');
        const categoryId = await dbService.getOrCreateCategory({
            name: 'Cannabis Seeds',
            slug: 'cannabis-seeds'
        });

        console.log(`📂 Category ID: ${categoryId}`);

        // Step 4: Save test products
        console.log(`\n💾 Saving ${TEST_PRODUCTS.length} test products...\n`);

        for (let i = 0; i < TEST_PRODUCTS.length; i++) {
            const product = TEST_PRODUCTS[i];
            console.log(`${i + 1}. Saving: ${product.name}`);
            console.log(`   URL: ${product.url}`);
            console.log(`   Image URL: ${product.imageUrl}`);
            console.log(`   Seed Type: ${product.seedType}`);
            console.log(`   Cannabis Type: ${product.cannabisType}`);
            console.log(`   THC: ${product.thcLevel} (${product.thcMin}-${product.thcMax}%)`);
            console.log(`   CBD: ${product.cbdLevel} (${product.cbdMin}-${product.cbdMax}%)`);
            console.log(`   Pricings: ${product.pricings.length} variants`);
            
            product.pricings.forEach((pricing, j) => {
                console.log(`     [${j + 1}] ${pricing.packSize} seeds: $${pricing.totalPrice} CAD ($${pricing.pricePerSeed}/seed)`);
            });
        }

        const result = await dbService.saveProductsToCategory(categoryId, TEST_PRODUCTS);

        console.log('\n📊 Save Results:');
        console.log(`   ✅ Saved: ${result.saved} products`);
        console.log(`   🔄 Updated: ${result.updated} products`);
        console.log(`   ❌ Errors: ${result.errors} products`);

        // Step 5: Verify data was saved correctly
        console.log('\n🔍 Verifying saved data...\n');

        for (const testProduct of TEST_PRODUCTS) {
            const savedProduct = await prisma.seedProduct.findFirst({
                where: {
                    name: testProduct.name,
                    sellerId: seller.id
                },
                include: {
                    productImages: {
                        include: {
                            image: true
                        }
                    },
                    pricings: true,
                    seller: true,
                    category: true
                }
            });

            if (savedProduct) {
                console.log(`✅ ${savedProduct.name}`);
                console.log(`   📝 Name: ${savedProduct.name === testProduct.name ? '✅' : '❌'} Match`);
                console.log(`   🔗 URL: ${savedProduct.url === testProduct.url ? '✅' : '❌'} Match`);
                console.log(`   🌱 Seed Type: ${savedProduct.seedType === testProduct.seedType?.toUpperCase() ? '✅' : '❌'} ${savedProduct.seedType}`);
                console.log(`   🌿 Cannabis Type: ${savedProduct.cannabisType === testProduct.cannabisType?.toUpperCase() ? '✅' : '❌'} ${savedProduct.cannabisType}`);
                console.log(`   🧪 THC: ${savedProduct.thcMin === testProduct.thcMin && savedProduct.thcMax === testProduct.thcMax ? '✅' : '❌'} ${savedProduct.thcMin}-${savedProduct.thcMax}%`);
                console.log(`   🧪 CBD: ${savedProduct.cbdMin === testProduct.cbdMin && savedProduct.cbdMax === testProduct.cbdMax ? '✅' : '❌'} ${savedProduct.cbdMin}-${savedProduct.cbdMax}%`);
                console.log(`   🖼️ Images: ${savedProduct.productImages.length} saved`);
                
                if (savedProduct.productImages.length > 0) {
                    savedProduct.productImages.forEach((img: any, j: number) => {
                        const isCorrectUrl = img.image.url === testProduct.imageUrl;
                        console.log(`     [${j + 1}] ${isCorrectUrl ? '✅' : '❌'} ${img.image.url}`);
                    });
                } else {
                    console.log(`     ❌ No images found (expected: ${testProduct.imageUrl})`);
                }

                console.log(`   💰 Pricings: ${savedProduct.pricings.length} saved`);
                savedProduct.pricings.forEach((pricing: any, j: number) => {
                    const expectedPricing = testProduct.pricings[j];
                    if (expectedPricing) {
                        const isCorrect = pricing.packSize === expectedPricing.packSize && 
                                         pricing.totalPrice === expectedPricing.totalPrice;
                        console.log(`     [${j + 1}] ${isCorrect ? '✅' : '❌'} ${pricing.packSize} seeds: $${pricing.totalPrice}`);
                    } else {
                        console.log(`     [${j + 1}] ➕ Extra: ${pricing.packSize} seeds: $${pricing.totalPrice}`);
                    }
                });

            } else {
                console.log(`❌ Product not found in database: ${testProduct.name}`);
            }
            console.log('');
        }

        // Step 6: Summary statistics
        console.log('📈 Database Statistics:');
        
        const totalProducts = await prisma.seedProduct.count({
            where: { sellerId: seller.id }
        });
        
        const totalImages = await prisma.seedProductImage.count({
            where: {
                seedProduct: {
                    sellerId: seller.id
                }
            }
        });
        
        const totalPricings = await prisma.pricing.count({
            where: {
                seedProduct: {
                    sellerId: seller.id
                }
            }
        });

        console.log(`   📦 Total products: ${totalProducts}`);
        console.log(`   🖼️ Total images: ${totalImages}`);
        console.log(`   💰 Total pricings: ${totalPricings}`);
        console.log(`   📊 Images per product: ${totalProducts > 0 ? (totalImages / totalProducts).toFixed(2) : '0'}`);
        console.log(`   📊 Pricings per product: ${totalProducts > 0 ? (totalPricings / totalProducts).toFixed(2) : '0'}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
        apiLogger.logError('[Test Database Save] Error:', { error });
    }
}

// Run the test
testDatabaseSave().catch(console.error);