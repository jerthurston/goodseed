#!/bin/bash

# Test ETag and 304 Not Modified functionality
# Run: bash scripts/test-etag-304.sh

BASE_URL="http://localhost:3000"
API_ENDPOINT="/api/seed?page=1"

echo "🧪 Testing ETag and 304 Not Modified..."
echo "========================================="
echo ""

# Test 1: First request - Get ETag
echo "📥 Test 1: First request (should return 200 + ETag)"
echo "---------------------------------------------------"
response=$(curl -sI "$BASE_URL$API_ENDPOINT")
status=$(echo "$response" | grep "HTTP" | awk '{print $2}')
etag=$(echo "$response" | grep -i "etag:" | cut -d' ' -f2- | tr -d '\r')

echo "Status: $status"
echo "ETag: $etag"
echo ""

if [ -z "$etag" ]; then
    echo "❌ ERROR: No ETag returned!"
    exit 1
fi

# Test 2: Second request with wrong ETag
echo "📥 Test 2: Request with WRONG ETag (should return 200)"
echo "--------------------------------------------------------"
response2=$(curl -sI -H "If-None-Match: \"wrong_etag\"" "$BASE_URL$API_ENDPOINT")
status2=$(echo "$response2" | grep "HTTP" | awk '{print $2}')

echo "Status: $status2"
if [ "$status2" == "200" ]; then
    echo "✅ PASS: Returns 200 when ETag doesn't match"
else
    echo "❌ FAIL: Expected 200, got $status2"
fi
echo ""

# Test 3: Third request with CORRECT ETag
echo "📥 Test 3: Request with CORRECT ETag (should return 304)"
echo "----------------------------------------------------------"
response3=$(curl -sI -H "If-None-Match: $etag" "$BASE_URL$API_ENDPOINT")
status3=$(echo "$response3" | grep "HTTP" | awk '{print $2}')

echo "Status: $status3"
echo "ETag sent: $etag"

if [ "$status3" == "304" ]; then
    echo "✅ PASS: Returns 304 Not Modified when ETag matches!"
    echo ""
    echo "🎉 SUCCESS: ETag caching is working correctly!"
else
    echo "❌ FAIL: Expected 304, got $status3"
    echo ""
    echo "Debug info:"
    echo "$response3"
fi
echo ""

# Test 4: Check cache headers
echo "📊 Test 4: Verify Cache Headers"
echo "---------------------------------"
cache_control=$(echo "$response" | grep -i "cache-control:" | cut -d' ' -f2-)
cf_tag=$(echo "$response" | grep -i "cf-cache-tag:" | cut -d' ' -f2-)

echo "Cache-Control: $cache_control"
echo "CF-Cache-Tag: $cf_tag"

if [[ $cache_control == *"stale-while-revalidate"* ]]; then
    echo "✅ Has stale-while-revalidate"
else
    echo "⚠️  Missing stale-while-revalidate"
fi

if [[ -n "$cf_tag" ]]; then
    echo "✅ Has CF-Cache-Tag"
else
    echo "⚠️  Missing CF-Cache-Tag"
fi

echo ""
echo "========================================="
echo "✅ ETag Test Complete!"
