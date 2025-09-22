#!/bin/bash

# Script de migração do PostgreSQL

set -e

echo "🚀 Iniciando migração do PostgreSQL..."

# Verificar se o PostgreSQL está rodando
if ! pg_isready -h localhost -p 5432; then
    echo "❌ PostgreSQL não está rodando. Iniciando..."
    sudo service postgresql start
fi

# Definir variáveis
DB_NAME="assist_move_assist"
DB_USER="postgres"
MIGRATIONS_DIR="../migrations"

echo "📋 Configuração:"
echo "  - Banco: $DB_NAME"
echo "  - Usuário: $DB_USER"
echo "  - Migrações: $MIGRATIONS_DIR"

# Verificar se o banco existe, se não, criar
echo "🔍 Verificando se o banco existe..."
if ! psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "📦 Criando banco de dados $DB_NAME..."
    createdb -U $DB_USER $DB_NAME
    echo "✅ Banco criado com sucesso!"
else
    echo "✅ Banco $DB_NAME já existe."
fi

# Executar migrações
echo "🔄 Executando migrações..."

if [ -f "$MIGRATIONS_DIR/001_initial_schema.sql" ]; then
    echo "  📄 Executando 001_initial_schema.sql..."
    psql -U $DB_USER -d $DB_NAME -f "$MIGRATIONS_DIR/001_initial_schema.sql"
    echo "  ✅ Schema inicial aplicado."
fi

if [ -f "$MIGRATIONS_DIR/002_audit_system.sql" ]; then
    echo "  📄 Executando 002_audit_system.sql..."
    psql -U $DB_USER -d $DB_NAME -f "$MIGRATIONS_DIR/002_audit_system.sql"
    echo "  ✅ Sistema de auditoria aplicado."
fi

# Verificar estrutura criada
echo "🔍 Verificando estrutura do banco..."
echo "Tabelas criadas:"
psql -U $DB_USER -d $DB_NAME -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"

echo ""
echo "✅ Migração concluída com sucesso!"
echo "🎯 Próximos passos:"
echo "  1. Configure o arquivo .env com as credenciais do banco"
echo "  2. Execute 'npm run dev' para iniciar o servidor"
echo "  3. Teste a conexão em http://localhost:3001"
