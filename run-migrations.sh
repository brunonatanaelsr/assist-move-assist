#!/bin/bash

# Array com a ordem correta das migrações
migrations=(
    "2025_08_20_184600_create_usuarios_table.sql"
    "2025_08_20_184700_create_refresh_tokens_table.sql"
    "2025_08_20_184800_create_database_extensions.sql"
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
)

# Executa cada migração na ordem especificada
for migration in "${migrations[@]}"; do
    echo "Executing $migration..."
    PGPASSWORD=15002031 psql -h localhost -U postgres -d movemarias -f "migrations/$migration"
done
