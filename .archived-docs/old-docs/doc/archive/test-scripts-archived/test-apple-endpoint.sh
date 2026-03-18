#!/bin/bash

# Test script for Apple OAuth endpoint
# This script tests the basic functionality of the Apple token validation endpoint

echo "Testing Apple OAuth endpoint..."
echo "================================"

# Test 1: Missing identity token
echo -e "\nTest 1: Missing identity token"
curl -X POST http://localhost:3000/api/auth/oauth/apple \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n"

# Test 2: Invalid JWT token
echo -e "\n\nTest 2: Invalid JWT token"
curl -X POST http://localhost:3000/api/auth/oauth/apple \
  -H "Content-Type: application/json" \
  -d '{"identityToken":"invalid-token"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Test 3: Valid JWT format but non-Apple token
echo -e "\n\nTest 3: Valid JWT format (non-Apple)"
curl -X POST http://localhost:3000/api/auth/oauth/apple \
  -H "Content-Type: application/json" \
  -d '{"identityToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciJ9.invalid-signature"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\nNote: To test with a real Apple ID token, you would need:"
echo "1. A real Apple ID token from Apple Sign-In"
echo "2. The token would need to be validated with Apple's public keys"
echo "3. This endpoint currently only decodes the token (no signature verification)"