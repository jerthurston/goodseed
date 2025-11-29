Given what you provide. I would like to clarify that GoodSeed is a cannabis seed search site (ecommerce aggregator for affiliate marketing). The site collects data from other sellers, consolidates prices and details, and displays them in one place. Users click to go to the seller’s website. 

I assume we need a scaper of top 3 cannabis sites such as:
- Leafly.com
- SeedSupreme.com
- fireandflower.com

Each site will be managed by a separate scaper file (e.g. leafly.scaper.ts , SeedSupreme.scaper.ts) for optimization and maintenance purposes.

The scrapers will collect data such as:
* Product Name & URL
  * Image URL
  * Total Price and Pack Size
  * Stock status
  * Type: Autoflower/Photoperiod, Feminized/Regular, Sativa/Indica/Mix
  * THC % and CBD %

* Normalize data:
  * Price per seed = total price / pack size
  * Convert ranges like 20-25% into min/max numbers
  * Standardize names (e.g., "Auto-flowering" -> "Autoflower")

