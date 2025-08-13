#!/bin/bash

# Script de Verificação Pré-Deploy
# Move Marias - Sistema de Gestão

echo "🔍 VERIFICAÇÃO PRÉ-DEPLOY - Move Marias"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
CHECKS_PASSED=0
CHECKS_FAILED=0
TOTAL_CHECKS=0

# Função para log
log_check() {
    local status=$1
    local message=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "✅ ${GREEN}PASS${NC}: $message"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    elif [ "$status" = "FAIL" ]; then
        echo -e "❌ ${RED}FAIL${NC}: $message"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "⚠️  ${YELLOW}WARN${NC}: $message"
    else
        echo -e "ℹ️  ${BLUE}INFO${NC}: $message"
    fi
}

# 1. Verificar Node.js e npm
echo "🔧 Verificando dependências do sistema..."
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    log_check "PASS" "Node.js $NODE_VERSION e npm $NPM_VERSION instalados"
    
    # Verificar versão mínima do Node.js
    if node -pe "process.versions.node" | awk -F. '$1>=18{exit 0}{exit 1}'; then
        log_check "PASS" "Versão do Node.js é compatível (>=18)"
    else
        log_check "FAIL" "Versão do Node.js incompatível (precisa >=18)"
    fi
else
    log_check "FAIL" "Node.js ou npm não encontrados"
fi

# 2. Verificar arquivos de configuração
echo ""
echo "📁 Verificando arquivos de configuração..."

