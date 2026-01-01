/**
 * Mary Jane's Garden Scraper Test Script
 * 
 * Test the scraper with URL generation, pagination detection, and product extraction
 */

import { getScrapingUrl, extractPageNumber, extractBaseUrl, isValidMaryJanesGardenUrl } from '../utils/getScrapingUrl';
import { extractFromHTML } from '../utils/extractProductsFromHTML';

async function testUrlGeneration() {
    console.log('\n🔗 Testing Mary Jane\'s Garden URL Generation:');
    
    const baseUrl = 'https://maryjanesgarden.com/shop';
    
    // Test page 1 (should return base URL)
    const page1Url = getScrapingUrl(baseUrl, 1);
    console.log(`Page 1: ${page1Url}`);
    
    // Test page 2 (should add pagenum parameter)
    const page2Url = getScrapingUrl(baseUrl, 2);
    console.log(`Page 2: ${page2Url}`);
    
    // Test page 10
    const page10Url = getScrapingUrl(baseUrl, 10);
    console.log(`Page 10: ${page10Url}`);
    
    // Test URL with existing query parameters
    const categoryUrl = 'https://maryjanesgarden.com/shop?category=feminized';
    const categoryPage2 = getScrapingUrl(categoryUrl, 2);
    console.log(`Category Page 2: ${categoryPage2}`);
    
    console.log('\n📍 Testing URL utilities:');
    console.log(`Extract base URL: ${extractBaseUrl(page10Url)}`);
    console.log(`Extract page number: ${extractPageNumber(page10Url)}`);
    console.log(`Is valid MJ URL: ${isValidMaryJanesGardenUrl(page2Url)}`);
}

async function testPaginationDetection() {
    console.log('\n📄 Testing Pagination Detection:');
    
    // Sample Jet Smart Filters pagination HTML
    const paginationHtml = `
    <div class="jet-filters-pagination">
        <div class="jet-filters-pagination__item jet-filters-pagination__current" data-value="1">
            <div class="jet-filters-pagination__link">1</div>
        </div>
        <div class="jet-filters-pagination__item" data-value="2">
            <div class="jet-filters-pagination__link">2</div>
        </div>
        <div class="jet-filters-pagination__item" data-value="3">
            <div class="jet-filters-pagination__link">3</div>
        </div>
        <div class="jet-filters-pagination__item">
            <div class="jet-filters-pagination__dots">…</div>
        </div>
        <div class="jet-filters-pagination__item" data-value="76">
            <div class="jet-filters-pagination__link">76</div>
        </div>
        <div class="jet-filters-pagination__item prev-next next" data-value="next">
            <div class="jet-filters-pagination__link">Next</div>
        </div>
    </div>`;
    
    const { pagination } = extractFromHTML(`<html><body>${paginationHtml}</body></html>`);
    
    console.log('Pagination extracted:', {
        currentPage: pagination.currentPage,
        maxPage: pagination.maxPage,
        hasNextPage: pagination.hasNextPage
    });
}

async function testProductExtraction() {
    console.log('\n🌱 Testing Product Extraction:');
    
    // Sample product HTML (từ file đã copy)
    const productHtml = `
    <li class="product type-product post-29716 status-publish first instock">
        <div class="prod-wrapper">
            <div class="products-content">
                <div class="prod-img">
                    <div class="itype">
                        <ul class="elementor-icon-list-items">
                            <li class="elementor-icon-list-item">
                                <span class="elementor-icon-list-text">Indica</span>
                            </li>
                        </ul>
                    </div>
                    <figure class="main_img">
                        <a href="https://maryjanesgarden.com/10th-planet-strain-feminized-marijuana-seeds/">
                            <img src="https://maryjanesgarden.com/wp-content/uploads/2024/10/10th-planet-1-230x307.jpg"
                                 alt="10th Planet Strain Feminized">
                        </a>
                    </figure>
                </div>
                <article>
                    <h3 class="prod_titles">
                        <a href="https://maryjanesgarden.com/10th-planet-strain-feminized-marijuana-seeds/">
                            10th Planet Strain Feminized Marijuana Seeds
                        </a>
                    </h3>
                    <div class="prod-meta">
                        <div class="custom-acf-prod">
                            <ul class="elementor-icon-list-items">
                                <li class="elementor-icon-list-item">
                                    <span class="elementor-icon-list-text"><span>THC : </span>17%</span>
                                </li>
                                <li class="elementor-icon-list-item">
                                    <span class="elementor-icon-list-text"><span>CBD : </span>1%</span>
                                </li>
                                <li class="elementor-icon-list-item">
                                    <span class="elementor-icon-list-text"><span>Flowering :</span> 8-9 weeks</span>
                                </li>
                            </ul>
                        </div>
                        <div class="pack_listed_prod packsizes">
                            <div class="pack_listed_prod_rght">
                                <div class="variation_val">
                                    <input type="radio" class="product_variation_radio"
                                           data-variation-id="29717" item-price="65" value="5-seeds">
                                </div>
                                <div class="variation_val">
                                    <input type="radio" class="product_variation_radio"
                                           data-variation-id="29718" item-price="120" value="10-seeds">
                                </div>
                                <div class="variation_val">
                                    <input type="radio" class="product_variation_radio"
                                           data-variation-id="29719" item-price="240" value="25-seeds">
                                </div>
                            </div>
                        </div>
                        <div class="product_price_dfn">
                            <span class="woocommerce-Price-amount amount">$65.00</span> – 
                            <span class="woocommerce-Price-amount amount">$240.00</span>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    </li>`;
    
    const { products } = extractFromHTML(`<html><body>${productHtml}</body></html>`);
    
    if (products.length > 0) {
        const product = products[0];
        console.log('Product extracted:', {
            name: product.name,
            url: product.url,
            image: product.image,
            variations: product.variations,
            metadata: product.metadata
        });
    } else {
        console.log('❌ No products extracted');
    }
}

async function runTests() {
    console.log('🚀 Mary Jane\'s Garden Scraper Test Suite');
    console.log('==========================================');
    
    await testUrlGeneration();
    await testPaginationDetection();
    await testProductExtraction();
    
    console.log('\n✅ Test suite completed!');
}

// Run if called directly
if (require.main === module) {
    runTests().catch(console.error);
}

export { runTests };