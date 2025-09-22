#!/bin/bash

# Script de inicialização do ambiente de desenvolvimento
# Uso: ./setup-dev.sh

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Iniciando setup do ambiente Move Marias ===${NC}"

# Verificar dependências
echo -e "\n${YELLOW}Verificando dependências...${NC}"
command -v psql >/dev/null 2>&1 || { echo -e "${RED}PostgreSQL não encontrado. Instale-o primeiro.${NC}" >&2; exit 1; }
command -v redis-cli >/dev/null 2>&1 || { echo -e "${RED}Redis não encontrado. Instale-o primeiro.${NC}" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js não encontrado. Instale-o primeiro.${NC}" >&2; exit 1; }

# Verificar serviços
echo -e "\n${YELLOW}Verificando serviços...${NC}"
if brew services list | grep postgresql@14 | grep started >/dev/null; then
    echo -e "${GREEN}PostgreSQL está rodando${NC}"
else
    echo -e "${RED}PostgreSQL não está rodando. Iniciando...${NC}"
    brew services start postgresql@14
fi

if brew services list | grep redis | grep started >/dev/null; then
    echo -e "${GREEN}Redis está rodando${NC}"
else
    echo -e "${RED}Redis não está rodando. Iniciando...${NC}"
    brew services start redis
fi

# Criar banco de dados
echo -e "\n${YELLOW}Configurando banco de dados...${NC}"
createdb movemarias 2>/dev/null || echo -e "${YELLOW}Banco de dados já existe${NC}"
createuser -s postgres 2>/dev/null || echo -e "${YELLOW}Usuário postgres já existe${NC}"

# Instalar extensões
echo -e "\n${YELLOW}Instalando extensões PostgreSQL...${NC}"
psql -d movemarias -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# Executar migrações
echo -e "\n${YELLOW}Executando migrações...${NC}"
cd apps/backend/src/database/migrations
for f in $(ls -v *.sql); do
    echo "Executando $f..."
    psql -d movemarias -f "$f"
done

# Criar usuário inicial
echo -e "\n${YELLOW}Criando usuário superadmin...${NC}"
psql -d movemarias -c "INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) VALUES ('Superadmin', 'superadmin@example.com', crypt('123456', gen_salt('bf')), 'superadmin', true) ON CONFLICT (email) DO NOTHING;"

# Configurar ambiente
echo -e "\n${YELLOW}Configurando variáveis de ambiente...${NC}"
cat > apps/backend/.env << EOL
# Ambiente
NODE_ENV=development

# Configurações do servidor
PORT=3000
JWT_SECRET=development_secret_key_123456
CORS_ORIGIN=http://localhost:5173

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL
DATABASE_URL=postgresql://postgres@localhost:5432/movemarias?schema=public
EOL

# Instalar dependências
echo -e "\n${YELLOW}Instalando dependências do backend...${NC}"
cd apps/backend
npm install

echo -e "\n${YELLOW}Instalando dependências do frontend...${NC}"
cd ../frontend
npm install

echo -e "\n${GREEN}=== Setup concluído com sucesso! ===${NC}"
echo -e "\nPara iniciar o sistema:"
echo -e "1. Em um terminal: ${YELLOW}cd apps/backend && npm run dev${NC}"
echo -e "2. Em outro terminal: ${YELLOW}cd apps/frontend && npm run dev${NC}"
echo -e "\nCredenciais iniciais:"
echo -e "Email: ${GREEN}superadmin@example.com${NC}"
echo -e "Senha: ${GREEN}123456${NC}"
