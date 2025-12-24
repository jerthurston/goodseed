#!/usr/bin/env tsx
/**
 * Test script for Error Processing Service
 * Tests error classification functionality
 */

import { ErrorProcessorService, ScraperErrorType, ErrorSeverity } from '../../lib/services/error-monitoring/error-processor.service';

console.log('🧪 Testing Error Processor Service...\n');

// Test different types of error messages
const testErrors = [
  'job stalled more than allowable limit',
  "Value 'CREATED' not found in enum 'ScrapeJobStatus'",
  'ETIMEDOUT: connection timeout',
  'Failed to fetch data from API',
  'Network connection lost',
  'Authentication failed: invalid token',
  'Rate limit exceeded',
  'Element not found: .product-title',
  'JSON.parse error: Unexpected token',
  'Database connection failed',
  'Memory allocation failed',
  'Invalid URL format',
];

console.log('📊 Error Classification Results:\n');
console.log('─'.repeat(100));
console.log(
  '| Error Message'.padEnd(45) + 
  '| Type'.padEnd(20) + 
  '| Severity'.padEnd(12) + 
  '| Auto-Retry'.padEnd(12) + 
  '| Fix Time'.padEnd(10) + '|'
);
console.log('─'.repeat(100));

testErrors.forEach((errorMessage) => {
  const classification = ErrorProcessorService.classifyError(errorMessage);
  
  console.log(
    `| ${errorMessage.substring(0, 42).padEnd(43)}| ` +
    `${classification.type.replace('_', ' ').padEnd(18)}| ` +
    `${classification.severity.padEnd(10)}| ` +
    `${classification.recommendation.autoRetryable ? 'Yes' : 'No'.padEnd(10)}| ` +
    `${(classification.recommendation.estimatedFixTime || 'N/A').padEnd(8)}| `
  );
});

console.log('─'.repeat(100));

// Test recommendation system
console.log('\n💡 Detailed Recommendations:\n');

const criticalErrors = testErrors.filter(error => {
  const classification = ErrorProcessorService.classifyError(error);
  return classification.severity === 'CRITICAL';
});

criticalErrors.forEach((errorMessage, index) => {
  const classification = ErrorProcessorService.classifyError(errorMessage);
  console.log(`${index + 1}. Error: "${errorMessage}"`);
  console.log(`   Type: ${classification.type}`);
  console.log(`   Severity: ${classification.severity}`);
  console.log(`   Action: ${classification.recommendation.action}`);
  console.log(`   Auto-retry: ${classification.recommendation.autoRetryable ? 'Yes' : 'No'}`);
  if (classification.recommendation.estimatedFixTime) {
    console.log(`   Fix time: ${classification.recommendation.estimatedFixTime}`);
  }
  console.log('');
});

console.log('✅ Error Processing Service test completed!');