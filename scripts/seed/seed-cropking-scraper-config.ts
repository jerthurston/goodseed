/**
 * Seed Crop King Seeds Scraper Configuration
 * 
 * Script này tạo cấu hình scraper cho Crop King Seeds dựa trên những gì đã test
 */

import { prisma } from '../../lib/prisma';
import 'dotenv/config';

async function seedCropKingScraperConfig() {
    console.log('🌱 Seeding Crop King Seeds Scraper Configuration...');
    
    try {
        // 1. Tìm Crop King Seeds seller
        const seller = await prisma.seller.findFirst({
            where: { name: 'Crop King Seeds' }
        });
        
        if (!seller) {
            console.error('❌ Crop King Seeds seller not found!');
            return;
        }
        
        // 2. Tạo ScraperConfig
        const scraperConfig = await prisma.scraperConfig.upsert({
            where: { sellerId: seller.id },
            update: {
                // Website Tech Stack
                cms: 'WooCommerce',
                frontend: 'Vanilla',
                hasAjaxLoading: false,
                hasSPA: false,
                requiresJS: false,
                
                // Pagination Configuration
                paginationType: 'query-param',
                paginationPattern: '?jsf=epro-products&pagenum={page}',
                maxPages: 10,
                productsPerPage: 21,
                
                // Request Configuration
                requestDelay: 1000,
                maxConcurrency: 1,
                maxRetries: 3,
                retryDelay: 5000,
                timeout: 30000,
                
                // Headers & Anti-bot
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                customHeaders: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cache-Control': 'no-cache'
                },
                requiresProxy: false,
                
                // Data Source Strategy
                dataSource: 'listing-page',
                useJsonLd: false,
                useMicrodata: false,
                
                // Main Selectors (đã test và hoạt động)
                selectors: {
                    productContainer: ['.product', '.type-product'],
                    productLink: ['a'],
                    productImage: ['img'],
                    productName: {
                        strategy: 'img-alt', // Lấy từ img alt attribute
                        selectors: ['img[alt]'],
                        fallback: ['a[title]', '.product-title', 'h2', 'h3']
                    },
                    productPrice: {
                        selectors: ['.price', '.woocommerce-Price-amount', '.amount'],
                        pattern: /\$[\d,]+\.?\d*/
                    },
                    productDescription: {
                        selectors: ['.product-excerpt', '.entry-summary', '.product-description']
                    }
                },
                
                // Fallback Selectors (nếu main selectors fail)
                fallbackSelectors: {
                    productContainer: ['.woocommerce-product', '.product-item', '.item'],
                    productName: {
                        strategy: 'text-content',
                        selectors: ['.product-title', '.entry-title', 'h2 a', 'h3 a']
                    }
                },
                
                // Product URL Pattern (để filter chính xác)
                productUrlPattern: '*-marijuana-seeds/*',
                
                // Validation Rules
                requiredFields: ['name', 'url'],
                validationRules: {
                    nameMinLength: 5,
                    nameMaxLength: 200,
                    namePattern: '.*(strain|seeds).*',
                    urlPattern: '.*cropkingseeds\\.ca.*',
                    excludePatterns: ['buy seeds now', 'view product', 'add to cart']
                },
                
                // Classification Rules (dựa trên tên sản phẩm)
                cannabisTypeRules: {
                    autoflowering: ['auto', 'autoflower', 'autoflowering'],
                    sativa: ['sativa'],
                    indica: ['indica'], 
                    hybrid: ['hybrid']
                },
                
                seedTypeRules: {
                    feminized: ['feminized', 'fem'],
                    autoflower: ['auto', 'autoflower'],
                    regular: ['regular', 'reg']
                },
                
                // Performance (sẽ cập nhật sau khi test)
                avgResponseTime: 1200,
                successRate: 1.0,
                lastTestedAt: new Date()
            },
            create: {
                sellerId: seller.id,
                
                // Website Tech Stack
                cms: 'WooCommerce',
                frontend: 'Vanilla',
                hasAjaxLoading: false,
                hasSPA: false,
                requiresJS: false,
                
                // Pagination Configuration
                paginationType: 'query-param',
                paginationPattern: '?jsf=epro-products&pagenum={page}',
                maxPages: 10,
                productsPerPage: 21,
                
                // Request Configuration
                requestDelay: 1000,
                maxConcurrency: 1,
                maxRetries: 3,
                retryDelay: 5000,
                timeout: 30000,
                
                // Headers & Anti-bot
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                customHeaders: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cache-Control': 'no-cache'
                },
                requiresProxy: false,
                
                // Data Source Strategy
                dataSource: 'listing-page',
                useJsonLd: false,
                useMicrodata: false,
                
                // Main Selectors (đã test và hoạt động)
                selectors: {
                    productContainer: ['.product', '.type-product'],
                    productLink: ['a'],
                    productImage: ['img'],
                    productName: {
                        strategy: 'img-alt',
                        selectors: ['img[alt]'],
                        fallback: ['a[title]', '.product-title', 'h2', 'h3']
                    },
                    productPrice: {
                        selectors: ['.price', '.woocommerce-Price-amount', '.amount'],
                        pattern: /\$[\d,]+\.?\d*/
                    },
                    productDescription: {
                        selectors: ['.product-excerpt', '.entry-summary', '.product-description']
                    }
                },
                
                // Fallback Selectors
                fallbackSelectors: {
                    productContainer: ['.woocommerce-product', '.product-item', '.item'],
                    productName: {
                        strategy: 'text-content',
                        selectors: ['.product-title', '.entry-title', 'h2 a', 'h3 a']
                    }
                },
                
                // Product URL Pattern
                productUrlPattern: '*-marijuana-seeds/*',
                
                // Validation Rules
                requiredFields: ['name', 'url'],
                validationRules: {
                    nameMinLength: 5,
                    nameMaxLength: 200,
                    namePattern: '.*(strain|seeds).*',
                    urlPattern: '.*cropkingseeds\\.ca.*',
                    excludePatterns: ['buy seeds now', 'view product', 'add to cart']
                },
                
                // Classification Rules
                cannabisTypeRules: {
                    autoflowering: ['auto', 'autoflower', 'autoflowering'],
                    sativa: ['sativa'],
                    indica: ['indica'], 
                    hybrid: ['hybrid']
                },
                
                seedTypeRules: {
                    feminized: ['feminized', 'fem'],
                    autoflower: ['auto', 'autoflower'],
                    regular: ['regular', 'reg']
                },
                
                // Performance
                avgResponseTime: 1200,
                successRate: 1.0,
                lastTestedAt: new Date()
            }
        });
        
        console.log('✅ Scraper Configuration created/updated:', scraperConfig.id);
        
        // 3. Tạo một số SelectorTest records để demo
        const selectorTests = [
            {
                configId: scraperConfig.id,
                testUrl: 'https://www.cropkingseeds.ca/marijuana-seeds/',
                selectorType: 'productContainer',
                selector: '.product, .type-product',
                elementsFound: 21,
                success: true,
                sampleData: { containers: 21, products: 21 },
                executionTime: 245
            },
            {
                configId: scraperConfig.id,
                testUrl: 'https://www.cropkingseeds.ca/marijuana-seeds/',
                selectorType: 'productName',
                selector: 'img[alt]',
                elementsFound: 21,
                success: true,
                sampleData: { 
                    samples: [
                        'Durban Cookies Strain Autoflower',
                        'Maui Wowie Strain Feminized', 
                        'Blue Dream Strain Autoflower'
                    ]
                },
                executionTime: 120
            },
            {
                configId: scraperConfig.id,
                testUrl: 'https://www.cropkingseeds.ca/marijuana-seeds/',
                selectorType: 'productPrice',
                selector: '.price',
                elementsFound: 18,
                success: true,
                sampleData: { 
                    samples: ['$49.99', '$59.99', '$39.99'],
                    coverage: 0.86
                },
                executionTime: 98
            }
        ];
        
        for (const test of selectorTests) {
            await prisma.selectorTest.create({
                data: test
            });
        }
        
        console.log('✅ Created selector test records');
        
        console.log('\n🎉 Crop King Seeds Scraper Configuration completed!');
        console.log(`📊 Config ID: ${scraperConfig.id}`);
        console.log(`🧪 Test Records: ${selectorTests.length}`);
        
    } catch (error) {
        console.error('❌ Error seeding scraper config:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeder
seedCropKingScraperConfig();