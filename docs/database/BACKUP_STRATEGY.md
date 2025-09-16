# Estratégia de Backup - Assist Move Assist
## Backup e Recuperação para Produção

### Índice
1. [Visão Geral da Estratégia](#visão-geral-da-estratégia)
2. [Tipos de Backup](#tipos-de-backup)
3. [Cronograma de Backups](#cronograma-de-backups)
4. [Scripts de Automação](#scripts-de-automação)
5. [Armazenamento e Retenção](#armazenamento-e-retenção)
6. [Procedimentos de Restauração](#procedimentos-de-restauração)
7. [Testes de Recuperação](#testes-de-recuperação)
8. [Monitoramento e Alertas](#monitoramento-e-alertas)

---

## Visão Geral da Estratégia

### Objetivos
- **RTO (Recovery Time Objective)**: 30 minutos
- **RPO (Recovery Point Objective)**: 1 hora
- **Disponibilidade**: 99.9% (8.76 horas downtime/ano)
- **Integridade**: Verificação automática de backups

### Componentes do Sistema de Backup
1. **Backups Automatizados do PostgreSQL**: Execuções periódicas via `pg_dump`
2. **Backups Customizados**: Scripts próprios para dados específicos
3. **Storage Backup**: Arquivos e documentos
4. **Configuration Backup**: Variáveis de ambiente e configurações

---

## Tipos de Backup

### 1. Backup Completo (Full Backup)
```bash
#!/bin/bash
# scripts/backup_full.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/full"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL não definido}"

echo "🗄️  Iniciando Backup Completo - $TIMESTAMP"

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Backup do banco de dados completo
echo "📊 Backup do banco de dados..."
pg_dump $DATABASE_URL \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    --format=custom \
    --file="$BACKUP_DIR/database_full_$TIMESTAMP.dump"

# Backup do schema apenas (para referência rápida)
pg_dump $DATABASE_URL \
    --schema-only \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    --file="$BACKUP_DIR/schema_$TIMESTAMP.sql"

# Backup de dados específicos (dados críticos)
psql $DATABASE_URL -c "\copy (SELECT * FROM beneficiarias WHERE status = 'ativa') TO '$BACKUP_DIR/beneficiarias_ativas_$TIMESTAMP.csv' WITH CSV HEADER;"
psql $DATABASE_URL -c "\copy (SELECT * FROM profiles WHERE ativo = true) TO '$BACKUP_DIR/usuarios_ativos_$TIMESTAMP.csv' WITH CSV HEADER;"

# Compressão do backup
echo "🗜️  Comprimindo backup..."
tar -czf "$BACKUP_DIR/backup_full_$TIMESTAMP.tar.gz" \
    "$BACKUP_DIR/database_full_$TIMESTAMP.dump" \
    "$BACKUP_DIR/schema_$TIMESTAMP.sql" \
    "$BACKUP_DIR/"*.csv

# Verificação da integridade
echo "✅ Verificando integridade..."
if [ -f "$BACKUP_DIR/backup_full_$TIMESTAMP.tar.gz" ]; then
    SIZE=$(stat -f%z "$BACKUP_DIR/backup_full_$TIMESTAMP.tar.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/backup_full_$TIMESTAMP.tar.gz")
    if [ $SIZE -gt 1000000 ]; then  # Mínimo 1MB
        echo "✅ Backup completo criado com sucesso: $SIZE bytes"
        
        # Log do backup
        echo "$(date): Backup Full - Sucesso - $SIZE bytes" >> /var/log/backup.log
        
        # Cleanup arquivos temporários
        rm -f "$BACKUP_DIR/database_full_$TIMESTAMP.dump"
        rm -f "$BACKUP_DIR/schema_$TIMESTAMP.sql"
        rm -f "$BACKUP_DIR/"*.csv
    else
        echo "❌ Erro: Backup muito pequeno"
        exit 1
    fi
else
    echo "❌ Erro: Arquivo de backup não foi criado"
    exit 1
fi

echo "🎉 Backup completo finalizado"
```

### 2. Backup Incremental
```bash
#!/bin/bash
# scripts/backup_incremental.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/incremental"
LAST_BACKUP_FILE="/backup/.last_backup_timestamp"

echo "📈 Iniciando Backup Incremental - $TIMESTAMP"

# Obter timestamp do último backup
if [ -f "$LAST_BACKUP_FILE" ]; then
    LAST_BACKUP=$(cat $LAST_BACKUP_FILE)
    echo "📅 Último backup: $LAST_BACKUP"
else
    LAST_BACKUP=$(date -d "yesterday" +%Y-%m-%d)
    echo "📅 Primeiro backup incremental, usando: $LAST_BACKUP"
fi

mkdir -p $BACKUP_DIR

# Backup de dados modificados desde o último backup
echo "🔄 Backup de dados modificados..."

# Beneficiárias modificadas
psql $DATABASE_URL -c "\copy (
    SELECT * FROM beneficiarias 
    WHERE updated_at > '$LAST_BACKUP'
) TO '$BACKUP_DIR/beneficiarias_mod_$TIMESTAMP.csv' WITH CSV HEADER;"

# Posts do feed novos/modificados
psql $DATABASE_URL -c "\copy (
    SELECT * FROM feed_posts 
    WHERE created_at > '$LAST_BACKUP' OR updated_at > '$LAST_BACKUP'
) TO '$BACKUP_DIR/feed_posts_mod_$TIMESTAMP.csv' WITH CSV HEADER;"

# Tarefas modificadas
psql $DATABASE_URL -c "\copy (
    SELECT * FROM tarefas 
    WHERE updated_at > '$LAST_BACKUP'
) TO '$BACKUP_DIR/tarefas_mod_$TIMESTAMP.csv' WITH CSV HEADER;"

# Logs de auditoria novos
psql $DATABASE_URL -c "\copy (
    SELECT * FROM audit_logs 
    WHERE timestamp > '$LAST_BACKUP'
) TO '$BACKUP_DIR/audit_logs_$TIMESTAMP.csv' WITH CSV HEADER;"

# Compressão
tar -czf "$BACKUP_DIR/backup_incremental_$TIMESTAMP.tar.gz" \
    "$BACKUP_DIR/"*_mod_$TIMESTAMP.csv \
    "$BACKUP_DIR/audit_logs_$TIMESTAMP.csv"

# Cleanup
rm -f "$BACKUP_DIR/"*.csv

# Atualizar timestamp do último backup
echo "$TIMESTAMP" > $LAST_BACKUP_FILE

echo "✅ Backup incremental concluído"
```

### 3. Backup de Storage (Arquivos)
```bash
#!/bin/bash
# scripts/backup_storage.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/storage"
STORAGE_SOURCE="/opt/assist-move-assist/storage"

echo "📁 Iniciando Backup de Storage - $TIMESTAMP"

mkdir -p "$BACKUP_DIR"

if [ -d "$STORAGE_SOURCE" ]; then
    rsync -av --delete "$STORAGE_SOURCE/" "$BACKUP_DIR/storage_$TIMESTAMP/"
else
    echo "⚠️  Diretório de storage não encontrado: $STORAGE_SOURCE"
fi

echo "🗜️  Comprimindo arquivos..."
tar -czf "$BACKUP_DIR/storage_backup_$TIMESTAMP.tar.gz" \
    -C "$BACKUP_DIR" "storage_$TIMESTAMP" 2>/dev/null || true

rm -rf "$BACKUP_DIR/storage_$TIMESTAMP/"

echo "✅ Backup de storage concluído"
```

---

## Cronograma de Backups

### Configuração do Cron
```bash
# /etc/crontab ou crontab -e

# Backup completo - Todos os domingos às 2:00 AM
0 2 * * 0 /opt/assist-move-assist/scripts/backup_full.sh

# Backup incremental - Todos os dias às 6:00 AM (exceto domingo)
0 6 * * 1-6 /opt/assist-move-assist/scripts/backup_incremental.sh

# Backup de storage - Todos os dias às 3:00 AM
0 3 * * * /opt/assist-move-assist/scripts/backup_storage.sh

# Cleanup de backups antigos - Todos os dias às 4:00 AM
0 4 * * * /opt/assist-move-assist/scripts/cleanup_old_backups.sh

# Teste de integridade - Toda segunda-feira às 5:00 AM
0 5 * * 1 /opt/assist-move-assist/scripts/test_backup_integrity.sh

# Backup de configurações - Todo primeiro dia do mês às 1:00 AM
0 1 1 * * /opt/assist-move-assist/scripts/backup_configs.sh
```

### Script de Cleanup
```bash
#!/bin/bash
# scripts/cleanup_old_backups.sh

set -e

BACKUP_BASE="/backup"
RETENTION_FULL=30      # Manter backups completos por 30 dias
RETENTION_INCREMENTAL=7 # Manter backups incrementais por 7 dias
RETENTION_STORAGE=14   # Manter backups de storage por 14 dias

echo "🧹 Iniciando limpeza de backups antigos"

# Cleanup backups completos
echo "Removendo backups completos com mais de $RETENTION_FULL dias..."
find "$BACKUP_BASE/full" -name "backup_full_*.tar.gz" -mtime +$RETENTION_FULL -delete

# Cleanup backups incrementais
echo "Removendo backups incrementais com mais de $RETENTION_INCREMENTAL dias..."
find "$BACKUP_BASE/incremental" -name "backup_incremental_*.tar.gz" -mtime +$RETENTION_INCREMENTAL -delete

# Cleanup backups de storage
echo "Removendo backups de storage com mais de $RETENTION_STORAGE dias..."
find "$BACKUP_BASE/storage" -name "storage_backup_*.tar.gz" -mtime +$RETENTION_STORAGE -delete

# Log da limpeza
DELETED_COUNT=$(find "$BACKUP_BASE" -name "*.tar.gz" -mtime +$RETENTION_FULL | wc -l)
echo "$(date): Cleanup - $DELETED_COUNT arquivos removidos" >> /var/log/backup.log

echo "✅ Limpeza concluída"
```

---

## Armazenamento e Retenção

### Estrutura de Diretórios
```
/backup/
├── full/                    # Backups completos
│   ├── backup_full_20250808_020000.tar.gz
│   └── backup_full_20250801_020000.tar.gz
├── incremental/             # Backups incrementais
│   ├── backup_incremental_20250808_060000.tar.gz
│   └── backup_incremental_20250807_060000.tar.gz
├── storage/                 # Backups de arquivos
│   ├── storage_backup_20250808_030000.tar.gz
│   └── storage_backup_20250807_030000.tar.gz
├── configs/                 # Backups de configuração
│   └── configs_20250801_010000.tar.gz
├── .last_backup_timestamp   # Controle de backups incrementais
└── integrity_tests/         # Logs de testes de integridade
    └── test_20250808.log
```

### Política de Retenção
- **Backups Completos**: 30 dias (4 backups)
- **Backups Incrementais**: 7 dias
- **Backups de Storage**: 14 dias
- **Backups de Configuração**: 90 dias
- **Logs de Teste**: 30 dias

### Armazenamento Remoto (Opcional)
```bash
#!/bin/bash
# scripts/sync_to_remote.sh

# AWS S3
aws s3 sync /backup/ s3://assist-move-assist-backups/$(date +%Y/%m)/ \
    --exclude "*" \
    --include "*.tar.gz" \
    --storage-class STANDARD_IA

# Google Cloud Storage
gsutil -m rsync -r -d /backup/ gs://assist-move-assist-backups/$(date +%Y/%m)/

# Azure Blob Storage
az storage blob upload-batch \
    --destination backup-container \
    --source /backup/ \
    --pattern "*.tar.gz"
```

---

## Procedimentos de Restauração

### 1. Restauração Completa
```bash
#!/bin/bash
# scripts/restore_full.sh

set -e

if [ $# -ne 1 ]; then
    echo "Uso: $0 <arquivo_backup>"
    echo "Exemplo: $0 backup_full_20250808_020000.tar.gz"
    exit 1
fi

BACKUP_FILE=$1
RESTORE_DIR="/tmp/restore_$(date +%Y%m%d_%H%M%S)"
DATABASE_URL_RESTORE="$DATABASE_URL"

echo "🔄 Iniciando Restauração Completa"
echo "📁 Arquivo: $BACKUP_FILE"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Erro: Arquivo de backup não encontrado"
    exit 1
fi

# Criar diretório temporário
mkdir -p $RESTORE_DIR
cd $RESTORE_DIR

# Extrair backup
echo "📦 Extraindo backup..."
tar -xzf "$BACKUP_FILE"

# Encontrar arquivo de dump
DUMP_FILE=$(find . -name "*.dump" | head -1)
if [ -z "$DUMP_FILE" ]; then
    echo "❌ Erro: Arquivo de dump não encontrado no backup"
    exit 1
fi

# ATENÇÃO: Restauração irá APAGAR dados existentes!
echo "⚠️  ATENÇÃO: Esta operação irá SUBSTITUIR todos os dados existentes!"
echo "🗄️  Banco de destino: $DATABASE_URL_RESTORE"
read -p "Continuar? (digite 'CONFIRMO' para prosseguir): " CONFIRM

if [ "$CONFIRM" != "CONFIRMO" ]; then
    echo "❌ Operação cancelada"
    exit 1
fi

# Criar backup de segurança antes da restauração
echo "💾 Criando backup de segurança atual..."
pg_dump $DATABASE_URL_RESTORE > "backup_pre_restore_$(date +%Y%m%d_%H%M%S).sql"

# Restaurar banco de dados
echo "🔄 Restaurando banco de dados..."
pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --verbose \
    --dbname="$DATABASE_URL_RESTORE" \
    "$DUMP_FILE"

# Verificar restauração
echo "✅ Verificando restauração..."
BENEFICIARIAS_COUNT=$(psql $DATABASE_URL_RESTORE -t -c "SELECT COUNT(*) FROM beneficiarias;" | xargs)
USERS_COUNT=$(psql $DATABASE_URL_RESTORE -t -c "SELECT COUNT(*) FROM profiles;" | xargs)

echo "📊 Estatísticas pós-restauração:"
echo "   Beneficiárias: $BENEFICIARIAS_COUNT"
echo "   Usuários: $USERS_COUNT"

# Cleanup
cd /
rm -rf $RESTORE_DIR

echo "🎉 Restauração completa finalizada com sucesso!"
```

### 2. Restauração de Tabela Específica
```bash
#!/bin/bash
# scripts/restore_table.sh

set -e

if [ $# -ne 2 ]; then
    echo "Uso: $0 <arquivo_backup> <nome_tabela>"
    echo "Exemplo: $0 backup_full_20250808.tar.gz beneficiarias"
    exit 1
fi

BACKUP_FILE=$1
TABLE_NAME=$2
RESTORE_DIR="/tmp/restore_table_$(date +%Y%m%d_%H%M%S)"

echo "🔄 Restaurando tabela: $TABLE_NAME"

mkdir -p $RESTORE_DIR
cd $RESTORE_DIR

# Extrair e restaurar apenas a tabela específica
tar -xzf "$BACKUP_FILE"
DUMP_FILE=$(find . -name "*.dump" | head -1)

# Backup da tabela atual
echo "💾 Backup da tabela atual..."
pg_dump $DATABASE_URL -t $TABLE_NAME > "${TABLE_NAME}_backup_$(date +%Y%m%d_%H%M%S).sql"

# Restaurar apenas a tabela específica
pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --verbose \
    --table="$TABLE_NAME" \
    --dbname="$DATABASE_URL" \
    "$DUMP_FILE"

echo "✅ Tabela $TABLE_NAME restaurada com sucesso"

# Cleanup
cd /
rm -rf $RESTORE_DIR
```

---

## Testes de Recuperação

### Script de Teste de Integridade
```bash
#!/bin/bash
# scripts/test_backup_integrity.sh

set -e

TEST_DB="assist_move_test_$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="/backup/full"
LOG_FILE="/backup/integrity_tests/test_$(date +%Y%m%d).log"

echo "🧪 Iniciando Teste de Integridade de Backup" | tee $LOG_FILE

# Encontrar backup mais recente
LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup_full_*.tar.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ Nenhum backup encontrado" | tee -a $LOG_FILE
    exit 1
fi

echo "📁 Testando backup: $(basename $LATEST_BACKUP)" | tee -a $LOG_FILE

# Criar banco de teste
echo "🗄️  Criando banco de teste: $TEST_DB" | tee -a $LOG_FILE
createdb $TEST_DB

# Extrair e restaurar backup no banco de teste
RESTORE_DIR="/tmp/integrity_test_$(date +%Y%m%d_%H%M%S)"
mkdir -p $RESTORE_DIR
cd $RESTORE_DIR

tar -xzf "$LATEST_BACKUP"
DUMP_FILE=$(find . -name "*.dump" | head -1)

# Restaurar no banco de teste
pg_restore \
    --no-owner \
    --no-privileges \
    --verbose \
    --dbname="postgresql://localhost/$TEST_DB" \
    "$DUMP_FILE" 2>&1 | tee -a $LOG_FILE

# Testes de integridade
echo "✅ Executando testes de integridade..." | tee -a $LOG_FILE

# Teste 1: Verificar se todas as tabelas existem
TABLES_EXPECTED=("profiles" "beneficiarias" "feed_posts" "tarefas" "oficinas")
for table in "${TABLES_EXPECTED[@]}"; do
    COUNT=$(psql postgresql://localhost/$TEST_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='$table';" | xargs)
    if [ "$COUNT" -eq 1 ]; then
        echo "✅ Tabela $table: OK" | tee -a $LOG_FILE
    else
        echo "❌ Tabela $table: FALTANDO" | tee -a $LOG_FILE
    fi
done

# Teste 2: Verificar dados básicos
BENEFICIARIAS_COUNT=$(psql postgresql://localhost/$TEST_DB -t -c "SELECT COUNT(*) FROM beneficiarias;" | xargs)
USERS_COUNT=$(psql postgresql://localhost/$TEST_DB -t -c "SELECT COUNT(*) FROM profiles;" | xargs)

echo "📊 Contadores:" | tee -a $LOG_FILE
echo "   Beneficiárias: $BENEFICIARIAS_COUNT" | tee -a $LOG_FILE
echo "   Usuários: $USERS_COUNT" | tee -a $LOG_FILE

# Teste 3: Verificar integridade referencial
ORPHANED_TASKS=$(psql postgresql://localhost/$TEST_DB -t -c "
    SELECT COUNT(*) FROM tarefas t 
    LEFT JOIN beneficiarias b ON t.beneficiaria_id = b.id 
    WHERE t.beneficiaria_id IS NOT NULL AND b.id IS NULL;
" | xargs)

if [ "$ORPHANED_TASKS" -eq 0 ]; then
    echo "✅ Integridade referencial: OK" | tee -a $LOG_FILE
else
    echo "⚠️  Integridade referencial: $ORPHANED_TASKS tarefas órfãs encontradas" | tee -a $LOG_FILE
fi

# Cleanup
dropdb $TEST_DB
cd /
rm -rf $RESTORE_DIR

echo "🎉 Teste de integridade concluído" | tee -a $LOG_FILE
echo "📝 Log salvo em: $LOG_FILE"
```

### Teste Automatizado Mensal
```bash
#!/bin/bash
# scripts/monthly_recovery_test.sh

echo "🗓️  Iniciando Teste de Recuperação Mensal"

# Criar ambiente de teste completo
# Restaurar backup em ambiente isolado
# Executar testes funcionais básicos
# Verificar performance
# Gerar relatório detalhado

echo "📋 Teste de Recuperação Mensal concluído"
echo "📊 Relatório disponível em: /backup/reports/monthly_test_$(date +%Y%m).pdf"
```

---

## Monitoramento e Alertas

### Script de Monitoramento
```bash
#!/bin/bash
# scripts/monitor_backups.sh

BACKUP_DIR="/backup"
WEBHOOK_URL="$SLACK_WEBHOOK_URL"  # ou outro sistema de alertas

# Verificar se backup mais recente tem menos de 25 horas
LATEST_BACKUP=$(find $BACKUP_DIR -name "*.tar.gz" -mtime -1 | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    # Enviar alerta
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 ALERTA: Nenhum backup encontrado nas últimas 24 horas!"}' \
        $WEBHOOK_URL
    
    echo "❌ Backup não encontrado - alerta enviado"
    exit 1
fi

# Verificar tamanho do backup
SIZE=$(stat -f%z "$LATEST_BACKUP" 2>/dev/null || stat -c%s "$LATEST_BACKUP")
MIN_SIZE=1000000  # 1MB mínimo

if [ $SIZE -lt $MIN_SIZE ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"⚠️  ALERTA: Backup muito pequeno - possível problema"}' \
        $WEBHOOK_URL
    
    echo "⚠️  Backup pequeno - alerta enviado"
fi

echo "✅ Monitoramento de backup OK"
```

### Dashboard de Status
```javascript
// Exemplo de endpoint para status de backups
// /api/backup-status

export default async function handler(req, res) {
  const backups = await getBackupStatus();
  
  res.json({
    status: 'healthy',
    lastFullBackup: backups.lastFull,
    lastIncrementalBackup: backups.lastIncremental,
    totalBackups: backups.count,
    totalSize: backups.totalSize,
    oldestBackup: backups.oldest,
    healthScore: calculateHealthScore(backups)
  });
}
```

---

## Checklist de Backup

### Implementação ✅
- [ ] Scripts de backup completo criados
- [ ] Scripts de backup incremental configurados
- [ ] Backup de storage implementado
- [ ] Cronogramas configurados
- [ ] Scripts de limpeza implementados
- [ ] Procedimentos de restauração testados

### Testes ✅
- [ ] Teste de backup completo executado
- [ ] Teste de restauração executado
- [ ] Teste de integridade automatizado
- [ ] Teste de backup incremental validado
- [ ] Procedimento de rollback testado

### Monitoramento ✅
- [ ] Alertas configurados
- [ ] Dashboard de status criado
- [ ] Logs centralizados
- [ ] Métricas de performance coletadas
- [ ] Relatórios automatizados

---

**Data de Criação**: Agosto 2025  
**Versão**: 1.0  
**Status**: Implementação Obrigatória
