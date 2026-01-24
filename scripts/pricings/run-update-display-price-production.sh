#!/bin/bash

# Script to update displayPrice for production database
# This script will populate displayPrice field for all SeedProducts in production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Update DisplayPrice - Production${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable is not set${NC}"
    echo -e "${YELLOW}Please set your production DATABASE_URL:${NC}"
    echo -e "${GREEN}export DATABASE_URL='postgresql://user:password@host:5432/database'${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Database URL: ${NC}${DATABASE_URL:0:30}...${NC}"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}⚠️  WARNING: This will update displayPrice for ALL SeedProducts in the database${NC}"
echo -e "${YELLOW}⚠️  Make sure you are connected to the correct database!${NC}"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Aborted by user${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}🚀 Starting displayPrice update...${NC}"
echo ""

# Run the TypeScript script using tsx
pnpm tsx scripts/pricings/update-display-price.ts

echo ""
echo -e "${GREEN}✅ Update completed!${NC}"
echo -e "${BLUE}========================================${NC}"
