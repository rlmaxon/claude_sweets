#!/bin/bash

# Finding Sweetie API Test Script
# Tests all major API endpoints

API_URL="http://localhost:3000/api"
COOKIE_FILE="test_cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🐾 Finding Sweetie API Test Suite"
echo "=================================="
echo ""

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq is not installed. Output will not be formatted.${NC}"
        echo "   Install with: sudo apt-get install jq"
        echo ""
        return 1
    fi
    return 0
}

# Function to print test result
print_result() {
    local status=$1
    local test_name=$2
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
    fi
}

# Check if jq is available
HAS_JQ=0
check_jq && HAS_JQ=1

# Test 1: Health Check
echo -e "\n${YELLOW}Test 1: Health Check${NC}"
echo "GET $API_URL/health"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if [ $HAS_JQ -eq 1 ]; then
    echo "$HEALTH_RESPONSE" | jq
else
    echo "$HEALTH_RESPONSE"
fi

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    print_result 0 "Health Check"
else
    print_result 1 "Health Check"
    echo "Server may not be running. Please start the server with: npm start"
    exit 1
fi
sleep 1

# Test 2: Register New User
echo -e "\n${YELLOW}Test 2: User Registration${NC}"
echo "POST $API_URL/auth/register"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "mobile_number": "5551234567",
    "zip_code": "12345",
    "flag_sms_notification": true,
    "flag_email_notification": true
  }' -c "$COOKIE_FILE")

if [ $HAS_JQ -eq 1 ]; then
    echo "$REGISTER_RESPONSE" | jq
else
    echo "$REGISTER_RESPONSE"
fi

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "User Registration"
elif echo "$REGISTER_RESPONSE" | grep -q '"error":"Conflict"'; then
    echo -e "${YELLOW}Note: User already exists, trying login instead${NC}"

    # Login with existing user
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test@example.com",
        "password": "TestPass123"
      }' -c "$COOKIE_FILE")

    if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
        print_result 0 "User Login (existing user)"
    else
        print_result 1 "User Login"
    fi
else
    print_result 1 "User Registration"
fi
sleep 1

# Test 3: Check Session
echo -e "\n${YELLOW}Test 3: Session Check${NC}"
echo "GET $API_URL/auth/session"
SESSION_RESPONSE=$(curl -s "$API_URL/auth/session" -b "$COOKIE_FILE")

if [ $HAS_JQ -eq 1 ]; then
    echo "$SESSION_RESPONSE" | jq
else
    echo "$SESSION_RESPONSE"
fi

if echo "$SESSION_RESPONSE" | grep -q '"authenticated":true'; then
    print_result 0 "Session Check"
else
    print_result 1 "Session Check"
fi
sleep 1

# Test 4: Get User Profile
echo -e "\n${YELLOW}Test 4: Get User Profile${NC}"
echo "GET $API_URL/user/profile"
PROFILE_RESPONSE=$(curl -s "$API_URL/user/profile" -b "$COOKIE_FILE")

if [ $HAS_JQ -eq 1 ]; then
    echo "$PROFILE_RESPONSE" | jq
else
    echo "$PROFILE_RESPONSE"
fi

if echo "$PROFILE_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Get User Profile"
else
    print_result 1 "Get User Profile"
fi
sleep 1

# Test 5: Register a Lost Pet
echo -e "\n${YELLOW}Test 5: Register Lost Pet${NC}"
echo "POST $API_URL/pets/register"
PET_RESPONSE=$(curl -s -X POST "$API_URL/pets/register" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "status": "Lost",
    "pet_type": "Dog",
    "pet_name": "Buddy",
    "pet_breed": "Golden Retriever",
    "pet_description": "Friendly golden retriever, 3 years old, very friendly",
    "flag_chip": true,
    "last_seen_location": "Central Park"
  }')

if [ $HAS_JQ -eq 1 ]; then
    echo "$PET_RESPONSE" | jq
else
    echo "$PET_RESPONSE"
fi

