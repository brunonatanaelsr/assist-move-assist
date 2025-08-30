#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000/api}"
EMAIL="${EMAIL:-bruno@move.com}"
PASSWORD="${PASSWORD:-15002031}"

echo "🔐 Login ${EMAIL} @ ${API_BASE} ..." >&2
LOGIN=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo "$LOGIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
if [[ -z "${TOKEN}" ]]; then
  echo "❌ Falha no login" >&2
  echo "$LOGIN" | jq . || echo "$LOGIN"
  exit 1
fi
echo "✅ Login OK" >&2

AUTHH="Authorization: Bearer ${TOKEN}"

echo "👥 Buscando usuários para adicionar como membro..." >&2
USERS=$(curl -s "${API_BASE}/mensagens/usuarios" -H "$AUTHH")
ADMIN_ID=$(echo "$USERS" | sed -n 's/.*"email":"admin@movemarias.com"[^}]*"id":\([0-9]*\).*/\1/p' | head -n1)
if [[ -z "${ADMIN_ID}" ]]; then
  ADMIN_ID=$(echo "$USERS" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -n1)
fi
echo "➡️  ADMIN_ID=${ADMIN_ID}" >&2

echo "📦 Criando grupo..." >&2
GROUP=$(curl -s -X POST "${API_BASE}/grupos" -H "$AUTHH" -H 'Content-Type: application/json' \
  -d '{"nome":"Time QA","descricao":"Grupo criado pelo smoke"}')
GROUP_ID=$(echo "$GROUP" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -n1)
if [[ -z "${GROUP_ID}" ]]; then
  echo "❌ Falha ao criar grupo" >&2
  echo "$GROUP" | jq . || echo "$GROUP"
  exit 1
fi
echo "✅ Grupo criado: ${GROUP_ID}" >&2

echo "➕ Adicionando membro ${ADMIN_ID}..." >&2
ADD=$(curl -s -X POST "${API_BASE}/grupos/${GROUP_ID}/membros" -H "$AUTHH" -H 'Content-Type: application/json' \
  -d "{\"usuario_id\":${ADMIN_ID},\"papel\":\"membro\"}")
echo "$ADD" > /dev/null

echo "📃 Listando grupos do usuário..." >&2
curl -s "${API_BASE}/grupos" -H "$AUTHH" | jq . || true

echo "👤 Membros do grupo ${GROUP_ID}..." >&2
curl -s "${API_BASE}/grupos/${GROUP_ID}/membros" -H "$AUTHH" | jq . || true

echo "💬 Mensagens do grupo ${GROUP_ID}..." >&2
curl -s "${API_BASE}/grupos/${GROUP_ID}/mensagens" -H "$AUTHH" | jq . || true

echo "✅ Smoke de grupos finalizado." >&2

