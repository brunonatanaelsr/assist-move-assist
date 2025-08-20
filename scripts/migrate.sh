#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações do banco de dados
DB_HOST=${POSTGRES_HOST:-"localhost"}
DB_PORT=${POSTGRES_PORT:-"5432"}
DB_NAME=${POSTGRES_DB:-"movemarias"}
DB_USER=${POSTGRES_USER:-"postgres"}
DB_PASSWORD=${POSTGRES_PASSWORD:-"15002031"}

# Função para executar migration
execute_migration() {
    local file=$1
    local filename=$(basename "$file")
    
    echo -e "${BLUE}Executando migration: ${filename}...${NC}"
    
    if PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" &> /tmp/migration_output; then
        echo -e "${GREEN}✓ Migration $filename executada com sucesso${NC}"
        return 0
    else
        echo -e "${RED}✗ Erro ao executar migration $filename${NC}"
        echo -e "${RED}Detalhes do erro:${NC}"
        cat /tmp/migration_output
        return 1
    fi
}

# Função para verificar dependências
check_dependencies() {
    local missing_deps=0
    
    echo -e "${BLUE}Verificando dependências...${NC}"
    
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}✗ PostgreSQL client (psql) não encontrado${NC}"
        missing_deps=1
    fi
    
    if [ $missing_deps -eq 1 ]; then
        echo -e "${RED}Por favor, instale as dependências faltantes e tente novamente${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Todas as dependências encontradas${NC}"
}

# Função para verificar conexão com o banco
check_database_connection() {
    echo -e "${BLUE}Verificando conexão com o banco de dados...${NC}"
    
    if PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' &> /dev/null; then
        echo -e "${GREEN}✓ Conexão com o banco estabelecida${NC}"
        return 0
    else
        echo -e "${RED}✗ Não foi possível conectar ao banco de dados${NC}"
        echo -e "${YELLOW}Verifique as variáveis de ambiente:${NC}"
        echo "  POSTGRES_HOST     (atual: $DB_HOST)"
        echo "  POSTGRES_PORT     (atual: $DB_PORT)"
        echo "  POSTGRES_DB       (atual: $DB_NAME)"
        echo "  POSTGRES_USER     (atual: $DB_USER)"
        echo "  POSTGRES_PASSWORD (atual: ********)"
        return 1
    fi
}

# Função para criar tabela de controle de migrations
create_migrations_table() {
    echo -e "${BLUE}Verificando tabela de controle de migrations...${NC}"
    
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF &> /dev/null
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_time INTEGER,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT
);
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Tabela de controle criada/verificada${NC}"
        return 0
    else
        echo -e "${RED}✗ Erro ao criar tabela de controle${NC}"
        return 1
    fi
}

# Função para verificar se migration já foi executada
check_migration_status() {
    local version=$1
    local result=$(PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version' AND status = 'success'")
    
    if [ "$result" -gt 0 ]; then
        return 0 # Já executada
    else
        return 1 # Não executada
    fi
}

# Função para registrar execução da migration
register_migration() {
    local version=$1
    local status=$2
    local error_message=$3
    local execution_time=$4
    
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO schema_migrations (version, status, error_message, execution_time)
        VALUES ('$version', '$status', '$error_message', $execution_time)
        ON CONFLICT (version) 
        DO UPDATE SET 
            status = EXCLUDED.status,
            error_message = EXCLUDED.error_message,
            execution_time = EXCLUDED.execution_time,
            executed_at = CURRENT_TIMESTAMP;"
}

# Início do script
echo -e "${BLUE}=== Iniciando processo de migração ===${NC}"

# Verificar dependências
check_dependencies

# Verificar conexão com o banco
check_database_connection || exit 1

# Criar tabela de controle
create_migrations_table || exit 1

# Array com a ordem correta das migrations
migrations=(
    "2025_08_20_00_create_users_table.sql"
    "2025_08_20_01_enhance_users_table.sql"
    "2025_08_20_02_create_refresh_tokens.sql"
    "2025_08_20_03_create_auth_audit.sql"
    "2025_08_20_04_create_security_functions.sql"
    "2025_08_20_05_create_configuracoes_tables.sql"
    "2025_08_20_15_fix_missing_tables.sql"
    "2025_08_20_14_add_missing_features.sql"
)

# Contador de migrations
total_migrations=${#migrations[@]}
executed_migrations=0
failed_migrations=0

echo -e "${BLUE}Encontradas $total_migrations migrations para executar${NC}"

# Executar cada migration na ordem
for migration in "${migrations[@]}"; do
    if check_migration_status "$migration"; then
        echo -e "${YELLOW}→ Migration $migration já foi executada anteriormente${NC}"
        ((executed_migrations++))
        continue
    fi
    
    start_time=$(date +%s%N)
    
    if execute_migration "migrations/$migration"; then
        end_time=$(date +%s%N)
        execution_time=$(( (end_time - start_time) / 1000000 )) # Converter para milissegundos
        register_migration "$migration" "success" "" "$execution_time"
        ((executed_migrations++))
    else
        end_time=$(date +%s%N)
        execution_time=$(( (end_time - start_time) / 1000000 ))
        error_message=$(cat /tmp/migration_output | tr -d "'")
        register_migration "$migration" "error" "$error_message" "$execution_time"
        ((failed_migrations++))
        
        echo -e "${RED}Erro na migration $migration${NC}"
        echo -e "${YELLOW}Deseja continuar com as próximas migrations? (s/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Ss]$ ]]; then
            echo -e "${RED}Processo de migração interrompido${NC}"
            break
        fi
    fi
done

# Limpar arquivo temporário
rm -f /tmp/migration_output

# Relatório final
echo -e "\n${BLUE}=== Relatório de Migração ===${NC}"
echo -e "Total de migrations: $total_migrations"
echo -e "Executadas com sucesso: ${GREEN}$executed_migrations${NC}"
if [ $failed_migrations -gt 0 ]; then
    echo -e "Falhas: ${RED}$failed_migrations${NC}"
fi

if [ $failed_migrations -eq 0 ]; then
    echo -e "\n${GREEN}✓ Processo de migração concluído com sucesso!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Processo de migração concluído com erros${NC}"
    exit 1
fi