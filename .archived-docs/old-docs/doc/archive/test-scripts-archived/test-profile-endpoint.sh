#!/bin/bash

# Test script for /api/user/profile endpoint
echo "Testing /api/user/profile endpoint..."

# Test 1: Without authentication (should return 401)
echo -e "\nTest 1: Without authentication"
curl -s -X GET http://localhost:3000/api/user/profile | jq . 2>/dev/null || curl -s -X GET http://localhost:3000/api/user/profile

# Test 2: With invalid Bearer Token (should return 401)
echo -e "\nTest 2: With invalid Bearer Token"
curl -s -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer invalid-token-here" | jq . 2>/dev/null || curl -s -X GET http://localhost:3000/api/user/profile -H "Authorization: Bearer invalid-token-here"

echo -e "\nNote: To test with valid authentication, you need to:"
echo "1. Login via /api/auth/login to get a session cookie"
echo "2. Use the session cookie in subsequent requests"
echo "3. Or update the login endpoint to return JWT tokens for Bearer Token authentication"