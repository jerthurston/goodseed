/**
 * Seed Crop King Seeds với Scraper Configuration đơn giản
 * 
 * Chỉ cần lưu sample HTML và JSON-LD, hệ thống sẽ tự compute selectors
 */

import { prisma } from '../../lib/prisma';
import 'dotenv/config';

async function seedCropKingSimpleConfig() {
    console.log('🌱 Seeding Crop King Seeds với Simple Configuration...');
    
    try {
        // Sample HTML của 1 product card (admin sẽ copy/paste từ DevTools)
        const sampleProductHtml = `
<div class="product type-product status-publish has-post-thumbnail product_cat-autoflower-seeds product_cat-feminized-seeds first instock shipping-taxable purchasable product-type-simple">
    <a href="https://www.cropkingseeds.ca/autoflower-seeds-canada/durban-cookies-strain-autoflower-seeds/">
        <img width="230" height="389" 
             src="https://www.cropkingseeds.ca/wp-content/uploads/2025/01/durban-cookies-auto-1-230x389.jpg" 
             class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail wp-post-image" 
             alt="Durban Cookies Strain Autoflower Seeds" 
             loading="lazy">
    </a>
    <h2 class="woocommerce-loop-product__title">
        <a href="https://www.cropkingseeds.ca/autoflower-seeds-canada/durban-cookies-strain-autoflower-seeds/">
            Durban Cookies Strain Autoflower Seeds
        </a>
    </h2>
    <span class="price">
        <span class="woocommerce-Price-amount amount">
            <bdi><span class="woocommerce-Price-currencySymbol">$</span>49.99</bdi>
        </span>
    </span>
</div>`;

        // Sample JSON-LD (nếu có - trong trường hợp này Crop King Seeds không có)
        const sampleJsonLd = null;

        // Computed selectors (hệ thống sẽ tự tính từ HTML sample)
        const computedSelectors = {
            // Được generate tự động từ sampleProductHtml
            productContainer: ['.product', '.type-product'],
            productName: {
                primary: 'img[alt]', // Lấy từ alt attribute
                fallback: ['.woocommerce-loop-product__title a', 'h2 a']
            },
            productUrl: 'a[href]',
            productPrice: ['.price .amount', '.woocommerce-Price-amount'],
            productImage: 'img[src]',
            
            // Patterns được detect từ HTML structure
            patterns: {
                productUrlPattern: '*-seeds/',
                pricePattern: /\$[\d,]+\.?\d*/,
                nameCleanupRules: ['remove trailing "Seeds"', 'extract strain name']
            },
            
            // Auto-detected classification rules
            classificationRules: {
                cannabisType: {
                    autoflower: ['autoflower', 'auto'],
                    feminized: ['feminized'],
                    hybrid: ['hybrid'],
                    sativa: ['sativa'],
                    indica: ['indica']
                },
                seedType: {
                    autoflower: ['autoflower', 'auto'],
                    feminized: ['feminized', 'fem'],
                    regular: ['regular']
                }
            }
        };

        // Update Crop King Seeds seller với configuration
        const seller = await prisma.seller.upsert({
            where: { name: 'Crop King Seeds' },
            update: {
                // Raw data từ admin
                productCardHtml: sampleProductHtml,
                jsonLd: sampleJsonLd,
                paginationPattern: '?jsf=epro-products&pagenum={page}',
                maxPages: 10,
                
                // Computed selectors (auto-generated)
                computedSelectors,
                
                lastScraped: new Date(),
                status: 'success',
                updatedAt: new Date(),
            },
            create: {
                name: 'Crop King Seeds',
                url: 'https://www.cropkingseeds.ca',
                scrapingSourceUrl: 'https://www.cropkingseeds.ca/marijuana-seeds/',
                isActive: true,
                
                // Raw configuration
                productCardHtml: sampleProductHtml,
                jsonLd: sampleJsonLd,
                paginationPattern: '?jsf=epro-products&pagenum={page}',
                maxPages: 10,
                
                // Auto-computed
                computedSelectors,
                
                lastScraped: new Date(),
                status: 'success',
            },
        });

        console.log('✅ Crop King Seeds updated with simple scraper config');
        console.log(`📊 Seller ID: ${seller.id}`);
        console.log(`🔧 Selectors computed: ${Object.keys(computedSelectors).length} categories`);
        console.log(`📄 HTML sample length: ${sampleProductHtml.length} characters`);
        
        // Hiển thị computed selectors
        console.log('\n📋 Computed Selectors:');
        console.log('- Product Container:', computedSelectors.productContainer.join(', '));
        console.log('- Product Name:', computedSelectors.productName.primary);
        console.log('- Product Price:', computedSelectors.productPrice.join(', '));
        console.log('- Classification Rules:', Object.keys(computedSelectors.classificationRules).length, 'types');
        
        console.log('\n🎉 Simple Configuration completed!');
        
    } catch (error) {
        console.error('❌ Error seeding simple config:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeder
seedCropKingSimpleConfig();