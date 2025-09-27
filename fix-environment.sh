#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "🔧 Corrigindo ambiente da aplicação..."

# 1. Parar tudo que está rodando
if command -v docker-compose >/dev/null 2>&1; then
  docker-compose down || true
else
  echo "⚠️ docker-compose não encontrado; pulando parada de containers Docker."
fi

pkill -f "npm|node|tsx" >/dev/null 2>&1 && echo "✅ Processos Node encerrados" || echo "ℹ️ Nenhum processo Node/TSX em execução"

# 2. Corrigir variáveis de ambiente do backend
cat > apps/backend/.env <<'ENVEOF'
NODE_ENV=development
PORT=4000

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=assist_move
POSTGRES_USER=assist_user
POSTGRES_PASSWORD=assist_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Email (opcional para desenvolvimento)
EMAIL_FROM=noreply@assist.com
EMAIL_HOST=localhost
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=

# Upload
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760

# CORS
CORS_ORIGIN=http://localhost:5173
ENVEOF

echo "✅ apps/backend/.env atualizado"

# 3. Corrigir docker-compose.yml
cat > docker-compose.yml <<'DOCKEREOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: assist_postgres
    environment:
      POSTGRES_DB: assist_move
      POSTGRES_USER: assist_user
      POSTGRES_PASSWORD: assist_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U assist_user -d assist_move"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: assist_redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
DOCKEREOF

echo "✅ docker-compose.yml atualizado"

# 4. Garantir que package.json existe no backend
if [ ! -f apps/backend/package.json ]; then
  echo "❌ package.json não encontrado no backend!"
  exit 1
fi

# 5. Limpar node_modules e locks
if [ -d apps/backend/node_modules ]; then
  rm -rf apps/backend/node_modules
fi
rm -f apps/backend/package-lock.json

echo "🧹 Limpando node_modules na raiz..."
if [ -d node_modules ]; then
  rm -rf node_modules
fi
rm -f package-lock.json

chmod +x "$REPO_ROOT/fix-environment.sh"

cat <<'MSG'
✅ Ambiente corrigido! Agora executar:
1. docker-compose up -d postgres redis
2. cd apps/backend && npm install && npm run dev
3. Em outro terminal: npm install
MSG
