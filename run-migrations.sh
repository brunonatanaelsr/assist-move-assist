#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para executar migration com tratamento de erro
execute_migration() {
    local file=$1
    echo -e "${GREEN}Executando $file...${NC}"
    PGPASSWORD=15002031 psql -h localhost -U postgres -d movemarias -f "migrations/$file"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Erro ao executar $file${NC}"
        exit 1
    fi
}

# Array com a ordem correta das migrações
migrations=(
    # Tabelas base do sistema
    "2025_08_20_184600_create_usuarios_table.sql"
    "2025_08_20_184700_create_refresh_tokens_table.sql"
    "2025_08_20_184800_create_database_extensions.sql"
    
    # Sistema de Perfis e Permissões
    "2025_08_24_000001_create_perfis_table.sql"
    "2025_08_24_000002_create_permissoes_table.sql"
    "2025_08_24_000003_create_perfil_permissoes_table.sql"
    "2025_08_24_000004_add_perfil_to_usuarios.sql"
    "2025_08_24_000005_insert_initial_roles_and_permissions.sql"
    
    # Dados iniciais e outras tabelas
    "2025_08_20_184900_insert_initial_data.sql"
    "2025_08_20_185100_create_beneficiarias_table.sql"
    "2025_08_20_185200_create_eventos_auditoria_table.sql"
    "2025_08_21_101900_create_projetos_table.sql"
    "2025_08_20_185500_create_oficinas_table.sql"
    "2025_08_20_185400_create_participacoes_table.sql"
    "2025_08_21_101300_create_anamneses_social_table.sql"
    "2025_08_21_101401_create_grupos_conversa_table.sql"
    "2025_08_21_101400_create_mensagens_table.sql"
    "2025_08_21_101402_create_participantes_grupo_table.sql"
    "2025_08_21_102000_create_feed_posts_table.sql"
    "2025_08_21_102001_create_comentarios_feed_table.sql"
    "2025_08_21_102300_create_documentos_table.sql"
    "2025_08_21_102500_create_notificacoes_table.sql"
    "2025_08_21_102600_create_anexos_feed_table.sql"
    "2025_08_21_102700_create_reacoes_feed_table.sql"
    "2025_08_21_102800_create_configuracoes_sistema_table.sql"
    "2025_08_21_102900_create_historico_atendimentos_table.sql"
    "2025_08_21_103000_create_encaminhamentos_table.sql"
    "2025_08_21_103100_create_presencas_oficinas_table.sql"
    "2025_08_21_103200_create_avaliacoes_oficinas_table.sql"
    "2025_08_21_103300_create_etapas_projeto_table.sql"
    "2025_08_21_103400_create_recursos_projeto_table.sql"
    "2025_08_23_add_formularios_tables.sql"
    # Logs e Auditoria Avançada
    "2025_08_25_143000_create_logs_configuracoes_table.sql"
    "2025_08_25_143500_create_configuracoes_sistema_table.sql"
    "2025_08_25_143600_create_update_triggers.sql"
)

# Executa cada migração na ordem especificada
for migration in "${migrations[@]}"; do
    echo "Executing $migration..."
    PGPASSWORD=15002031 psql -h localhost -U postgres -d movemarias -f "migrations/$migration"
done
