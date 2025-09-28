#!/bin/bash

# Script de migração do PostgreSQL utilizando as migrações consolidadas em src/database

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/src/database/migrations"

# Carrega variáveis do .env se existir
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$PROJECT_ROOT/.env"
  set +a
fi

DB_NAME="${POSTGRES_DB:-assist_move_assist}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "🚀 Iniciando preparação do PostgreSQL..."

# Verificar se o PostgreSQL está rodando
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
  echo "❌ PostgreSQL não está respondendo em ${DB_HOST}:${DB_PORT}. Tentando iniciar serviço local..."
  if command -v sudo >/dev/null 2>&1; then
    sudo service postgresql start
  else
    echo "⚠️ Não foi possível iniciar o serviço automaticamente. Certifique-se de que o banco esteja ativo."
  fi
fi

echo "📋 Configuração:"
echo "  - Banco: $DB_NAME"
echo "  - Usuário: $DB_USER"
echo "  - Host: $DB_HOST"
echo "  - Porta: $DB_PORT"
echo "  - Migrações: $MIGRATIONS_DIR"

# Verificar se o banco existe, se não, criar
echo "🔍 Verificando se o banco existe..."
if ! PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d '|' -f 1 | grep -qw "$DB_NAME"; then
  echo "📦 Criando banco de dados $DB_NAME..."
  PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
  echo "✅ Banco criado com sucesso!"
else
  echo "✅ Banco $DB_NAME já existe."
fi

echo "🔄 Executando migrações consolidadas..."
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Diretório de migrações não encontrado em $MIGRATIONS_DIR"
  exit 1
fi

(cd "$PROJECT_ROOT" && node "$SCRIPT_DIR/migrate-node.js")

echo "✅ Migrações aplicadas com sucesso!"
