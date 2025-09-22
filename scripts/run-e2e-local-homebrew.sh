#!/usr/bin/env bash

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)
E2E_LOG="$ROOT_DIR/tests/e2e.log"

# Configurar banco de testes
echo -e "${YELLOW}[e2e-local] Configurando banco de testes...${NC}"
dropdb --if-exists movemarias_test
createdb movemarias_test

# Configurar extensões PostgreSQL
echo -e "${YELLOW}[e2e-local] Configurando extensões PostgreSQL...${NC}"
psql -d movemarias_test -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# Executar migrações
echo -e "${YELLOW}[e2e-local] Executando migrações...${NC}"
cd "$ROOT_DIR/backend/src/database/migrations"
for f in $(ls -v *.sql); do
    echo "Executando $f..."
    psql -d movemarias_test -f "$f"
done

# Configurar variáveis de ambiente para teste
echo -e "${YELLOW}[e2e-local] Configurando ambiente de teste...${NC}"
cat > "$ROOT_DIR/backend/.env.test" << EOL
NODE_ENV=test
PORT=3000
JWT_SECRET=test_secret_key_123
CORS_ORIGIN=http://localhost:5173
REDIS_HOST=localhost
REDIS_PORT=6379
RATE_LIMIT_DISABLE=true
DATABASE_URL=postgresql://postgres@localhost:5432/movemarias_test?schema=public
EOL

# Criar usuário de teste
echo -e "${YELLOW}[e2e-local] Criando usuário de teste...${NC}"
psql -d movemarias_test -c "INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) VALUES ('Test User', 'test@move.com', crypt('test123', gen_salt('bf')), 'assist_user', true);"

# Executar testes E2E
echo -e "${YELLOW}[e2e-local] Executando testes E2E...${NC}"
cd "$ROOT_DIR"
npm run test:e2e
