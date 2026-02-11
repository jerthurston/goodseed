#!/usr/bin/env tsx
/**
 * Check Render Configuration Script
 * 
 * Kiểm tra worker trên Render có đang chạy với config đúng không:
 * - Memory limits
 * - Crawlee settings
 * - Node.js version
 * - Environment variables
 */

import { ioredis as redis } from '@/lib/redis';

async function checkRenderConfig() {
    console.log('🔍 Checking Render Worker Configuration...\n');

    try {
        // Connect to production Redis - redis is already initialized
        
        // Create a test job to trigger worker health check
        const testPayload = {
            type: 'health-check',
            timestamp: new Date().toISOString(),
            requestedBy: 'check-render-config script'
        };

        // Push to a special health-check queue
        await redis.lpush('health-check-queue', JSON.stringify(testPayload));
        
        console.log('✅ Test payload sent to health-check-queue');
        console.log('📋 Payload:', testPayload);
        
        console.log('\n📝 Expected worker to log:');
        console.log('   - NODE_VERSION');
        console.log('   - WORKER_CONCURRENCY'); 
        console.log('   - CRAWLEE_AVAILABLE_MEMORY_RATIO');
        console.log('   - Available memory (MB)');
        console.log('   - Plan type (starter/standard)');
        
        console.log('\n🔗 Check Render logs at:');
        console.log('   https://dashboard.render.com/');
        
        await redis.quit();
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkRenderConfig();
