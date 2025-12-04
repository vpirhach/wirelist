#!/bin/bash

# Test JWT Token Compatibility between Java and Node.js backends

echo "🔐 JWT Token Compatibility Test"
echo "================================"
echo ""

# Step 1: Get JWT token from Java backend
echo "1️⃣  Getting JWT token from Java backend (port 3001)..."
RESPONSE=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123!"
  }')

# Extract token
TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token from Java backend"
  echo "   Make sure Java backend is running on port 3001"
  exit 1
fi

echo "✅ Token received from Java backend"
echo ""

# Step 2: Test Node.js backend with Java token
echo "2️⃣  Testing Node.js backend (port 3002) with Java token..."
NODE_RESPONSE=$(curl -s -X GET "http://localhost:3002/wires?page=0&size=5" \
  -H "Authorization: Bearer $TOKEN")

if echo "$NODE_RESPONSE" | grep -q "content"; then
  echo "✅ Node.js backend accepted Java token!"
  echo ""
  echo "📊 Sample response:"
  echo "$NODE_RESPONSE" | head -n 10
  echo ""
  echo "✅ JWT COMPATIBILITY VERIFIED!"
  echo "   Tokens are compatible between Java and Node.js backends"
else
  echo "❌ Node.js backend rejected Java token"
  echo "   Response: $NODE_RESPONSE"
  exit 1
fi

echo ""
echo "🎉 Success! Both backends can use the same JWT tokens"
