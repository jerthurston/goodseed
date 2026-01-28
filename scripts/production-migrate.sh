#!/bin/bash

# Production Migration Script
# This script triggers the migration API on production server

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Production Wishlist Migration Tool${NC}\n"

# Configuration
PRODUCTION_URL="${PRODUCTION_URL:-https://lembooking.com}"
API_ENDPOINT="/api/admin/migrate/wishlist-many-to-many"

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ Error: curl is not installed${NC}"
    exit 1
fi

# Function to check migration status
check_status() {
    echo -e "${BLUE}📊 Checking migration status...${NC}\n"
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "Cookie: ${AUTH_COOKIE}" \
        "${PRODUCTION_URL}${API_ENDPOINT}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✓ Status retrieved successfully${NC}\n"
        echo "$body" | jq '.'
        
        # Parse and display key stats
        needs_migration=$(echo "$body" | jq -r '.needsMigration')
        orphaned=$(echo "$body" | jq -r '.stats.orphanedWishlists')
        
        echo ""
        if [ "$needs_migration" == "true" ]; then
            echo -e "${YELLOW}⚠️  Migration needed: ${orphaned} orphaned wishlists found${NC}"
            return 1
        else
            echo -e "${GREEN}✅ No migration needed - all data is healthy${NC}"
            return 0
        fi
    else
        echo -e "${RED}❌ Failed to check status (HTTP ${http_code})${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Function to run migration
run_migration() {
    echo -e "${BLUE}🔧 Running migration...${NC}\n"
    echo -e "${YELLOW}⚠️  This will modify production database!${NC}"
    
    # Confirmation prompt
    read -p "Are you sure you want to proceed? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Migration cancelled${NC}"
        exit 0
    fi
    
    echo -e "\n${BLUE}Starting migration...${NC}\n"
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Cookie: ${AUTH_COOKIE}" \
        -H "Content-Type: application/json" \
        "${PRODUCTION_URL}${API_ENDPOINT}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✅ Migration completed successfully!${NC}\n"
        echo "$body" | jq '.'
        
        # Display summary
        echo -e "\n${GREEN}═══════════════════════════════════${NC}"
        echo -e "${GREEN}📋 Migration Summary${NC}"
        echo -e "${GREEN}═══════════════════════════════════${NC}"
        
        fixed=$(echo "$body" | jq -r '.migration.fixed')
        errors=$(echo "$body" | jq -r '.migration.errors')
        
        echo -e "Fixed wishlists: ${GREEN}${fixed}${NC}"
        echo -e "Errors: ${errors > 0 ? $RED : $GREEN}${errors}${NC}"
        
        echo -e "${GREEN}═══════════════════════════════════${NC}\n"
    else
        echo -e "${RED}❌ Migration failed (HTTP ${http_code})${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        exit 1
    fi
}

# Main script
echo "Production URL: ${PRODUCTION_URL}"
echo "API Endpoint: ${API_ENDPOINT}"
echo ""

# Check if AUTH_COOKIE is set
if [ -z "$AUTH_COOKIE" ]; then
    echo -e "${YELLOW}⚠️  AUTH_COOKIE not set${NC}"
    echo ""
    echo "To get your auth cookie:"
    echo "1. Open ${PRODUCTION_URL} in browser"
    echo "2. Login as admin"
    echo "3. Open DevTools (F12) → Application → Cookies"
    echo "4. Copy the session cookie value"
    echo "5. Set environment variable:"
    echo "   export AUTH_COOKIE='your-session-cookie'"
    echo ""
    exit 1
fi

# Menu
echo "What would you like to do?"
echo "1) Check migration status"
echo "2) Run migration"
echo "3) Both (check then migrate if needed)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        check_status
        ;;
    2)
        run_migration
        ;;
    3)
        if check_status; then
            echo -e "\n${GREEN}No migration needed!${NC}"
        else
            echo ""
            run_migration
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 Done!${NC}"
