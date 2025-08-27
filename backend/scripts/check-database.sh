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

echo -e "${YELLOW}Verificando conexão com o PostgreSQL...${NC}"

# Tentar conectar ao banco de dados
PGPASSWORD=$POSTGRES_PASSWORD psql \
  -h $POSTGRES_HOST \
  -p $POSTGRES_PORT \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Conexão estabelecida com sucesso!${NC}"
  
  # Mostrar informações do banco de dados
  echo -e "\n${YELLOW}Versão do PostgreSQL:${NC}"
  PGPASSWORD=$POSTGRES_PASSWORD psql \
    -h $POSTGRES_HOST \
    -p $POSTGRES_PORT \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    -c "SELECT version();"
  
  echo -e "\n${YELLOW}Tamanho do banco de dados:${NC}"
  PGPASSWORD=$POSTGRES_PASSWORD psql \
    -h $POSTGRES_HOST \
    -p $POSTGRES_PORT \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));"
  
  echo -e "\n${YELLOW}Número de tabelas:${NC}"
  PGPASSWORD=$POSTGRES_PASSWORD psql \
    -h $POSTGRES_HOST \
    -p $POSTGRES_PORT \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    -c "SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';"
  
  echo -e "\n${YELLOW}Lista de tabelas:${NC}"
  PGPASSWORD=$POSTGRES_PASSWORD psql \
    -h $POSTGRES_HOST \
    -p $POSTGRES_PORT \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    -c "SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;"
else
  echo -e "${RED}Não foi possível conectar ao banco de dados${NC}"
  exit 1
fi
