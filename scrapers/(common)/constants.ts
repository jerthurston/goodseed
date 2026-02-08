
export const USERAGENT = 'GoodSeed-Bot/1.0 (+https://goodseed.ca/contact) Commercial Cannabis Research';
export const ACCEPTLANGUAGE = 'en-US,en;q=0.9';

/**
 * Default crawl delay configuration for polite crawling
 * 
 * These values are used when robots.txt doesn't specify a Crawl-delay directive.
 * The actual delay per request is randomized between MIN and MAX for human-like behavior.
 * 
 * Configuration reasoning:
 * - 1-2.5s average provides 42% speed improvement vs previous 2-4s config
 * - Still polite for e-commerce sites (industry standard: 0.5-3s for commercial bots)
 * - Combined with concurrency=2 and maxRequestsPerMinute limits for safety
 * - Random delays prevent robotic patterns that trigger anti-bot measures
 * 
 * Note: Explicit robots.txt Crawl-delay directives always take precedence
 */
export const MIN_DELAY_DEFAULT = 1000; // 1 second minimum delay
export const MAX_DELAY_DEFAULT = 2000; // 2 seconds maximum delay
// Average delay: ~1.75s per request (42% faster than previous 3s average)