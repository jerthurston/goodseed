/**
 * Check if a path matches a robots.txt pattern (supports wildcards)
 * @param path - URL path to check
 * @param pattern - robots.txt pattern (may contain * wildcards)
 * @returns true if path matches pattern
 */
export function pathMatchesPattern(path: string, pattern: string): boolean {
    // Convert robots.txt pattern to regex
    const regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
        .replace(/\\\*/g, '.*'); // Convert * to .*
    
    const regex = new RegExp('^' + regexPattern);
    return regex.test(path);
}