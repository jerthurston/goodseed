/**
 * Advanced Validation System for Cannabis Seed Product Data
 * 
 * Comprehensive validation utilities to ensure data quality from both
 * JSON-LD and manual extraction methods
 */

import { ScraperProduct } from '@/lib/services/json-ld';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestedFix?: string;
}

/**
 * Cannabis-specific validation rules
 */
export const VALIDATION_RULES = {
  // Required fields
  REQUIRED_FIELDS: ['name', 'price', 'source_url'],
  
  // Price validation
  MIN_PRICE: 1,
  MAX_PRICE: 1000,
  
  // Name validation
  MIN_NAME_LENGTH: 3,
  MAX_NAME_LENGTH: 200,
  
  // Cannabis-specific patterns
  STRAIN_TYPES: ['indica', 'sativa', 'hybrid', 'ruderalis'],
  SEED_TYPES: ['feminized', 'regular', 'autoflower', 'auto', 'photoperiod'],
  
  // THC/CBD patterns
  THC_PATTERN: /(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?%?/i,
  CBD_PATTERN: /(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?%?/i,
  
  // Flowering time patterns
  FLOWERING_PATTERN: /(\d+)\s*-?\s*(\d+)?\s*(weeks?|days?)/i,
  
  // URL validation
  URL_PATTERN: /^https?:\/\/[^\s/$.?#].[^\s]*$/i
} as const;

/**
 * Comprehensive product validation
 */
export function validateProduct(product: ScraperProduct): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  let score = 100;

  // 1. Required fields validation
  for (const field of VALIDATION_RULES.REQUIRED_FIELDS) {
    const value = product[field as keyof ScraperProduct];
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      errors.push({
        field,
        code: 'REQUIRED_FIELD_MISSING',
        message: `Required field '${field}' is missing or empty`,
        severity: 'critical'
      });
      score -= 25; // Heavy penalty for missing required fields
    }
  }

  // 2. Name validation
  if (product.name) {
    if (product.name.length < VALIDATION_RULES.MIN_NAME_LENGTH) {
      errors.push({
        field: 'name',
        code: 'NAME_TOO_SHORT',
        message: `Product name is too short (${product.name.length} chars)`,
        severity: 'major'
      });
      score -= 15;
    }
    
    if (product.name.length > VALIDATION_RULES.MAX_NAME_LENGTH) {
      warnings.push({
        field: 'name',
        message: `Product name is very long (${product.name.length} chars)`,
        suggestedFix: 'Consider truncating or extracting main product name'
      });
      score -= 5;
    }
    
    // Check for common cannabis seed terms
    const commonTerms = /seed|strain|cannabis|marijuana|hemp/i;
    if (!commonTerms.test(product.name)) {
      warnings.push({
        field: 'name',
        message: 'Product name may not contain cannabis-related terms',
        suggestedFix: 'Verify this is actually a cannabis seed product'
      });
      score -= 5;
    }
  }

  // 3. Price validation
  if (typeof product.price === 'number') {
    if (product.price < VALIDATION_RULES.MIN_PRICE) {
      errors.push({
        field: 'price',
        code: 'PRICE_TOO_LOW',
        message: `Price is unusually low: $${product.price}`,
        severity: 'major'
      });
      score -= 15;
    }
    
    if (product.price > VALIDATION_RULES.MAX_PRICE) {
      warnings.push({
        field: 'price',
        message: `Price is unusually high: $${product.price}`,
        suggestedFix: 'Verify this is the correct price, not a bulk pack price'
      });
      score -= 5;
    }
  } else if (product.price !== undefined) {
    errors.push({
      field: 'price',
      code: 'INVALID_PRICE_TYPE',
      message: `Price must be a number, got: ${typeof product.price}`,
      severity: 'critical'
    });
    score -= 20;
  }

  // 4. Currency validation
  if (product.currency && !['USD', 'CAD', 'EUR', 'GBP'].includes(product.currency)) {
    warnings.push({
      field: 'currency',
      message: `Uncommon currency: ${product.currency}`,
      suggestedFix: 'Verify currency code is correct'
    });
    score -= 2;
  }

  // 5. URL validation
  if (product.source_url && !VALIDATION_RULES.URL_PATTERN.test(product.source_url)) {
    errors.push({
      field: 'source_url',
      code: 'INVALID_URL',
      message: 'Source URL is not a valid HTTP/HTTPS URL',
      severity: 'major'
    });
    score -= 10;
  }

  // 6. Cannabis-specific validations
  validateCannabisFields(product, errors, warnings, suggestions);
  score -= (errors.filter(e => e.field.includes('cannabis')).length * 5);
  score -= (warnings.filter(w => w.field.includes('cannabis')).length * 2);

  // 7. Data consistency checks
  validateDataConsistency(product, errors, warnings);
  score -= (errors.filter(e => e.code.includes('CONSISTENCY')).length * 8);

  // 8. Data completeness scoring
  const completenessScore = calculateCompletenessScore(product);
  score = Math.min(score, completenessScore);

  // Generate suggestions based on validation results
  generateSuggestions(product, errors, warnings, suggestions);

  return {
    isValid: errors.filter(e => e.severity === 'critical').length === 0,
    score: Math.max(0, Math.round(score)),
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validate cannabis-specific fields
 */
function validateCannabisFields(
  product: ScraperProduct, 
  errors: ValidationError[], 
  warnings: ValidationWarning[],
  suggestions: string[]
): void {
  
  // Strain type validation
  if (product.strain_type) {
    const normalized = product.strain_type.toLowerCase().trim();
    if (!VALIDATION_RULES.STRAIN_TYPES.some(type => normalized.includes(type))) {
      warnings.push({
        field: 'strain_type',
        message: `Unknown strain type: ${product.strain_type}`,
        suggestedFix: 'Should be one of: Indica, Sativa, Hybrid, Ruderalis'
      });
    }
  } else {
    suggestions.push('Consider extracting strain type (Indica/Sativa/Hybrid) if available');
  }

  // Seed type validation
  if (product.seed_type) {
    const normalized = product.seed_type.toLowerCase().trim();
    if (!VALIDATION_RULES.SEED_TYPES.some(type => normalized.includes(type))) {
      warnings.push({
        field: 'seed_type',
        message: `Unknown seed type: ${product.seed_type}`,
        suggestedFix: 'Should be one of: Feminized, Regular, Autoflower, Photoperiod'
      });
    }
  } else {
    suggestions.push('Consider extracting seed type (Feminized/Regular/Auto) if available');
  }

  // THC content validation
  if (product.thc_content) {
    const match = product.thc_content.match(VALIDATION_RULES.THC_PATTERN);
    if (!match) {
      warnings.push({
        field: 'thc_content',
        message: `THC content format may be invalid: ${product.thc_content}`,
        suggestedFix: 'Expected format: "15-20%" or "18%"'
      });
    } else {
      const thcValue = parseFloat(match[1]);
      if (thcValue > 35) {
        warnings.push({
          field: 'thc_content',
          message: `THC content seems unusually high: ${thcValue}%`,
          suggestedFix: 'Verify this is not CBD content or a typo'
        });
      }
    }
  }

  // CBD content validation
  if (product.cbd_content) {
    const match = product.cbd_content.match(VALIDATION_RULES.CBD_PATTERN);
    if (!match) {
      warnings.push({
        field: 'cbd_content',
        message: `CBD content format may be invalid: ${product.cbd_content}`,
        suggestedFix: 'Expected format: "1-3%" or "2%"'
      });
    }
  }

  // Flowering time validation
  if (product.flowering_time) {
    const match = product.flowering_time.match(VALIDATION_RULES.FLOWERING_PATTERN);
    if (!match) {
      warnings.push({
        field: 'flowering_time',
        message: `Flowering time format may be invalid: ${product.flowering_time}`,
        suggestedFix: 'Expected format: "8-9 weeks" or "65 days"'
      });
    } else {
      const timeValue = parseInt(match[1]);
      const unit = match[3].toLowerCase();
      
      if (unit.includes('week') && (timeValue < 6 || timeValue > 16)) {
        warnings.push({
          field: 'flowering_time',
          message: `Flowering time seems unusual: ${timeValue} weeks`,
          suggestedFix: 'Cannabis typically flowers 6-16 weeks'
        });
      }
    }
  }
}

/**
 * Validate data consistency between fields
 */
function validateDataConsistency(
  product: ScraperProduct, 
  errors: ValidationError[], 
  warnings: ValidationWarning[]
): void {
  
  // Check if autoflower has flowering time (should be irrelevant)
  if (product.seed_type?.toLowerCase().includes('auto') && product.flowering_time) {
    warnings.push({
      field: 'flowering_time',
      message: 'Autoflower seeds typically don\'t need flowering time specification',
      suggestedFix: 'Consider if this is relevant for autoflower genetics'
    });
  }

  // Check THC/CBD relationship
  if (product.thc_content && product.cbd_content) {
    const thcMatch = product.thc_content.match(/(\d+(?:\.\d+)?)/);
    const cbdMatch = product.cbd_content.match(/(\d+(?:\.\d+)?)/);
    
    if (thcMatch && cbdMatch) {
      const thcVal = parseFloat(thcMatch[1]);
      const cbdVal = parseFloat(cbdMatch[1]);
      
      if (thcVal + cbdVal > 35) {
        warnings.push({
          field: 'thc_content',
          message: `Combined THC+CBD seems high: ${thcVal + cbdVal}%`,
          suggestedFix: 'Verify cannabinoid percentages are correct'
        });
      }
    }
  }

  // Check price vs availability
  if (product.price > 0 && product.availability === false) {
    warnings.push({
      field: 'availability',
      message: 'Product shows price but marked as unavailable',
      suggestedFix: 'Verify stock status is accurate'
    });
  }
}

/**
 * Calculate data completeness score
 */
function calculateCompletenessScore(product: ScraperProduct): number {
  const fieldWeights = {
    // Core fields (high weight)
    name: 15,
    price: 15,
    image_url: 10,
    description: 8,
    
    // Cannabis-specific (medium weight)  
    strain_type: 10,
    seed_type: 10,
    thc_content: 8,
    cbd_content: 6,
    
    // Optional fields (low weight)
    flowering_time: 4,
    yield_info: 3,
    genetics: 3,
    effects: 2,
    aroma: 2,
    flavor: 2,
    availability: 2,
    rating: 2,
    review_count: 1
  };

  let earnedPoints = 0;
  let totalPoints = 0;

  Object.entries(fieldWeights).forEach(([field, weight]) => {
    totalPoints += weight;
    const value = product[field as keyof ScraperProduct];
    
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'string' && value.trim().length > 0) {
        earnedPoints += weight;
      } else if (typeof value === 'number' && value > 0) {
        earnedPoints += weight;
      } else if (typeof value === 'boolean') {
        earnedPoints += weight;
      }
    }
  });

  return Math.round((earnedPoints / totalPoints) * 100);
}

/**
 * Generate actionable suggestions for improvement
 */
function generateSuggestions(
  product: ScraperProduct,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  suggestions: string[]
): void {
  
  if (errors.length > 0) {
    suggestions.push('🔴 Fix critical errors first to ensure data integrity');
  }

  if (!product.image_url) {
    suggestions.push('📷 Add product image URL for better user experience');
  }

  if (!product.description || product.description.length < 50) {
    suggestions.push('📝 Expand product description with more details');
  }

  if (!product.strain_type && !product.seed_type) {
    suggestions.push('🌱 Extract cannabis-specific properties (strain type, seed type)');
  }

  if (!product.thc_content && !product.cbd_content) {
    suggestions.push('🧪 Add cannabinoid content information if available');
  }

  if (warnings.length > 3) {
    suggestions.push('⚠️ Review and address validation warnings to improve data quality');
  }

  if (!product.rating && !product.review_count) {
    suggestions.push('⭐ Include customer ratings/reviews if available on the source site');
  }
}

/**
 * Compare validation results between extraction methods
 */
export function compareExtractionMethods(
  jsonLdProduct: ScraperProduct | null,
  manualProduct: ScraperProduct | null
): {
  recommendation: 'json-ld' | 'manual' | 'merge' | 'neither';
  reasoning: string;
  jsonLdValidation?: ValidationResult;
  manualValidation?: ValidationResult;
} {
  
  const jsonLdValidation = jsonLdProduct ? validateProduct(jsonLdProduct) : null;
  const manualValidation = manualProduct ? validateProduct(manualProduct) : null;

  // Neither method succeeded
  if (!jsonLdValidation && !manualValidation) {
    return {
      recommendation: 'neither',
      reasoning: 'Both extraction methods failed',
      jsonLdValidation: undefined,
      manualValidation: undefined
    };
  }

  // Only one method succeeded
  if (jsonLdValidation && !manualValidation) {
    return {
      recommendation: 'json-ld',
      reasoning: `JSON-LD extraction succeeded (score: ${jsonLdValidation.score}%)`,
      jsonLdValidation,
      manualValidation: undefined
    };
  }

  if (!jsonLdValidation && manualValidation) {
    return {
      recommendation: 'manual',
      reasoning: `Manual extraction succeeded (score: ${manualValidation.score}%)`,
      jsonLdValidation: undefined,
      manualValidation
    };
  }

  // Both methods succeeded - compare quality
  if (jsonLdValidation && manualValidation) {
    const scoreDiff = jsonLdValidation.score - manualValidation.score;
    
    if (Math.abs(scoreDiff) < 10) {
      return {
        recommendation: 'merge',
        reasoning: `Both methods have similar quality (JSON-LD: ${jsonLdValidation.score}%, Manual: ${manualValidation.score}%) - merge for best results`,
        jsonLdValidation,
        manualValidation
      };
    }
    
    if (scoreDiff > 0) {
      return {
        recommendation: 'json-ld',
        reasoning: `JSON-LD has better quality (${jsonLdValidation.score}% vs ${manualValidation.score}%)`,
        jsonLdValidation,
        manualValidation
      };
    } else {
      return {
        recommendation: 'manual',
        reasoning: `Manual extraction has better quality (${manualValidation.score}% vs ${jsonLdValidation.score}%)`,
        jsonLdValidation,
        manualValidation
      };
    }
  }

  return {
    recommendation: 'neither',
    reasoning: 'Unexpected validation state',
    jsonLdValidation: jsonLdValidation || undefined,
    manualValidation: manualValidation || undefined
  };
}

/**
 * Generate comprehensive validation report
 */
export function generateValidationReport(products: ScraperProduct[]): {
  totalProducts: number;
  validProducts: number;
  validationRate: number;
  averageScore: number;
  commonIssues: Array<{ issue: string; count: number; percentage: number }>;
  recommendations: string[];
} {
  
  const validationResults = products.map(validateProduct);
  
  const validProducts = validationResults.filter(r => r.isValid).length;
  const validationRate = (validProducts / products.length) * 100;
  const averageScore = validationResults.reduce((sum, r) => sum + r.score, 0) / validationResults.length;

  // Collect common issues
  const issueCounter = new Map<string, number>();
  
  validationResults.forEach(result => {
    result.errors.forEach(error => {
      const key = `${error.code}: ${error.message}`;
      issueCounter.set(key, (issueCounter.get(key) || 0) + 1);
    });
    
    result.warnings.forEach(warning => {
      const key = `Warning: ${warning.message}`;
      issueCounter.set(key, (issueCounter.get(key) || 0) + 1);
    });
  });

  const commonIssues = Array.from(issueCounter.entries())
    .map(([issue, count]) => ({
      issue,
      count,
      percentage: Math.round((count / products.length) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 issues

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (validationRate < 80) {
    recommendations.push('🚨 Validation rate is low - review extraction selectors and data quality');
  }
  
  if (averageScore < 70) {
    recommendations.push('📊 Average quality score is low - focus on completeness and accuracy');
  }
  
  if (commonIssues.length > 0) {
    recommendations.push(`🔧 Address top issue: ${commonIssues[0].issue} (affects ${commonIssues[0].percentage}% of products)`);
  }

  return {
    totalProducts: products.length,
    validProducts,
    validationRate: Math.round(validationRate * 10) / 10,
    averageScore: Math.round(averageScore * 10) / 10,
    commonIssues,
    recommendations
  };
}