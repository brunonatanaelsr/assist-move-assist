#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Carregar variáveis de ambiente
if [ -f .env ]; then
  source .env
else
  echo -e "${RED}Arquivo .env não encontrado${NC}"
  exit 1
fi

# Verificar variáveis necessárias
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_PORT" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
  echo -e "${RED}Variáveis de ambiente do PostgreSQL não configuradas${NC}"
  exit 1
fi

# Fallback quando psql não está disponível
if ! command -v psql >/dev/null 2>&1; then
  echo -e "${YELLOW}psql não encontrado. Usando runner Node (scripts/migrate-node.js).${NC}"
  node scripts/migrate-node.js
  exit $?
fi

# Diretório das migrações
MIGRATIONS_DIR="src/database/migrations"

# Função para executar um arquivo SQL
run_migration() {
  local file=$1
  echo -e "${YELLOW}Executando migração: $file${NC}"
  
  PGPASSWORD=$POSTGRES_PASSWORD psql \
    -h $POSTGRES_HOST \
    -p $POSTGRES_PORT \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    -f "$MIGRATIONS_DIR/$file" 2>&1

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Migração concluída: $file${NC}"
  else
    echo -e "${RED}Erro na migração: $file${NC}"
    exit 1
  fi
}

# Criar tabela de controle de migrações se não existir
echo -e "${YELLOW}Verificando tabela de migrações...${NC}"
PGPASSWORD=$POSTGRES_PASSWORD psql \
  -h $POSTGRES_HOST \
  -p $POSTGRES_PORT \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  -c "CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );"

# Executar todas as migrações em ordem alfabética
for file in $(ls $MIGRATIONS_DIR/*.sql | sort); do
  filename=$(basename "$file")
  
  # Verificar se a migração já foi aplicada
  already_applied=$(PGPASSWORD=$POSTGRES_PASSWORD psql \
    -h $POSTGRES_HOST \
    -p $POSTGRES_PORT \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    -tAc "SELECT COUNT(*) FROM migrations WHERE name = '$filename'")

  if [ "$already_applied" -eq "0" ]; then
    run_migration "$filename"
    
    # Registrar migração como aplicada
    PGPASSWORD=$POSTGRES_PASSWORD psql \
      -h $POSTGRES_HOST \
      -p $POSTGRES_PORT \
      -U $POSTGRES_USER \
      -d $POSTGRES_DB \
      -c "INSERT INTO migrations (name) VALUES ('$filename');"
  else
    echo -e "${GREEN}Migração já aplicada: $filename${NC}"
  fi
done

echo -e "${GREEN}Todas as migrações foram aplicadas com sucesso${NC}"
