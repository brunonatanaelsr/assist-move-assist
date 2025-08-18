#!/bin/bash

# Configurações do banco de dados
DB_HOST=${POSTGRES_HOST:-"localhost"}
DB_PORT=${POSTGRES_PORT:-"5432"}
DB_NAME=${POSTGRES_DB:-"movemarias"}
DB_USER=${POSTGRES_USER:-"postgres"}
DB_PASSWORD=${POSTGRES_PASSWORD:-"15002031"}

# Função para executar um arquivo SQL
execute_sql_file() {
    local file=$1
    echo "Executando $file..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $file
}

# Diretório das migrações
MIGRATIONS_DIR="../migrations"

# Executar todas as migrações em ordem
for migration in $(ls $MIGRATIONS_DIR/*.sql | sort); do
    execute_sql_file $migration
done

echo "Migrações concluídas!"
