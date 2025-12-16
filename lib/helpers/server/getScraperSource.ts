
// Map seller names to scraper source (same as ScraperFactory)
const SOURCE_MAPPING: Record<string, string> = {
  'Vancouver Seed Bank': 'vancouverseedbank',
  'SunWest Genetics': 'sunwestgenetics', 
  'Crop King Seeds': 'cropkingseeds'
};


export function getScraperSource(sellerName:string){
    const scraperSource = SOURCE_MAPPING[sellerName];

    if(!scraperSource) {
        throw new Error(`No scraper found for seller: ${sellerName}`);
    }

    return scraperSource;
}