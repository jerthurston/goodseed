import { RobotsTxtFile } from "crawlee";
import { apiLogger } from "../helpers/api-logger";

interface PoliteCrawlerOptions {
    userAgent: string;
    acceptLanguage?: string;
    minDelay?: number;
    maxDelay?: number;
}

interface RobotsCache {
    [origin: string]: { robotsTxt: RobotsTxtFile; timestamp: number; };
}

export class SimplePoliteCrawler {
    private robotsCache: RobotsCache = {};
    private readonly cacheExpiry = 24 * 60 * 60 * 1000; //24 hours
    private readonly userAgent: string;
    private readonly acceptLanguage: string;
    private readonly minDelay: number;
    private readonly maxDelay: number;

    constructor(options: PoliteCrawlerOptions) {
        this.userAgent = options.userAgent;
        this.acceptLanguage = options.acceptLanguage || 'en-US,en;q=0.9';
        this.minDelay = options.minDelay || 2000;
        this.maxDelay = options.maxDelay || 5000;
    }

    async getRobotsTxt(origin: string): Promise<RobotsTxtFile | null> {
        const now = Date.now();
        const cached = this.robotsCache[origin];

        if (cached && (now - cached.timestamp) < this.cacheExpiry) {
            return cached.robotsTxt;
        }

        try {
            const robotsTxtUrl = `${origin}/robots.txt`;
            const robotsTxt = await RobotsTxtFile.find(robotsTxtUrl);

            this.robotsCache[origin] = { robotsTxt, timestamp: now };

            return robotsTxt;
        } catch (error) {
            apiLogger.warn(`Failed to fetch robots.txt for ${origin}:`, { error });
            return null;
        }
    }

    async isAllowed(url: string): Promise<boolean> {
        try {
            const origin = new URL(url).origin;
            const robotsTxt = await this.getRobotsTxt(origin);

            if (!robotsTxt) {
                apiLogger.warn(`No robots.txt found for ${origin}`);
                return true;
            }

            const allowed = robotsTxt.isAllowed(this.userAgent, url);
            apiLogger.info(`Robots.txt check for ${url}: ${allowed ? 'ALLOWED' : 'BLOCKED'}`);
            return allowed;
        } catch (error) {
            apiLogger.warn(`Error checking robots.txt for ${url}:`, { error });
            return true; // Allow by default on error
        }
    }


    

    async getCrawlDelay(url: string): Promise<number> {
        try {
            const origin = new URL(url).origin;
            const robotsTxt = await this.getRobotsTxt(origin);
            
            if (!robotsTxt) {
                return this.getRandomDelay();
            }

            // Parse crawl-delay manually since Crawlee doesn't expose getCrawlDelay method
            const crawlDelay = this.parseCrawlDelay(robotsTxt, this.userAgent);
            if (crawlDelay && crawlDelay > 0) {
                const delayMs = crawlDelay * 1000;
                apiLogger.info(`Using robots.txt crawl-delay: ${delayMs}ms for ${origin}`);
                return delayMs;
            }

            return this.getRandomDelay();
        } catch (error) {
            apiLogger.warn('Error getting crawl delay:', { error });
            return this.getRandomDelay();
        }
    }

    private getRandomDelay(): number {
        const delay = Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
        apiLogger.info(`Using random delay: ${delay}ms`);
        return delay;
    }

    private parseCrawlDelay(robotsTxt: RobotsTxtFile, userAgent: string): number | null {
        try {
            // Access the raw content from robots.txt
            const content = (robotsTxt as any).content || '';
            const lines = content.split('\n');
            let inUserAgentSection = false;
            let crawlDelay: number | null = null;

            for (const line of lines) {
                const trimmedLine = line.trim().toLowerCase();
                
                if (trimmedLine.startsWith('user-agent:')) {
                    const ua = trimmedLine.split(':')[1]?.trim();
                    inUserAgentSection = ua === '*' || ua === userAgent.toLowerCase();
                }
                
                if (inUserAgentSection && trimmedLine.startsWith('crawl-delay:')) {
                    const delay = parseFloat(trimmedLine.split(':')[1]?.trim() || '0');
                    if (!isNaN(delay)) {
                        crawlDelay = delay;
                    }
                }
            }

            return crawlDelay;
        } catch (error) {
            apiLogger.warn('Error parsing crawl-delay from robots.txt:', { error });
            return null;
        }
    }

    getHeaders(): Record<string, string> {
        return {
            'User-Agent': this.userAgent,
            'Accept-Language': this.acceptLanguage,
        };
    }

    async handleHttpStatus(statusCode: number, url: string): Promise<number> {
        const baseDelay = this.getRandomDelay();
        
        switch (statusCode) {
            case 429: // Too Many Requests
                const backoffDelay = baseDelay * 3;
                apiLogger.warn(`HTTP 429 (Too Many Requests) for ${url}, backing off for ${backoffDelay}ms`);
                return backoffDelay;
                
            case 503: // Service Unavailable
                const serviceDelay = baseDelay * 2;
                apiLogger.warn(`HTTP 503 (Service Unavailable) for ${url}, waiting ${serviceDelay}ms`);
                return serviceDelay;
                
            case 502: // Bad Gateway
            case 504: // Gateway Timeout
                const gatewayDelay = baseDelay * 1.5;
                apiLogger.warn(`HTTP ${statusCode} (Gateway Error) for ${url}, waiting ${gatewayDelay}ms`);
                return gatewayDelay;
                
            default:
                // For other status codes, use normal delay
                return baseDelay;
        }
    }

    shouldRetryOnStatus(statusCode: number): boolean {
        // Retry on server errors and rate limiting
        return [429, 502, 503, 504].includes(statusCode);
    }
}