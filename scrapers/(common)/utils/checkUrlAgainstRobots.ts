import { RobotsRules } from "@/lib/utils/polite-crawler";
import { pathMatchesPattern } from "./pathMatchesPattern";

/**
 * Check if a URL is allowed by robots.txt rules
 * @param url - URL to check
 * @param robotsRules - Parsed robots.txt rules
 * @returns true if URL is allowed, false if disallowed
 */
export function checkUrlAgainstRobots(url: string, robotsRules: RobotsRules): boolean {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    
    // Check allowed paths first (higher priority)
    for (const allowedPath of robotsRules.allowedPaths) {
        if (pathMatchesPattern(path, allowedPath)) {
            return true;
        }
    }
    
    // Check disallowed paths
    for (const disallowedPath of robotsRules.disallowedPaths) {
        if (pathMatchesPattern(path, disallowedPath)) {
            return false;
        }
    }
    
    // If no specific rule matches, default is allowed
    return true;
}