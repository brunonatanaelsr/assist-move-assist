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

# Criar diretório de backups se não existir
BACKUP_DIR="var/backups"
mkdir -p "$BACKUP_DIR"

# Nome do arquivo de backup (data + hora)
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

echo -e "${YELLOW}Iniciando backup do banco de dados...${NC}"

# Executar backup
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
  -h $POSTGRES_HOST \
  -p $POSTGRES_PORT \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  -F p \
  -f $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Backup realizado com sucesso: $BACKUP_FILE${NC}"
  
  # Compactar backup
  gzip $BACKUP_FILE
  echo -e "${GREEN}Backup compactado: ${BACKUP_FILE}.gz${NC}"
  
  # Listar últimos 5 backups
  echo -e "\n${YELLOW}Últimos backups:${NC}"
  if ls -1 ${BACKUP_DIR}/*.gz >/dev/null 2>&1; then
    ls -lh ${BACKUP_DIR}/*.gz | tail -n 5
  else
    echo "(nenhum backup encontrado)"
  fi
  
  # Mostrar tamanho total dos backups
  echo -e "\n${YELLOW}Tamanho total dos backups:${NC}"
  du -sh $BACKUP_DIR
else
  echo -e "${RED}Erro ao realizar backup${NC}"
  exit 1
fi

# Remover backups antigos (manter últimos 7 dias)
find $BACKUP_DIR -name "backup_*.gz" -mtime +7 -delete
echo -e "\n${GREEN}Backups mais antigos que 7 dias foram removidos${NC}"
