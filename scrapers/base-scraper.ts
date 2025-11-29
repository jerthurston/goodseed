import { delay, log } from '@/lib/utils';

export interface ScraperConfig {
    name: string;
    baseUrl: string;
    delayMs?: number; // Delay between requests
    maxRetries?: number;
}

export abstract class BaseScraper {
    protected config: Required<ScraperConfig>;

    constructor(config: ScraperConfig) {
        this.config = {
            ...config,
            delayMs: config.delayMs || 3000, // Default 3s
            maxRetries: config.maxRetries || 3,
        };
    }

    /**
     * Main scrape method - to be implemented by child classes
     */
    abstract scrape(): Promise<any[]>;

    /**
     * Fetch with retry logic
     */
    protected async fetchWithRetry(
        url: string,
        retries: number = this.config.maxRetries
    ): Promise<Response> {
        try {
            log(`[${this.config.name}] Fetching: ${url}`);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            await delay(this.config.delayMs);
            return response;
        } catch (error) {
            if (retries > 0) {
                log(`[${this.config.name}] Retry ${this.config.maxRetries - retries + 1}...`);
                await delay(this.config.delayMs * 2);
                return this.fetchWithRetry(url, retries - 1);
            }
            throw error;
        }
    }

    /**
     * Log scraper errors
     */
    protected logError(error: any, context?: string): void {
        console.error(`[${this.config.name}] ERROR ${context ? `(${context})` : ''}:`, error.message);
    }

    /**
     * Run scraper with error handling
     */
    async run(): Promise<any[]> {
        try {
            log(`[${this.config.name}] Starting scraper...`);
            const results = await this.scrape();
            log(`[${this.config.name}] Completed. Found ${results.length} items.`);
            return results;
        } catch (error) {
            this.logError(error, 'run');
            return [];
        }
    }
}
