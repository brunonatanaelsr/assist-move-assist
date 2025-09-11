#!/usr/bin/env bash
set -euo pipefail

echo "🔎 Verificando ausência de Supabase e Prisma…"
MATCHES=$(rg -n "(supabase|@supabase/supabase-js|PrismaClient|@prisma/client|from\\('ws'\\))" . \
  -g '!docs/**' -g '!*README*.md' -g '!**/*.md' -g '!scripts/check-conformidade.sh' -g '!scripts/check-conformity.sh' || true)
if [[ -n "$MATCHES" ]]; then
  echo "$MATCHES"
  echo "❌ Encontradas referências proibidas"; exit 1
else
  echo "✅ OK"
fi

echo "🔎 Conferindo dependências proibidas…"
DEPS=$(jq -r '.dependencies,.devDependencies' package.json backend/package.json 2>/dev/null | rg -n "supabase|prisma|@prisma/client|\\bws\\b" || true)
if [[ -n "$DEPS" ]]; then
  echo "$DEPS"
  echo "❌ Dependências proibidas"; exit 1
else
  echo "✅ OK"
fi

echo "✅ Conformidade alcançada"
