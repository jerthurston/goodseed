#!/bin/bash

# Test Content APIs Cache (Homepage & FAQ)
# Verify ETag, 304 Not Modified, and cache headers

echo "🧪 Testing Content APIs Cache (Homepage & FAQ)"
echo "================================================"
echo ""

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

# ===================================================================
# TEST HOMEPAGE API
# ===================================================================

echo -e "${BLUE}📄 Testing /api/content/homepage${NC}"
echo "====================================================================="
echo ""

# Test 1: First request (200 + ETag)
echo "Test 1: First request should return 200 + ETag"
echo "-----------------------------------------------"
RESPONSE=$(curl -s -I "$BASE_URL/api/content/homepage")
STATUS=$(echo "$RESPONSE" | grep "HTTP" | awk '{print $2}')
ETAG=$(echo "$RESPONSE" | grep -i "etag:" | cut -d' ' -f2- | tr -d '\r')

if [[ "$STATUS" == "200" ]] && [[ -n "$ETAG" ]]; then
    echo -e "${GREEN}✅ PASS${NC}: Status 200, ETag: $ETAG"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: Expected 200 + ETag, got Status: $STATUS, ETag: $ETAG"
    ((FAIL++))
fi
echo ""

# Test 2: Request with correct ETag (304)
echo "Test 2: Request with correct ETag should return 304"
echo "----------------------------------------------------"
if [[ -n "$ETAG" ]]; then
    STATUS_304=$(curl -s -I -H "If-None-Match: $ETAG" "$BASE_URL/api/content/homepage" | grep "HTTP" | awk '{print $2}')
    
    if [[ "$STATUS_304" == "304" ]]; then
        echo -e "${GREEN}✅ PASS${NC}: 304 Not Modified returned"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}: Expected 304, got $STATUS_304"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC}: No ETag from Test 1"
fi
echo ""

# Test 3: Cache headers verification
echo "Test 3: Verify cache headers (content type)"
echo "--------------------------------------------"
CACHE_CONTROL=$(echo "$RESPONSE" | grep -i "cache-control:" | cut -d' ' -f2- | tr -d '\r')
CF_TAG=$(echo "$RESPONSE" | grep -i "cf-cache-tag:" | cut -d' ' -f2- | tr -d '\r')
VARY=$(echo "$RESPONSE" | grep -i "vary:" | cut -d' ' -f2- | tr -d '\r')

# Check for content cache settings (5 min browser, 30 min CDN, 1 hour SWR)
if echo "$CACHE_CONTROL" | grep -q "max-age=300" && \
   echo "$CACHE_CONTROL" | grep -q "s-maxage=1800" && \
   echo "$CACHE_CONTROL" | grep -q "stale-while-revalidate=3600"; then
    echo -e "${GREEN}✅ PASS${NC}: Cache-Control correct (5min/30min/1hr)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: Cache-Control incorrect"
    echo "   Got: $CACHE_CONTROL"
    ((FAIL++))
fi

if echo "$CF_TAG" | grep -q "content" && echo "$CF_TAG" | grep -q "homepage"; then
    echo -e "${GREEN}✅ PASS${NC}: CF-Cache-Tag: $CF_TAG"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: CF-Cache-Tag missing or incorrect: $CF_TAG"
    ((FAIL++))
fi

if echo "$VARY" | grep -qi "accept-encoding"; then
    echo -e "${GREEN}✅ PASS${NC}: Vary header present"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: Vary header missing"
    ((FAIL++))
fi
echo ""

# ===================================================================
# TEST FAQ API
# ===================================================================

echo -e "${BLUE}📄 Testing /api/content/faq${NC}"
echo "====================================================================="
echo ""

# Test 4: First request (200 + ETag)
echo "Test 4: First request should return 200 + ETag"
echo "-----------------------------------------------"
RESPONSE_FAQ=$(curl -s -I "$BASE_URL/api/content/faq")
STATUS_FAQ=$(echo "$RESPONSE_FAQ" | grep "HTTP" | awk '{print $2}')
ETAG_FAQ=$(echo "$RESPONSE_FAQ" | grep -i "etag:" | cut -d' ' -f2- | tr -d '\r')

if [[ "$STATUS_FAQ" == "200" ]] && [[ -n "$ETAG_FAQ" ]]; then
    echo -e "${GREEN}✅ PASS${NC}: Status 200, ETag: $ETAG_FAQ"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: Expected 200 + ETag, got Status: $STATUS_FAQ, ETag: $ETAG_FAQ"
    ((FAIL++))
fi
echo ""

# Test 5: Request with correct ETag (304)
echo "Test 5: Request with correct ETag should return 304"
echo "----------------------------------------------------"
if [[ -n "$ETAG_FAQ" ]]; then
    STATUS_304_FAQ=$(curl -s -I -H "If-None-Match: $ETAG_FAQ" "$BASE_URL/api/content/faq" | grep "HTTP" | awk '{print $2}')
    
    if [[ "$STATUS_304_FAQ" == "304" ]]; then
        echo -e "${GREEN}✅ PASS${NC}: 304 Not Modified returned"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}: Expected 304, got $STATUS_304_FAQ"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC}: No ETag from Test 4"
fi
echo ""

# Test 6: Cache headers verification
echo "Test 6: Verify cache headers (content type)"
echo "--------------------------------------------"
CACHE_CONTROL_FAQ=$(echo "$RESPONSE_FAQ" | grep -i "cache-control:" | cut -d' ' -f2- | tr -d '\r')
CF_TAG_FAQ=$(echo "$RESPONSE_FAQ" | grep -i "cf-cache-tag:" | cut -d' ' -f2- | tr -d '\r')

if echo "$CACHE_CONTROL_FAQ" | grep -q "max-age=300" && \
   echo "$CACHE_CONTROL_FAQ" | grep -q "s-maxage=1800" && \
   echo "$CACHE_CONTROL_FAQ" | grep -q "stale-while-revalidate=3600"; then
    echo -e "${GREEN}✅ PASS${NC}: Cache-Control correct (5min/30min/1hr)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: Cache-Control incorrect"
    echo "   Got: $CACHE_CONTROL_FAQ"
    ((FAIL++))
fi

if echo "$CF_TAG_FAQ" | grep -q "content" && echo "$CF_TAG_FAQ" | grep -q "faq"; then
    echo -e "${GREEN}✅ PASS${NC}: CF-Cache-Tag: $CF_TAG_FAQ"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: CF-Cache-Tag missing or incorrect: $CF_TAG_FAQ"
    ((FAIL++))
fi
echo ""

# ===================================================================
# SUMMARY
# ===================================================================

echo "====================================================================="
echo "📊 Test Results: $PASS passed, $FAIL failed"
echo "====================================================================="

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 SUCCESS: All Content API cache tests passed!${NC}"
    echo ""
    echo "✅ Homepage API:"
    echo "   - ETag + 304 working"
    echo "   - Cache: 5 min browser, 30 min CDN, 1 hour SWR"
    echo "   - CF-Cache-Tag: content,homepage"
    echo ""
    echo "✅ FAQ API:"
    echo "   - ETag + 304 working"
    echo "   - Cache: 5 min browser, 30 min CDN, 1 hour SWR"
    echo "   - CF-Cache-Tag: content,faq"
    exit 0
else
    echo -e "${RED}❌ FAILED: Some tests did not pass${NC}"
    exit 1
fi
