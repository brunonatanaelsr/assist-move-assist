#!/usr/bin/env bash
set -euo pipefail

echo "🔎 Verificando ausência de Supabase e Prisma…"
rg -n "(supabase|@supabase/supabase-js|createClient|PrismaClient|@prisma/client|from\\('ws'\\))" . && { echo "❌ Encontradas referências proibidas"; exit 1; } || echo "✅ OK"

echo "🔎 Conferindo dependências proibidas…"
jq -r '.dependencies,.devDependencies' package.json backend/package.json 2>/dev/null | rg -n "supabase|prisma|@prisma/client|\\bws\\b" && { echo "❌ Dependências proibidas"; exit 1; } || echo "✅ OK"

echo "✅ Conformidade alcançada"
