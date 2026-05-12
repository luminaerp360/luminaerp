#!/bin/bash

echo "Testing Lumina ERP API Endpoints"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}1. Testing Backend Health Check...${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/health)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
    echo "Response: $RESPONSE_BODY"
else
    echo -e "${RED}✗ Backend health check failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 2: Login Endpoint (localhost)
echo -e "${YELLOW}2. Testing Login Endpoint (localhost:3000)...${NC}"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@techlitsolution.com","password":"Admin@2520"}')

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ Login successful (HTTP $HTTP_CODE)${NC}"
    echo "Response: $RESPONSE_BODY" | head -c 200
    echo "..."
else
    echo -e "${RED}✗ Login failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $RESPONSE_BODY"
fi
echo ""

# Test 3: Login via Domain
echo -e "${YELLOW}3. Testing Login via Domain (api.lumina360.tech)...${NC}"
DOMAIN_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://api.lumina360.tech/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@techlitsolution.com","password":"Admin@2520"}')

HTTP_CODE=$(echo "$DOMAIN_LOGIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$DOMAIN_LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ Domain login successful (HTTP $HTTP_CODE)${NC}"
    echo "Response: $RESPONSE_BODY" | head -c 200
    echo "..."
else
    echo -e "${RED}✗ Domain login failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $RESPONSE_BODY"
fi
echo ""

# Test 4: CORS Check
echo -e "${YELLOW}4. Testing CORS Headers...${NC}"
CORS_RESPONSE=$(curl -s -I -X OPTIONS https://api.lumina360.tech/auth/login \
  -H "Origin: https://erp.lumina360.tech" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization")

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✓ CORS headers present${NC}"
    echo "$CORS_RESPONSE" | grep "Access-Control"
else
    echo -e "${RED}✗ CORS headers missing${NC}"
    echo "This may cause issues with frontend requests"
fi
echo ""

echo "================================="
echo "Test Complete"
