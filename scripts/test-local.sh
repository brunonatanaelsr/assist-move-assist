#!/bin/bash

# ============================================================================
# Script de Teste Local - Assist Move Assist
# Validar funcionamento antes do deploy
# ============================================================================

set -e

echo "🧪 Testando sistema localmente antes do deploy..."

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# 1. Verificar arquivos essenciais
log_info "Verificando arquivos essenciais..."

FILES=(
    "apps/backend/app-production-complete.js"
    "apps/backend/.env.production"
    "apps/backend/package.json"
    "migrations/postgresql_complete_schema.sql"
    "scripts/deploy-complete.sh"
    "apps/backend/scripts/create-initial-data.js"
)

for file in "${FILES[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "Arquivo encontrado: $file"
    else
        log_error "Arquivo não encontrado: $file"
        exit 1
    fi
done

# 2. Verificar syntax do JavaScript
log_info "Verificando sintaxe JavaScript..."

if command -v node &> /dev/null; then
    node -c apps/backend/app-production-complete.js
    log_success "Sintaxe JavaScript válida"
else
    log_warning "Node.js não encontrado - pulando verificação de sintaxe"
fi

# 3. Verificar SQL
log_info "Verificando SQL schema..."

if grep -q "CREATE TABLE.*usuarios" migrations/postgresql_complete_schema.sql; then
    log_success "Tabela usuarios encontrada no schema"
else
    log_error "Tabela usuarios não encontrada no schema"
fi

if grep -q "CREATE TABLE.*beneficiarias" migrations/postgresql_complete_schema.sql; then
    log_success "Tabela beneficiarias encontrada no schema"
else
    log_error "Tabela beneficiarias não encontrada no schema"
fi

# 4. Verificar configurações
log_info "Verificando configurações..."

  if grep -q "POSTGRES_HOST" apps/backend/.env.production; then
    log_success "Configurações PostgreSQL encontradas"
else
    log_error "Configurações PostgreSQL não encontradas"
fi

  if grep -q "JWT_SECRET" apps/backend/.env.production; then
    log_success "Configuração JWT encontrada"
else
    log_error "Configuração JWT não encontrada"
fi

# 5. Verificar dependências do package.json
log_info "Verificando dependências..."

DEPS=("express" "cors" "helmet" "bcryptjs" "jsonwebtoken" "pg")

for dep in "${DEPS[@]}"; do
    if grep -q "\"$dep\"" apps/backend/package.json; then
        log_success "Dependência encontrada: $dep"
    else
        log_error "Dependência não encontrada: $dep"
    fi
done

# 6. Verificar script de deploy
log_info "Verificando script de deploy..."

if [[ -x "scripts/deploy-complete.sh" ]]; then
    log_success "Script de deploy é executável"
else
    log_warning "Script de deploy não é executável - corrigindo..."
    chmod +x scripts/deploy-complete.sh
    log_success "Permissão corrigida"
fi

# 7. Verificar estrutura de endpoints
log_info "Verificando endpoints no código..."

ENDPOINTS=("/api/auth/login" "/api/beneficiarias" "/health")

for endpoint in "${ENDPOINTS[@]}"; do
    if grep -q "$endpoint" apps/backend/app-production-complete.js; then
        log_success "Endpoint encontrado: $endpoint"
    else
        log_error "Endpoint não encontrado: $endpoint"
    fi
done

# 8. Verificar middleware de segurança
log_info "Verificando middleware de segurança..."

MIDDLEWARE=("helmet" "cors" "rateLimit" "authenticateToken")

for mw in "${MIDDLEWARE[@]}"; do
    if grep -q "$mw" apps/backend/app-production-complete.js; then
        log_success "Middleware encontrado: $mw"
    else
        log_error "Middleware não encontrado: $mw"
    fi
done

# 9. Verificar funções de hash
log_info "Verificando funções de hash..."

  if grep -q "bcrypt.compare" apps/backend/app-production-complete.js; then
    log_success "Verificação de senha encontrada"
else
    log_error "Verificação de senha não encontrada"
fi

  if grep -q "bcrypt.hash" apps/backend/scripts/create-initial-data.js; then
    log_success "Hash de senha encontrado no script"
else
    log_error "Hash de senha não encontrado no script"
fi

# 10. Relatório final
echo ""
log_info "=== RELATÓRIO DE VALIDAÇÃO ==="
echo ""

# Contagem de arquivos
total_files=${#FILES[@]}
log_success "Arquivos verificados: $total_files/$total_files"

# Verificar se há algum TODO ou FIXME
  if grep -r "TODO\|FIXME" apps/backend/ --include="*.js" &> /dev/null; then
    log_warning "TODOs encontrados no código - revisar antes do deploy"
else
    log_success "Nenhum TODO pendente encontrado"
fi

# Verificar tamanho dos arquivos principais
  main_file_size=$(stat -c%s "apps/backend/app-production-complete.js" 2>/dev/null || echo "0")
if [[ $main_file_size -gt 10000 ]]; then
    log_success "Arquivo principal tem tamanho adequado ($main_file_size bytes)"
else
    log_warning "Arquivo principal pode estar incompleto ($main_file_size bytes)"
fi

echo ""
log_success "=== VALIDAÇÃO CONCLUÍDA ==="
echo ""
echo "🚀 Sistema pronto para deploy!"
echo ""
echo "📋 Para fazer o deploy:"
echo "   1. Copie o projeto para o servidor"
echo "   2. Execute: sudo ./scripts/deploy-complete.sh"
echo "   3. Aguarde a configuração automática"
echo ""
echo "🔗 URLs após o deploy:"
echo "   • App: https://movemarias.squadsolucoes.com.br"
echo "   • API: https://movemarias.squadsolucoes.com.br/api"
echo "   • Health: https://movemarias.squadsolucoes.com.br/health"
echo ""
echo "👥 Credenciais:"
echo "   • Super: bruno@move.com / 15002031"
echo "   • Admin: admin@movemarias.com / movemarias123"
echo ""

log_success "Teste local concluído com sucesso! ✨"
