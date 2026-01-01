import * as cheerio from 'cheerio';
import { MAXPAGE_PAGINATION } from '../core/selector';

// Simple test with HTML snippet
function testPaginationWithMockHTML() {
    console.log('🧪 Testing pagination detection with mock HTML...');
    
    // Mock HTML structure based on what we found
    const mockHTML = `
        <div class="pagination">
            <span class="page-numbers current">1</span>
            <a class="page-numbers" href="/feminized-cannabis/page/2/">2</a>
            <a class="page-numbers" href="/feminized-cannabis/page/3/">3</a>
            <a class="page-numbers" href="/feminized-cannabis/page/4/">4</a>
            <span class="page-numbers dots">…</span>
            <a class="page-numbers" href="/feminized-cannabis/page/46/">46</a>
            <a class="page-numbers" href="/feminized-cannabis/page/47/">47</a>
            <a class="page-numbers" href="/feminized-cannabis/page/48/">48</a>
            <a class="page-numbers next" href="/feminized-cannabis/page/2/">→</a>
        </div>
    `;
    
    const $ = cheerio.load(mockHTML);
    
    // Test pagination container
    const $paginationContainer = $(MAXPAGE_PAGINATION.paginationContainer);
    console.log(`Pagination container "${MAXPAGE_PAGINATION.paginationContainer}": Found ${$paginationContainer.length} elements`);
    
    // Test pagination items
    const $paginationItems = $(MAXPAGE_PAGINATION.paginationItems);
    console.log(`Pagination items "${MAXPAGE_PAGINATION.paginationItems}": Found ${$paginationItems.length} elements`);
    
    let maxPageFound = 0;
    
    $paginationItems.each((_, element) => {
        const $item = $(element);
        const pageText = $item.text().trim();
        
        console.log(`  Page item text: "${pageText}"`);
        
        // Extract page number from text content
        if (/^\d+$/.test(pageText)) {
            const pageNumber = parseInt(pageText);
            if (pageNumber > maxPageFound) {
                maxPageFound = pageNumber;
            }
            console.log(`    -> Valid page number: ${pageNumber}`);
        }
    });
    
    console.log(`\\n✅ Max page detected: ${maxPageFound}`);
    
    if (maxPageFound === 48) {
        console.log('🎉 SUCCESS: Pagination detection working correctly!');
    } else {
        console.log('❌ FAILED: Expected max page 48, got', maxPageFound);
    }
}

testPaginationWithMockHTML();