if echo "$PET_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Register Lost Pet"
    PET_ID=$(echo "$PET_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
else
    print_result 1 "Register Lost Pet"
fi
sleep 1

# Test 6: Register a Found Pet
echo -e "\n${YELLOW}Test 6: Register Found Pet${NC}"
echo "POST $API_URL/pets/register"
FOUND_PET_RESPONSE=$(curl -s -X POST "$API_URL/pets/register" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "status": "Found",
    "pet_type": "Cat",
    "pet_name": "Unknown",
    "pet_breed": "Tabby",
    "pet_description": "Orange tabby cat found near Main Street",
    "flag_chip": false,
    "last_seen_location": "Main Street"
  }')

if [ $HAS_JQ -eq 1 ]; then
    echo "$FOUND_PET_RESPONSE" | jq
else
    echo "$FOUND_PET_RESPONSE"
fi

if echo "$FOUND_PET_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Register Found Pet"
else
    print_result 1 "Register Found Pet"
fi
sleep 1

# Test 7: Search Lost Pets
echo -e "\n${YELLOW}Test 7: Search Lost Pets${NC}"
echo "GET $API_URL/pets/lost"
LOST_PETS=$(curl -s "$API_URL/pets/lost" -b "$COOKIE_FILE")

if [ $HAS_JQ -eq 1 ]; then
    echo "$LOST_PETS" | jq
else
    echo "$LOST_PETS"
fi

if echo "$LOST_PETS" | grep -q '"success":true'; then
    print_result 0 "Search Lost Pets"
else
    print_result 1 "Search Lost Pets"
fi
sleep 1

# Test 8: Search Found Pets
echo -e "\n${YELLOW}Test 8: Search Found Pets${NC}"
echo "GET $API_URL/pets/found"
FOUND_PETS=$(curl -s "$API_URL/pets/found" -b "$COOKIE_FILE")

if [ $HAS_JQ -eq 1 ]; then
    echo "$FOUND_PETS" | jq
else
    echo "$FOUND_PETS"
fi

if echo "$FOUND_PETS" | grep -q '"success":true'; then
    print_result 0 "Search Found Pets"
else
    print_result 1 "Search Found Pets"
fi
sleep 1

# Test 9: Get Pet Details
if [ ! -z "$PET_ID" ]; then
    echo -e "\n${YELLOW}Test 9: Get Pet Details${NC}"
    echo "GET $API_URL/pets/$PET_ID"
    PET_DETAILS=$(curl -s "$API_URL/pets/$PET_ID")

    if [ $HAS_JQ -eq 1 ]; then
        echo "$PET_DETAILS" | jq
    else
        echo "$PET_DETAILS"
    fi

    if echo "$PET_DETAILS" | grep -q '"success":true'; then
        print_result 0 "Get Pet Details"
    else
        print_result 1 "Get Pet Details"
    fi
    sleep 1
fi

# Test 10: Get User's Pets
echo -e "\n${YELLOW}Test 10: Get User's Pets${NC}"
echo "GET $API_URL/user/pets"
USER_PETS=$(curl -s "$API_URL/user/pets" -b "$COOKIE_FILE")

if [ $HAS_JQ -eq 1 ]; then
    echo "$USER_PETS" | jq
else
    echo "$USER_PETS"
fi

if echo "$USER_PETS" | grep -q '"success":true'; then
    print_result 0 "Get User's Pets"
else
    print_result 1 "Get User's Pets"
fi
sleep 1

# Test 11: Search with Filters
echo -e "\n${YELLOW}Test 11: Search with Filters (by type)${NC}"
echo "GET $API_URL/pets/lost?type=Dog"
FILTERED_PETS=$(curl -s "$API_URL/pets/lost?type=Dog")

if [ $HAS_JQ -eq 1 ]; then
    echo "$FILTERED_PETS" | jq
else
    echo "$FILTERED_PETS"
fi

if echo "$FILTERED_PETS" | grep -q '"success":true'; then
    print_result 0 "Search with Filters"
else
    print_result 1 "Search with Filters"
fi
sleep 1

# Test 12: Update User Profile
echo -e "\n${YELLOW}Test 12: Update User Profile${NC}"
echo "PUT $API_URL/user/profile"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/user/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "mobile_number": "5559876543",
    "flag_sms_notification": false
  }')

if [ $HAS_JQ -eq 1 ]; then
    echo "$UPDATE_RESPONSE" | jq
else
    echo "$UPDATE_RESPONSE"
fi

if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Update User Profile"
else
    print_result 1 "Update User Profile"
fi
sleep 1

# Test 13: Test Unauthorized Access
echo -e "\n${YELLOW}Test 13: Unauthorized Access (without login)${NC}"
echo "GET $API_URL/user/profile (without cookies)"
UNAUTH_RESPONSE=$(curl -s "$API_URL/user/profile")

if [ $HAS_JQ -eq 1 ]; then
    echo "$UNAUTH_RESPONSE" | jq
else
    echo "$UNAUTH_RESPONSE"
fi

if echo "$UNAUTH_RESPONSE" | grep -q '"error":"Unauthorized"'; then
    print_result 0 "Unauthorized Access Protection"
else
    print_result 1 "Unauthorized Access Protection"
fi
sleep 1

# Test 14: Logout
echo -e "\n${YELLOW}Test 14: Logout${NC}"
echo "POST $API_URL/auth/logout"
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/logout" -b "$COOKIE_FILE")

if [ $HAS_JQ -eq 1 ]; then
    echo "$LOGOUT_RESPONSE" | jq
else
    echo "$LOGOUT_RESPONSE"
fi

if echo "$LOGOUT_RESPONSE" | grep -q '"success":true'; then
    print_result 0 "Logout"
else
    print_result 1 "Logout"
fi
sleep 1

# Test 15: Verify Session Cleared
echo -e "\n${YELLOW}Test 15: Session After Logout${NC}"
echo "GET $API_URL/auth/session"
POST_LOGOUT_SESSION=$(curl -s "$API_URL/auth/session" -b "$COOKIE_FILE")

if [ $HAS_JQ -eq 1 ]; then
    echo "$POST_LOGOUT_SESSION" | jq
else
    echo "$POST_LOGOUT_SESSION"
fi

if echo "$POST_LOGOUT_SESSION" | grep -q '"authenticated":false'; then
    print_result 0 "Session Cleared After Logout"
else
    print_result 1 "Session Cleared After Logout"
fi

# Cleanup
rm -f "$COOKIE_FILE"

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ API Testing Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "All endpoints have been tested."
echo "Check the results above for any failures."
echo ""
echo "Next steps:"
echo "  1. Review any failed tests"
echo "  2. Check server logs for errors"
echo "  3. Proceed to Phase 2 (Frontend) if all tests pass"
