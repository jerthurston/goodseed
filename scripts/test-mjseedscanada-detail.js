#!/usr/bin/env node
/**
 * 🚀 Quick Test Runner for MJ Seeds Canada Product Detail Extraction
 * 
 * Usage:
 *   node scripts/test-mjseedscanada-detail.js
 *   npm run test:mjseedscanada:detail
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🧪 Running MJ Seeds Canada Product Detail Test...\n');

// Path to the test script
const testScript = path.join(__dirname, '..', 'scrapers', 'mjseedscanada', 'script', 'test-product-detail-extraction.js');

// Run with node
const command = `node "${testScript}"`;

exec(command, { 
    cwd: path.join(__dirname, '..'),
    timeout: 60000 // 60 second timeout
}, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Test execution failed:');
        console.error('========================');
        console.error(error.message);
        return;
    }

    if (stderr) {
        console.error('⚠️  Test warnings:');
        console.error('==================');
        console.error(stderr);
    }

    console.log(stdout);
});