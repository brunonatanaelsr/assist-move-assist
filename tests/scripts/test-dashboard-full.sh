#!/bin/bash

# Login and get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bruno@move.com","password":"15002031"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"//')

echo "=== DASHBOARD COMPLETO ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/dashboard | jq '.'
echo
echo

echo "=== STATS ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/dashboard/stats | jq '.'
echo
