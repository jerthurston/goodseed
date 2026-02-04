/**
 * Test Runner with Environment Variables
 * Loads .env.local before running test script
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load .env as fallback
config({ path: resolve(process.cwd(), '.env') });

console.log('✅ Environment variables loaded');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('REDIS_URL exists:', !!process.env.REDIS_URL);

// Now run the actual test
import('./test-price-alert-simple');
