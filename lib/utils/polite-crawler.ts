/**
 * SimplePoliteCrawler - Công cụ Crawl Web Có Đạo Đức
 * 
 * Class này implement các thực hành crawling lịch sự bao gồm:
 * - Tuân thủ robots.txt với custom parsing
 * - Delay động giữa các requests
 * - Xử lý HTTP status codes
 * - Định danh User-Agent phù hợp
 * 
 * Tính năng chính:
 * - Custom robots.txt parser (parser built-in của Crawlee có lỗi)
 * - Cache robots.txt files để giảm requests
 * - Hỗ trợ Allow/Disallow rules với thứ tự ưu tiên đúng
 * - Wildcard pattern matching cho robots.txt rules phức tạp
 * - Tự động backoff khi bị rate limiting và server errors
 */

import { RobotsTxtFile } from "crawlee";
import { apiLogger } from "../helpers/api-logger";
import { MAX_DELAY_DEFAULT, MIN_DELAY_DEFAULT } from "@/scrapers/(common)/constants";

/**
 * Các tùy chọn cấu hình cho SimplePoliteCrawler
 */
interface PoliteCrawlerOptions {
    userAgent: string;         // User-Agent string để định danh crawler
    acceptLanguage?: string;   // Accept-Language header cho các site quốc tế
    minDelay?: number;         // Delay tối thiểu giữa các requests (ms)
    maxDelay?: number;         // Delay tối đa giữa các requests (ms)
}

/**
 * Cấu trúc cache để lưu trữ robots.txt files với timestamps
 * Ngăn chặn việc fetch lặp lại robots.txt cho cùng một domain
 */
interface RobotsCache {
    [origin: string]: { robotsTxt: RobotsTxtFile; timestamp: number; };
}

/**
 * Rules của site origin từ robots.txt
 */
export interface RobotsRules {
    crawlDelay: number;
        disallowedPaths: string[];
        allowedPaths: string[];
        userAgent: string;
} 

export class SimplePoliteCrawler {
    // Cache để lưu robots.txt theo domain, tránh fetch lặp lại
    private robotsCache: RobotsCache = {};
    // Thời gian cache robots.txt (24 giờ)
    private readonly cacheExpiry = 24 * 60 * 60 * 1000;
    // User-Agent string để định danh crawler
    private readonly userAgent: string;
    // Accept-Language header cho requests
    private readonly acceptLanguage: string;
    // Delay tối thiểu và tối đa giữa các requests (ms)
    private readonly minDelay: number;
    private readonly maxDelay: number;

    /**
     * Constructor - Khởi tạo SimplePoliteCrawler với các tùy chọn
     */
    constructor(options: PoliteCrawlerOptions) {
        this.userAgent = options.userAgent;
        this.acceptLanguage = options.acceptLanguage || 'en-US,en;q=0.9';
        this.minDelay = options.minDelay || MIN_DELAY_DEFAULT;
        this.maxDelay = options.maxDelay || MAX_DELAY_DEFAULT;
    }

    /**
     * Lấy robots.txt file từ origin, có cache để tối ưu performance
     * @param origin - Domain gốc (vd: https://example.com)
     * @returns RobotsTxtFile object hoặc null nếu không tìm thấy
     */
    async getRobotsTxt(origin: string): Promise<RobotsTxtFile | null> {
        const now = Date.now();
        const cached = this.robotsCache[origin];

        // Kiểm tra cache trước khi fetch mới
        if (cached && (now - cached.timestamp) < this.cacheExpiry) {
            return cached.robotsTxt;
        }

        try {
            const robotsTxtUrl = `${origin}/robots.txt`;
            const robotsTxt = await RobotsTxtFile.find(robotsTxtUrl);

            // Lưu vào cache với timestamp
            this.robotsCache[origin] = { robotsTxt, timestamp: now };

            return robotsTxt;
        } catch (error) {
            apiLogger.warn(`Không thể fetch robots.txt cho ${origin}:`, { error });
            return null;
        }
    }

