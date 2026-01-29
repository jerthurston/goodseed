/**
 * Script to migrate data from local PostgreSQL to Neon database
 * 
 * Usage:
 * Set environment variables first:
 * LOCAL_DB_URL - Local PostgreSQL connection string
 * DATABASE_URL - Neon database connection string (or use .env.production)
 * PG_BIN_PATH - Path to PostgreSQL bin directory (optional, defaults to common location)
 * 
 * Example:
 * LOCAL_DB_URL="postgresql://user:pass@localhost:5432/dbname" pnpm tsx scripts/database/migrate-local-to-neon.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const execAsync = promisify(exec);

// Load environment variables from .env.production if exists
dotenv.config({ path: '.env.production' });

// Database configurations from environment variables
const LOCAL_DB_URL = process.env.LOCAL_DB_URL;
const NEON_DB_URL = process.env.DATABASE_URL;

// PostgreSQL bin path - adjust if needed
const PG_BIN_PATH = process.env.PG_BIN_PATH || 'C:\\Program Files\\PostgreSQL\\17\\bin';

// Validate required environment variables
if (!LOCAL_DB_URL) {
  console.error('❌ Error: LOCAL_DB_URL environment variable is required');
  console.error('   Example: LOCAL_DB_URL="postgresql://user:pass@localhost:5432/dbname"');
  process.exit(1);
}

if (!NEON_DB_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is required');
  console.error('   Make sure .env.production exists or set DATABASE_URL environment variable');
  process.exit(1);
}

async function checkPostgreSQLTools() {
  console.log('🔍 Checking PostgreSQL tools...');
  try {
    const pgDumpPath = path.join(PG_BIN_PATH, 'pg_dump.exe');
    const psqlPath = path.join(PG_BIN_PATH, 'psql.exe');
    
    if (!fs.existsSync(pgDumpPath)) {
      throw new Error(`pg_dump not found at: ${pgDumpPath}`);
    }
    if (!fs.existsSync(psqlPath)) {
      throw new Error(`psql not found at: ${psqlPath}`);
    }
    
    console.log('✅ PostgreSQL tools found');
    return { pgDumpPath, psqlPath };
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

async function exportLocalDatabase(pgDumpPath: string) {
  console.log('\n📦 Exporting data from local database...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(process.cwd(), 'backups', `local_export_${timestamp}.sql`);
  
  // Create backups directory if it doesn't exist
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  try {
    // Export data only (no schema, since Prisma handles that)
    const command = `"${pgDumpPath}" --data-only --no-owner --no-privileges "${LOCAL_DB_URL}" -f "${backupFile}"`;
    
    console.log('Running export command...');
    await execAsync(command);
    
    console.log(`✅ Data exported to: ${backupFile}`);
    return backupFile;
  } catch (error: any) {
    console.error('❌ Export failed:', error.message);
    throw error;
  }
}

async function importToNeon(psqlPath: string, backupFile: string) {
  console.log('\n📥 Importing data to Neon database...');
  
  try {
    // Import data to Neon
    const command = `"${psqlPath}" "${NEON_DB_URL}" -f "${backupFile}"`;
    
    console.log('Running import command...');
    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) console.log('Output:', stdout);
    if (stderr) console.log('Warnings:', stderr);
    
    console.log('✅ Data imported successfully to Neon!');
  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    
    // Check if it's a conflict error (data already exists)
    if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
      console.log('\n⚠️  Some data already exists in Neon. You may need to:');
      console.log('   1. Clear the Neon database first, or');
      console.log('   2. Use --clean flag in pg_dump, or');
      console.log('   3. Manually resolve conflicts');
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting migration from local PostgreSQL to Neon...\n');
  
  try {
    // Step 1: Check tools
    const { pgDumpPath, psqlPath } = await checkPostgreSQLTools();
    
    // Step 2: Export from local
    const backupFile = await exportLocalDatabase(pgDumpPath);
    
    // Step 3: Import to Neon
    await importToNeon(psqlPath, backupFile);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log(`\n📄 Backup file saved at: ${backupFile}`);
    console.log('   You can delete this file after verifying the migration.');
    
  } catch (error: any) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

main();
