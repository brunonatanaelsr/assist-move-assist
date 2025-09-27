#!/bin/bash

echo "Aplicando migrações do banco de dados..."

# Definir variáveis do banco de dados
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-movemarias}"
DB_USER="${POSTGRES_USER:-postgres}"

# Executar o schema consolidado
echo "Aplicando schema consolidado v2..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /workspaces/assist-move-assist/migrations/schema_consolidado_v2.sql

# Verificar se houve erro
if [ $? -eq 0 ]; then
    echo "✅ Migrações aplicadas com sucesso!"
else
    echo "❌ Erro ao aplicar migrações"
    exit 1
fi

# Executar migração da tabela oficina_presencas
echo "Aplicando migração oficina_presencas..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /workspaces/assist-move-assist/apps/backend/src/database/migrations/040_criar_oficina_presencas.sql

# Verificar se houve erro
if [ $? -eq 0 ]; then
    echo "✅ Migrações aplicadas com sucesso!"
else
    echo "❌ Erro ao aplicar migrações"
    exit 1
fi
