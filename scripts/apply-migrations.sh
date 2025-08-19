#!/bin/bash

echo "Aplicando migrações do banco de dados..."

# Definir variáveis do banco de dados
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-movemarias}"
DB_USER="${POSTGRES_USER:-postgres}"

# Executar o arquivo de schema
echo "Aplicando schema completo..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /workspaces/assist-move-assist/migrations/schema_completo_adequado.sql

# Verificar se houve erro
if [ $? -eq 0 ]; then
    echo "✅ Migrações aplicadas com sucesso!"
else
    echo "❌ Erro ao aplicar migrações"
    exit 1
fi
