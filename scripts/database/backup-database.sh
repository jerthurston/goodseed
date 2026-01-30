#!/bin/bash

# Database Backup Script
# Run this before any migration or database operation

set -e

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Extract database connection details
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Create backup directory if not exists
mkdir -p backups

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S-%3N")
BACKUP_FILE="backups/goodseed_backup_${TIMESTAMP}.backup"

echo "🔄 Creating database backup..."
echo "📦 Database: $DB_NAME"
echo "📁 Backup file: $BACKUP_FILE"

# Run pg_dump
PGPASSWORD="$DB_PASSWORD" "/c/Program Files/PostgreSQL/17/bin/pg_dump" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -f "$BACKUP_FILE"

echo "✅ Backup completed successfully!"
echo "📊 Backup size: $(du -h $BACKUP_FILE | cut -f1)"

# Keep only last 5 backups
echo "🧹 Cleaning old backups (keeping last 5)..."
ls -t backups/*.backup | tail -n +6 | xargs -r rm

echo "✨ Done!"
