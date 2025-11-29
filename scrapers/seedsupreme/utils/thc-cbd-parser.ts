/**
 * THC/CBD Parser Utility
 * Extracts numeric ranges from text descriptions
 */

export interface THCCBDRange {
    min: number | null;
    max: number | null;
    text: string;
}

/**
 * Parse THC/CBD text into numeric ranges
 * 
 * Examples:
 * - "Very High (over 20%)" → { min: 20, max: null }
 * - "High (15-20%)" → { min: 15, max: 20 }
 * - "Medium (10%)" → { min: 10, max: 10 }
 * - "Low" → { min: null, max: null }
 * 
 * @param text - THC/CBD text description
 * @returns Parsed numeric range with original text
 */
export function parseTHCCBDText(text: string | null | undefined): THCCBDRange {
    if (!text) {
        return { min: null, max: null, text: '' };
    }

    const cleanText = text.toLowerCase().trim();

    // Pattern 1: "over X%" or "above X%"
    // Examples: "Very High (over 20%)", "Above 25%"
    const overMatch = cleanText.match(/(?:over|above)\s+(\d+(?:\.\d+)?)\s*%/);
    if (overMatch) {
        return {
            min: parseFloat(overMatch[1]),
            max: null,
            text
        };
    }

    // Pattern 2: "X-Y%" or "X% - Y%"
    // Examples: "High (15-20%)", "10% - 15%"
    const rangeMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*%?\s*-\s*(\d+(?:\.\d+)?)\s*%/);
    if (rangeMatch) {
        return {
            min: parseFloat(rangeMatch[1]),
            max: parseFloat(rangeMatch[2]),
            text
        };
    }

    // Pattern 3: "under X%" or "below X%"
    // Examples: "Low (under 5%)", "Below 2%"
    const underMatch = cleanText.match(/(?:under|below)\s+(\d+(?:\.\d+)?)\s*%/);
    if (underMatch) {
        return {
            min: null,
            max: parseFloat(underMatch[1]),
            text
        };
    }

    // Pattern 4: Single value "X%"
    // Examples: "Medium (10%)", "15%"
    const singleMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*%/);
    if (singleMatch) {
        const value = parseFloat(singleMatch[1]);
        return {
            min: value,
            max: value,
            text
        };
    }

    // Pattern 5: No numeric value found
    // Examples: "Low", "N/A", "Unknown", "Variable"
    return { min: null, max: null, text };
}

/**
 * Calculate aggregate min/max from multiple ranges
 * 
 * @param ranges - Array of THC/CBD ranges
 * @returns Combined min and max values
 */
export function aggregateRanges(ranges: Array<{ min: number | null; max: number | null }>): {
    min: number | null;
    max: number | null;
} {
    const allMins = ranges.map(r => r.min).filter((v): v is number => v !== null);
    const allMaxs = ranges.map(r => r.max).filter((v): v is number => v !== null);

    return {
        min: allMins.length > 0 ? Math.min(...allMins) : null,
        max: allMaxs.length > 0 ? Math.max(...allMaxs) : null,
    };
}
