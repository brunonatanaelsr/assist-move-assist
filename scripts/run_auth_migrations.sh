#!/bin/bash

# Script para executar as migrations do sistema de autenticação

echo "Iniciando execução das migrations de autenticação..."

# Array com os arquivos de migração em ordem
MIGRATIONS=(
    "2025_08_20_01_enhance_users_table.sql"
    "2025_08_20_02_create_refresh_tokens.sql"
    "2025_08_20_03_create_auth_audit.sql"
    "2025_08_20_04_create_security_functions.sql"
)

# Função para executar uma migration
execute_migration() {
    local file=$1
    echo "Executando migration: $file"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "./migrations/$file"
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration $file executada com sucesso"
    else
        echo "❌ Erro ao executar migration $file"
        exit 1
    fi
}

# Executar cada migration
for migration in "${MIGRATIONS[@]}"; do
    execute_migration "$migration"
done

echo "Migrations de autenticação concluídas com sucesso!"