    /**
     * Parse robots.txt và trả về crawling rules object
     * @param baseUrl - Base URL của site (e.g., https://www.canukseeds.com)
     * @returns Robots rules object với crawlDelay, disallowedPaths, allowedPaths
     */
    async parseRobots(baseUrl: string): Promise<RobotsRules> {
        try {
            const origin = new URL(baseUrl).origin;
            
            // Fetch robots.txt content trực tiếp
            const robotsResponse = await fetch(`${origin}/robots.txt`);
            if (!robotsResponse.ok) {
                apiLogger.warn(`Không tìm thấy robots.txt cho ${origin}, sử dụng default settings`);
                return {
                    crawlDelay: this.getRandomDelay(),
                    disallowedPaths: [],
                    allowedPaths: ['*'],
                    userAgent: this.userAgent
                };
            }
            
            const robotsContent = await robotsResponse.text();
            const lines = robotsContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
            
            // Parse robots.txt rules
            let currentUserAgent = '';
            let applicableUserAgent = false;
            const disallowedPaths: string[] = [];
            const allowedPaths: string[] = [];
            let crawlDelaySeconds = 0;
            
            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                
                // Xử lý User-agent directive
                if (lowerLine.startsWith('user-agent:')) {
                    const ua = line.substring(11).trim();
                    currentUserAgent = ua;
                    // Kiểm tra xem user-agent section này có áp dụng cho chúng ta không
                    applicableUserAgent = ua === '*' || 
                        this.userAgent.toLowerCase().includes(ua.toLowerCase()) ||
                        ua.toLowerCase().includes(this.userAgent.split('/')[0].toLowerCase());
                    continue;
                }
                
                // Chỉ parse rules nếu thuộc user-agent section áp dụng cho chúng ta
                if (applicableUserAgent) {
                    if (lowerLine.startsWith('disallow:')) {
                        const pattern = line.substring(9).trim();
                        if (pattern) {
                            disallowedPaths.push(pattern);
                        }
                    } else if (lowerLine.startsWith('allow:')) {
                        const pattern = line.substring(6).trim();
                        if (pattern) {
                            allowedPaths.push(pattern);
                        }
                    } else if (lowerLine.startsWith('crawl-delay:')) {
                        const delay = parseFloat(line.substring(12).trim());
                        if (!isNaN(delay)) {
                            crawlDelaySeconds = delay;
                        }
                    }
                }
            }
            
            const crawlDelayMs = crawlDelaySeconds > 0 ? crawlDelaySeconds * 1000 : this.getRandomDelay();
            
            apiLogger.info(`📋 Robots.txt parsed cho ${origin}:`);
            apiLogger.info(`   ⏱️ Crawl delay: ${crawlDelayMs}ms`);
            apiLogger.info(`   ❌ Disallowed paths: ${disallowedPaths.length}`);
            apiLogger.info(`   ✅ Allowed paths: ${allowedPaths.length}`);
            
            return {
                crawlDelay: crawlDelayMs,
                disallowedPaths,
                allowedPaths,
                userAgent: this.userAgent
            };
            
        } catch (error) {
            apiLogger.warn(`Lỗi khi parse robots.txt cho ${baseUrl}:`, { error });
            return {
                crawlDelay: this.getRandomDelay(),
                disallowedPaths: [],
                allowedPaths: ['*'],
                userAgent: this.userAgent
            };
        }
    }

    /**
     * Apply delay theo robots.txt crawl-delay hoặc custom delay
     * @param delayMs - Delay time in milliseconds
     */
    async delay(delayMs?: number): Promise<void> {
        const actualDelay = delayMs || this.getRandomDelay();
        apiLogger.debug(`⏱️ Applying crawl delay: ${actualDelay}ms`);
        
        return new Promise(resolve => {
            setTimeout(resolve, actualDelay);
        });
    }

    /**
     * Kiểm tra xem URL có được phép crawl theo robots.txt không
     * Sử dụng custom parser thay vì Crawlee's buggy implementation
     * @param url - URL cần kiểm tra
     * @returns true nếu được phép, false nếu bị cấm
     */
    async isAllowed(url: string): Promise<boolean> {
        try {
            const origin = new URL(url).origin;
            
            // Sử dụng custom parser thay vì Crawlee's buggy implementation
            const isAllowedByRobots = await this.checkRobotsPermission(url);
            
            apiLogger.info(`Kiểm tra robots.txt cho ${url}: ${isAllowedByRobots ? 'ĐƯỢC PHÉP' : 'BỊ CHẶN'}`);
            return isAllowedByRobots;
        } catch (error) {
            apiLogger.warn(`Lỗi khi kiểm tra robots.txt cho ${url}:`, { error });
            return true; // Mặc định cho phép khi có lỗi
        }
    }

    /**
     * Custom robots.txt parser để xử lý Allow/Disallow rules một cách chính xác
     * Crawlee's RobotsTxtFile.isAllowed() có bugs và không respect disallow rules
     * @param url - URL cần kiểm tra permission
     * @returns true nếu được phép crawl, false nếu bị cấm
     */
    private async checkRobotsPermission(url: string): Promise<boolean> {
        try {
            const origin = new URL(url).origin;
            const urlPath = new URL(url).pathname;
            const fullUrl = url;
            
            // Fetch robots.txt content trực tiếp
            const robotsResponse = await fetch(`${origin}/robots.txt`);
            if (!robotsResponse.ok) {
                apiLogger.warn(`Không tìm thấy robots.txt cho ${origin}, mặc định cho phép`);
                return true;
            }
            
            const robotsContent = await robotsResponse.text();
            // Parse content, loại bỏ comments và empty lines
            const lines = robotsContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
            
            // Parse robots.txt rules
            let currentUserAgent = '';
            let applicableUserAgent = false;
            const rules: { type: 'allow' | 'disallow'; pattern: string }[] = [];
            
            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                
                // Xử lý User-agent directive
                if (lowerLine.startsWith('user-agent:')) {
                    const ua = line.substring(11).trim();
                    currentUserAgent = ua;
                    // Kiểm tra xem user-agent section này có áp dụng cho chúng ta không
                    applicableUserAgent = ua === '*' || 
                        this.userAgent.toLowerCase().includes(ua.toLowerCase()) ||
                        ua.toLowerCase().includes(this.userAgent.split('/')[0].toLowerCase());
                    continue;
                }
                
                // Chỉ parse rules nếu thuộc user-agent section áp dụng cho chúng ta
                if (applicableUserAgent) {
                    if (lowerLine.startsWith('disallow:')) {
                        const pattern = line.substring(9).trim();
                        if (pattern) { // Không thêm empty disallow rules
                            rules.push({ type: 'disallow', pattern });
                        }
                    } else if (lowerLine.startsWith('allow:')) {
                        const pattern = line.substring(6).trim();
                        if (pattern) {
                            rules.push({ type: 'allow', pattern });
                        }
                    }
                }
            }
            
            // Áp dụng rules theo thứ tự - rules sau sẽ override rules trước
            let allowed = true; // Mặc định cho phép
            
            for (const rule of rules) {
                if (this.matchesPattern(fullUrl, urlPath, rule.pattern)) {
                    allowed = rule.type === 'allow';
                    apiLogger.debug(`URL ${url} khớp rule: ${rule.type} ${rule.pattern} -> ${allowed}`);
                }
            }
            
            return allowed;
            
        } catch (error) {
            apiLogger.warn(`Lỗi trong custom robots.txt parsing cho ${url}:`, { error });
            return true; // Cho phép khi có lỗi
        }
    }

    /**
     * Kiểm tra xem URL có khớp với robots.txt pattern không
     * @param fullUrl - URL đầy đủ với query parameters
     * @param urlPath - Chỉ pathname của URL
     * @param pattern - Pattern từ robots.txt (Allow/Disallow)
     * @returns true nếu URL khớp với pattern
     */
    private matchesPattern(fullUrl: string, urlPath: string, pattern: string): boolean {
        // Xử lý wildcard patterns (có chứa *)
        if (pattern.includes('*')) {
            // Convert robots.txt pattern thành regex
            const regexPattern = pattern
                .replace(/\*/g, '.*')
                .replace(/\?/g, '\\?')
                .replace(/\$/g, '$');
            
            try {
                const regex = new RegExp('^' + regexPattern);
                return regex.test(urlPath) || regex.test(fullUrl);
            } catch (error) {
                // Fallback sang simple string matching nếu regex fail
                return urlPath.startsWith(pattern.replace('*', ''));
            }
        }
        
        // Xử lý exact path matching (pattern kết thúc bằng /)
        if (pattern.endsWith('/')) {
            return urlPath.startsWith(pattern);
        }
        
        // Xử lý query parameter patterns như /*?p=
        if (pattern.includes('?')) {
            return fullUrl.includes(pattern.replace('*', ''));
        }
        
        // Exact match hoặc starts with pattern
        return urlPath === pattern || urlPath.startsWith(pattern);
    }

    /**
     * Lấy crawl delay phù hợp cho URL
     * Kiểm tra robots.txt trước, fallback sang random delay
     * @param url - URL cần crawl
     * @returns Delay time in milliseconds
     */
    async getCrawlDelay(url: string): Promise<number> {
        try {
            const origin = new URL(url).origin;
            const robotsTxt = await this.getRobotsTxt(origin);
            
            if (!robotsTxt) {
                return this.getRandomDelay();
            }

            // Parse crawl-delay manually vì Crawlee không expose getCrawlDelay method
            const crawlDelay = this.parseCrawlDelay(robotsTxt, this.userAgent);
            if (crawlDelay && crawlDelay > 0) {
                const delayMs = crawlDelay * 1000;
                apiLogger.info(`Sử dụng robots.txt crawl-delay: ${delayMs}ms cho ${origin}`);
                return delayMs;
            }

            return this.getRandomDelay();
        } catch (error) {
            apiLogger.warn('Lỗi khi lấy crawl delay:', { error });
            return this.getRandomDelay();
        }
    }

    /**
     * Tạo random delay trong khoảng minDelay - maxDelay
     * @returns Random delay in milliseconds
     */
    private getRandomDelay(): number {
        const delay = Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
        apiLogger.info(`Sử dụng random delay: ${delay}ms`);
        return delay;
    }

    /**
     * Parse crawl-delay từ robots.txt content
     * @param robotsTxt - RobotsTxtFile object
     * @param userAgent - User agent để match
     * @returns Crawl delay in seconds, hoặc null nếu không tìm thấy
     */
    private parseCrawlDelay(robotsTxt: RobotsTxtFile, userAgent: string): number | null {
        try {
            // Access raw content từ robots.txt
            const content = (robotsTxt as any).content || '';
            const lines = content.split('\n');
            let inUserAgentSection = false;
            let crawlDelay: number | null = null;

            for (const line of lines) {
                const trimmedLine = line.trim().toLowerCase();
                
                // Kiểm tra user-agent section
                if (trimmedLine.startsWith('user-agent:')) {
                    const ua = trimmedLine.split(':')[1]?.trim();
                    inUserAgentSection = ua === '*' || ua === userAgent.toLowerCase();
                }
                
                // Parse crawl-delay nếu trong đúng user-agent section
                if (inUserAgentSection && trimmedLine.startsWith('crawl-delay:')) {
                    const delay = parseFloat(trimmedLine.split(':')[1]?.trim() || '0');
                    if (!isNaN(delay)) {
                        crawlDelay = delay;
                    }
                }
            }

            return crawlDelay;
        } catch (error) {
            apiLogger.warn('Lỗi khi parse crawl-delay từ robots.txt:', { error });
            return null;
        }
    }

    /**
     * Lấy headers phù hợp cho HTTP requests
     * @returns Object chứa User-Agent và Accept-Language headers
     */
    getHeaders(): Record<string, string> {
        return {
            'User-Agent': this.userAgent,
            'Accept-Language': this.acceptLanguage,
        };
    }

    /**
     * Xử lý HTTP status codes và tính toán backoff delay phù hợp
     * @param statusCode - HTTP status code nhận được
     * @param url - URL đang crawl
     * @returns Delay time trong milliseconds
     */
    async handleHttpStatus(statusCode: number, url: string): Promise<number> {
        const baseDelay = this.getRandomDelay();
        
        switch (statusCode) {
            case 429: // Too Many Requests - Rate limiting
                const backoffDelay = baseDelay * 3;
                apiLogger.warn(`HTTP 429 (Quá nhiều requests) cho ${url}, backoff ${backoffDelay}ms`);
                return backoffDelay;
                
            case 503: // Service Unavailable - Server quá tải
                const serviceDelay = baseDelay * 2;
                apiLogger.warn(`HTTP 503 (Service Unavailable) cho ${url}, chờ ${serviceDelay}ms`);
                return serviceDelay;
                
            case 502: // Bad Gateway
            case 504: // Gateway Timeout
                const gatewayDelay = baseDelay * 1.5;
                apiLogger.warn(`HTTP ${statusCode} (Gateway Error) cho ${url}, chờ ${gatewayDelay}ms`);
                return gatewayDelay;
                
            default:
                // Cho các status codes khác, sử dụng normal delay
                return baseDelay;
        }
    }

    /**
     * Kiểm tra xem có nên retry trên status code này không
     * @param statusCode - HTTP status code
     * @returns true nếu nên retry, false nếu không
     */
    shouldRetryOnStatus(statusCode: number): boolean {
        // Retry trên server errors và rate limiting
        return [429, 502, 503, 504].includes(statusCode);
    }
}