#!/bin/bash
# Usage: ./scripts/make-migration-idempotent.sh <migration_name>
# Example: ./scripts/make-migration-idempotent.sh 20260129225057_add_contact_submission

MIGRATION_FILE="prisma/migrations/$1/migration.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "🔄 Making migration idempotent: $1"
echo ""

# Backup original
cp "$MIGRATION_FILE" "$MIGRATION_FILE.backup"
echo "✅ Backup created: $MIGRATION_FILE.backup"

# 1. Add IF NOT EXISTS to CREATE TABLE
sed -i 's/^CREATE TABLE "/CREATE TABLE IF NOT EXISTS "/g' "$MIGRATION_FILE"

# 2. Add IF NOT EXISTS to CREATE INDEX
sed -i 's/^CREATE INDEX "/CREATE INDEX IF NOT EXISTS "/g' "$MIGRATION_FILE"
sed -i 's/^CREATE UNIQUE INDEX "/CREATE UNIQUE INDEX IF NOT EXISTS "/g' "$MIGRATION_FILE"

# 3. Add DROP INDEX IF EXISTS before indexes (for safety)
sed -i 's/^CREATE INDEX IF NOT EXISTS "\([^"]*\)" ON/DROP INDEX IF EXISTS "\1";\nCREATE INDEX IF NOT EXISTS "\1" ON/g' "$MIGRATION_FILE"

echo "✅ Automated patterns applied:"
echo "   - CREATE TABLE → CREATE TABLE IF NOT EXISTS"
echo "   - CREATE INDEX → CREATE INDEX IF NOT EXISTS"
echo "   - Added DROP INDEX IF EXISTS before index creation"
echo ""
echo "⚠️  MANUAL REVIEW REQUIRED for:"
echo "   - ALTER TYPE (enum) statements → wrap in DO block with pg_enum check"
echo "   - ALTER TABLE ADD COLUMN → wrap in DO block with information_schema check"
echo "   - ADD CONSTRAINT → wrap in DO block with pg_constraint check"
echo ""
echo "📖 See docs/production-docs(important)/PRISMA-MIGRATION-BEST-PRACTICES.md for examples"
echo ""
echo "🧪 Test idempotency with:"
echo "   npx prisma migrate deploy"
echo "   npx prisma migrate resolve --rolled-back $1"
echo "   npx prisma migrate deploy"
