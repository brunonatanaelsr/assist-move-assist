#!/bin/bash

# Login first
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bruno@move.com","password":"15002031"}')

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"//')

echo "Token obtained: $TOKEN"
echo

# Test dashboard
echo "Testing dashboard endpoint:"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/dashboard
echo
echo

# Test stats
echo "Testing stats endpoint:"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/dashboard/stats
echo
