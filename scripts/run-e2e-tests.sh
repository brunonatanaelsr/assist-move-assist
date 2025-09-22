#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)
BACKEND_DIR="$ROOT_DIR/backend"

API_HOST="127.0.0.1"
API_PORT="3000"
API_URL="http://${API_HOST}:${API_PORT}"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Função para limpar ambiente
cleanup() {
    echo -e "${YELLOW}[e2e-local] Limpando ambiente...${NC}"
    pkill -f "tsx watch" || true
    brew services stop redis || true
    brew services stop postgresql@14 || true
}

# Registrar cleanup ao sair
trap cleanup EXIT

echo -e "${YELLOW}[e2e-local] Iniciando serviços...${NC}"

# Iniciar PostgreSQL
echo -e "${YELLOW}[e2e-local] Iniciando PostgreSQL...${NC}"
brew services start postgresql@14
sleep 2

# Criar banco de teste
echo -e "${YELLOW}[e2e-local] Configurando banco de dados de teste...${NC}"
dropdb --if-exists movemarias_test
createdb movemarias_test

# Configurar extensões e schema
psql -d movemarias_test -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# Executar migrações
echo -e "${YELLOW}[e2e-local] Executando migrações...${NC}"
cd "$BACKEND_DIR/src/database/migrations"
for f in $(ls -v *.sql); do
    echo "Executando $f..."
    psql -d movemarias_test -f "$f"
done

# Criar usuário de teste
echo -e "${YELLOW}[e2e-local] Criando usuário de teste...${NC}"
psql -d movemarias_test -c "INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) VALUES ('Usuário de Teste', 'test@move.com', crypt('test123', gen_salt('bf')), 'assist_user', true);"

# Iniciar Redis
echo -e "${YELLOW}[e2e-local] Iniciando Redis...${NC}"
brew services start redis
sleep 2

# Configurar variáveis de ambiente para teste
echo -e "${YELLOW}[e2e-local] Configurando ambiente de teste...${NC}"
cat > "$BACKEND_DIR/.env.test" << EOL
NODE_ENV=test
PORT=3000
JWT_SECRET=test_secret_key_123
CORS_ORIGIN=http://localhost:5173

REDIS_HOST=localhost
REDIS_PORT=6379

DATABASE_URL=postgresql://postgres@localhost:5432/movemarias_test?schema=public
EOL

# Iniciar backend em modo teste
echo -e "${YELLOW}[e2e-local] Iniciando backend em modo teste...${NC}"
cd "$BACKEND_DIR"
NODE_ENV=test npm run dev &
BACKEND_PID=$!

# Aguardar backend iniciar
echo -e "${YELLOW}[e2e-local] Aguardando backend iniciar...${NC}"
until curl -s "$API_URL/health" > /dev/null; do
    echo "Aguardando API..."
    sleep 1
done

echo -e "${GREEN}[e2e-local] Ambiente de teste pronto!${NC}"
echo -e "${YELLOW}[e2e-local] Executando testes E2E...${NC}"

# Executar testes
# Variáveis compartilhadas com Playwright (global-setup)
export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=5432
export POSTGRES_DB=movemarias_test
export POSTGRES_USER=postgres
unset POSTGRES_PASSWORD

cd "$ROOT_DIR"
npm run test:e2e

# Capturar código de saída dos testes
TEST_EXIT_CODE=$?

# Limpar ambiente
cleanup

exit $TEST_EXIT_CODE
