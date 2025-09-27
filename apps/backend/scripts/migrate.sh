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

# Ordem prioritária (mantém compatibilidade com migrate-node.js)
PRIORITY_ORDER=(
  "001_criar_usuarios.sql"
  "002_criar_beneficiarias.sql"
  # projetos precisa existir antes de oficinas/participacoes
  "005_criar_projetos.sql"
  "003_criar_oficinas.sql"
  "006_criar_participacoes.sql"
)

# Montar lista final de migrações: primeiro as prioritárias, depois o restante ordenado
declare -a FILES_TO_RUN=()
declare -A PRIORITY_SET=()

mapfile -t ALL_MIGRATIONS < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort)

for priority_file in "${PRIORITY_ORDER[@]}"; do
  if [ -f "$MIGRATIONS_DIR/$priority_file" ]; then
    FILES_TO_RUN+=("$priority_file")
    PRIORITY_SET["$priority_file"]=1
  fi
done

for file in "${ALL_MIGRATIONS[@]}"; do
  if [ -z "${PRIORITY_SET[$file]}" ]; then
    FILES_TO_RUN+=("$file")
  fi
done

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

# Compatibilidade: algumas migrações antigas podem referenciar "migration_log"
PGPASSWORD=$POSTGRES_PASSWORD psql \
  -h $POSTGRES_HOST \
  -p $POSTGRES_PORT \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  -c "
    CREATE TABLE IF NOT EXISTS migration_log (
      id SERIAL PRIMARY KEY
    );
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='migration_log' AND column_name='migration_name'
      ) THEN
        ALTER TABLE migration_log ADD COLUMN migration_name VARCHAR(255);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_migration_log_migration_name'
      ) THEN
        CREATE UNIQUE INDEX uq_migration_log_migration_name ON migration_log (migration_name);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='migration_log' AND column_name='executed_at'
      ) THEN
        ALTER TABLE migration_log ADD COLUMN executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='migration_log' AND column_name='description'
      ) THEN
        ALTER TABLE migration_log ADD COLUMN description TEXT;
      END IF;
    END $$;
  "

# Executar todas as migrações respeitando a ordem prioritária
for filename in "${FILES_TO_RUN[@]}"; do

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

# Rodar seed inicial para criar usuário padrão e dados base
echo -e "${YELLOW}Executando seed inicial...${NC}"
node scripts/create-initial-data.js || true