REQUIRED_FILES=(
    "package.json"
    "backend/package.json"
    ".env.example"
    ".env.prod"
    "vite.config.ts"
    "backend/app-production.js"
    "config/nginx-ssl-production.conf"
    "scripts/deploy-ubuntu-24.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_check "PASS" "Arquivo $file existe"
    else
        log_check "FAIL" "Arquivo $file AUSENTE"
    fi
done

# 3. Verificar dependências do projeto
echo ""
echo "📦 Verificando dependências do projeto..."

if [ -f "package.json" ]; then
    npm list --production --depth=0 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_check "PASS" "Dependências do frontend instaladas"
    else
        log_check "WARN" "Algumas dependências podem estar faltando no frontend"
        npm install
    fi
fi

if [ -f "backend/package.json" ]; then
    cd backend
    npm list --production --depth=0 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_check "PASS" "Dependências do backend instaladas"
    else
        log_check "WARN" "Algumas dependências podem estar faltando no backend"
        npm install
    fi
    cd ..
fi

# 4. Verificar variáveis de ambiente
echo ""
echo "🔐 Verificando configurações de ambiente..."

if [ -f ".env.prod" ]; then
    log_check "PASS" "Arquivo .env.prod existe"
    
    # Verificar variáveis críticas
    REQUIRED_VARS=("POSTGRES_PASSWORD" "JWT_SECRET" "ADMIN_EMAIL" "CORS_ORIGIN")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env.prod; then
            log_check "PASS" "Variável $var definida em .env.prod"
        else
            log_check "FAIL" "Variável $var AUSENTE em .env.prod"
        fi
    done
else
    log_check "FAIL" "Arquivo .env.prod não encontrado"
fi

# 5. Testar build do frontend
echo ""
echo "🏗️ Testando build do frontend..."

BUILD_OUTPUT=$(npm run build 2>&1)
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    log_check "PASS" "Build do frontend concluído com sucesso"
    
    # Verificar se os arquivos de build foram criados
    if [ -d "build" ] || [ -d "dist" ]; then
        BUILD_DIR=$([ -d "build" ] && echo "build" || echo "dist")
        BUILD_SIZE=$(du -sh $BUILD_DIR 2>/dev/null | cut -f1)
        log_check "PASS" "Diretório de build criado ($BUILD_SIZE)"
        
        # Verificar tamanho do bundle
        if find $BUILD_DIR -name "*.js" -size +2M | grep -q .; then
            log_check "WARN" "Bundle JavaScript muito grande (>2MB)"
        else
            log_check "PASS" "Tamanho do bundle está adequado"
        fi
    else
        log_check "FAIL" "Diretório de build não foi criado"
    fi
else
    log_check "FAIL" "Build do frontend falhou"
    echo "Erro do build:"
    echo "$BUILD_OUTPUT" | tail -10
fi

# 6. Testar backend
echo ""
echo "🔧 Testando backend..."

# Verificar se o backend pode iniciar
timeout 15s node backend/app-production.js &
BACKEND_PID=$!
sleep 5

# Testar health check
if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    log_check "PASS" "Backend iniciou e responde ao health check"
    
    # Testar API básica
    if curl -sf http://localhost:3001/api/beneficiarias > /dev/null 2>&1; then
        log_check "PASS" "API de beneficiárias respondendo"
    else
        log_check "FAIL" "API de beneficiárias não respondendo"
    fi
else
    log_check "FAIL" "Backend não responde ao health check"
fi

# Limpar processo do backend
kill $BACKEND_PID 2>/dev/null
wait $BACKEND_PID 2>/dev/null

# 7. Verificar scripts de deploy
echo ""
echo "🚀 Verificando scripts de deploy..."

DEPLOY_SCRIPTS=("scripts/deploy-ubuntu-24.sh" "scripts/optimize-images.sh")

for script in "${DEPLOY_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            log_check "PASS" "Script $script é executável"
        else
            log_check "WARN" "Script $script não é executável (fixando...)"
            chmod +x "$script"
        fi
    else
        log_check "FAIL" "Script $script não encontrado"
    fi
done

# 8. Verificar configuração de segurança
echo ""
echo "🛡️ Verificando configurações de segurança..."

# Verificar se há credenciais hardcoded
if grep -r "password.*=" --include="*.js" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".env" | grep -q "123\|admin\|test"; then
    log_check "WARN" "Possíveis credenciais hardcoded encontradas no código"
else
    log_check "PASS" "Nenhuma credencial hardcoded óbvia encontrada"
fi

# Verificar configuração CORS
if grep -q "origin.*localhost" backend/app-production.js; then
    log_check "WARN" "CORS permite localhost (ok para desenvolvimento)"
else
    log_check "PASS" "CORS configurado para produção"
fi

# 9. Verificar otimizações
echo ""
echo "⚡ Verificando otimizações..."

# Verificar se há otimizações no código React
REACT_OPTIMIZATIONS=$(grep -r "useMemo\|useCallback\|React.memo" --include="*.tsx" src/ | wc -l)
if [ $REACT_OPTIMIZATIONS -gt 5 ]; then
    log_check "PASS" "Otimizações React encontradas ($REACT_OPTIMIZATIONS)"
else
    log_check "WARN" "Poucas otimizações React encontradas"
fi

# Verificar configuração do Vite
if grep -q "manualChunks" vite.config.ts; then
    log_check "PASS" "Code splitting configurado no Vite"
else
    log_check "WARN" "Code splitting não configurado"
fi

# 10. Resumo final
echo ""
echo "📊 RESUMO DA VERIFICAÇÃO"
echo "========================"
echo -e "✅ Checks aprovados: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "❌ Checks falharam: ${RED}$CHECKS_FAILED${NC}"
echo -e "📋 Total de checks: $TOTAL_CHECKS"

PASS_PERCENTAGE=$((CHECKS_PASSED * 100 / TOTAL_CHECKS))
echo -e "📈 Taxa de sucesso: $PASS_PERCENTAGE%"

echo ""
if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "🎉 ${GREEN}SISTEMA PRONTO PARA DEPLOY!${NC}"
    echo "Você pode prosseguir com o deploy em produção."
    exit 0
elif [ $PASS_PERCENTAGE -ge 80 ]; then
    echo -e "⚠️  ${YELLOW}SISTEMA QUASE PRONTO${NC}"
    echo "Há algumas questões menores que devem ser resolvidas antes do deploy."
    exit 1
else
    echo -e "❌ ${RED}SISTEMA NÃO ESTÁ PRONTO${NC}"
    echo "Há problemas críticos que devem ser corrigidos antes do deploy."
    exit 2
fi
