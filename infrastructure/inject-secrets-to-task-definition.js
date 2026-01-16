#!/usr/bin/env node

/**
 * Script to inject environment variables from GitHub Secrets/Variables 
 * into ECS task definition before deployment
 * 
 * Usage:
 *   node infrastructure/inject-secrets-to-task-definition.js \
 *     --input infrastructure/ecs-task-definition.json \
 *     --output web-task-definition.json \
 *     --container goodseed-app
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
};

const inputFile = getArg('--input');
const outputFile = getArg('--output');
const containerName = getArg('--container');

if (!inputFile || !outputFile || !containerName) {
  console.error('❌ Missing required arguments');
  console.error('Usage: node inject-secrets-to-task-definition.js --input <input-file> --output <output-file> --container <container-name>');
  process.exit(1);
}

// Environment variables mapping
// These should be available as GitHub Secrets or environment variables
const ENV_VARS = {
  // Core app config
  NODE_ENV: process.env.NODE_ENV || 'production',
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Auth & Security
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  
  // Email service
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  
  // OAuth providers
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  AUTH_FACEBOOK_ID: process.env.AUTH_FACEBOOK_ID,
  AUTH_FACEBOOK_SECRET: process.env.AUTH_FACEBOOK_SECRET,
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  // REDIS_PASSWORD is optional (not used if Redis has no auth)
  ...(process.env.REDIS_PASSWORD && { REDIS_PASSWORD: process.env.REDIS_PASSWORD }),
  
  // Cron & Worker
  CRON_SECRET: process.env.CRON_SECRET,
  
  // Cloudflare
  CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_DOMAIN: process.env.CLOUDFLARE_DOMAIN,
  
  // Public vars
  NEXT_PUBLIC_DEMO_PASSWORD: process.env.NEXT_PUBLIC_DEMO_PASSWORD,
};

// Read task definition
console.log(`📖 Reading task definition from: ${inputFile}`);
const taskDefPath = path.resolve(process.cwd(), inputFile);

if (!fs.existsSync(taskDefPath)) {
  console.error(`❌ Task definition file not found: ${taskDefPath}`);
  process.exit(1);
}

const taskDef = JSON.parse(fs.readFileSync(taskDefPath, 'utf8'));

// Find the container definition
const container = taskDef.containerDefinitions.find(c => c.name === containerName);

if (!container) {
  console.error(`❌ Container "${containerName}" not found in task definition`);
  console.error(`Available containers: ${taskDef.containerDefinitions.map(c => c.name).join(', ')}`);
  process.exit(1);
}

console.log(`✅ Found container: ${containerName}`);

// Initialize environment array if it doesn't exist
if (!container.environment) {
  container.environment = [];
}

// Track injected, updated, and skipped variables
const injected = [];
const updated = [];
const skipped = [];
const missing = [];

// Inject or update environment variables
Object.entries(ENV_VARS).forEach(([key, value]) => {
  if (value === undefined || value === null || value === '') {
    missing.push(key);
    return;
  }

  const existingIndex = container.environment.findIndex(env => env.name === key);

  if (existingIndex !== -1) {
    // Update existing variable
    const oldValue = container.environment[existingIndex].value;
    container.environment[existingIndex].value = value;
    
    if (oldValue !== value) {
      updated.push(key);
    } else {
      skipped.push(key);
    }
  } else {
    // Add new variable
    container.environment.push({
      name: key,
      value: value
    });
    injected.push(key);
  }
});

// Sort environment variables alphabetically for consistency
container.environment.sort((a, b) => a.name.localeCompare(b.name));

// Write output file
const outputPath = path.resolve(process.cwd(), outputFile);
fs.writeFileSync(outputPath, JSON.stringify(taskDef, null, 2));

console.log('\n📊 Summary:');
console.log(`✅ Injected: ${injected.length} variables`);
if (injected.length > 0) {
  console.log(`   ${injected.join(', ')}`);
}

console.log(`🔄 Updated: ${updated.length} variables`);
if (updated.length > 0) {
  console.log(`   ${updated.join(', ')}`);
}

console.log(`⏭️  Skipped: ${skipped.length} variables (already up-to-date)`);

if (missing.length > 0) {
  console.log(`\n⚠️  Missing: ${missing.length} variables (not set in environment)`);
  console.log(`   ${missing.join(', ')}`);
  console.log('\n💡 These variables should be set as GitHub Secrets or environment variables');
}

console.log(`\n✅ Task definition written to: ${outputPath}`);
console.log(`📦 Total environment variables: ${container.environment.length}`);
