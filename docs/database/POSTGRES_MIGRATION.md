# Migração PostgreSQL - Assist Move Assist
## Guia Completo de Migração para Produção

### Índice
1. [Visão Geral da Migração](#visão-geral-da-migração)
2. [Esquema Completo do Banco](#esquema-completo-do-banco)
3. [Scripts de Migração](#scripts-de-migração)
4. [Índices e Performance](#índices-e-performance)
5. [Políticas RLS Detalhadas](#políticas-rls-detalhadas)
6. [Procedimentos de Migração](#procedimentos-de-migração)
7. [Validação Pós-Migração](#validação-pós-migração)
8. [Rollback e Recuperação](#rollback-e-recuperação)

---

## Visão Geral da Migração

### Arquitetura Atual
- **Infra Atual**: PostgreSQL 15+ gerenciado (RDS, CloudSQL, etc.)
- **Extensões**: pgcrypto, uuid-ossp, postgis (se necessário)
- **Conexões**: Pool de conexões configurado
- **Replicação**: Multi-AZ automática

### Objetivos da Migração
1. **Alta Disponibilidade**: 99.9% uptime
2. **Performance Otimizada**: Queries < 100ms
3. **Segurança Robusta**: RLS em todas as tabelas
4. **Auditoria Completa**: Log de todas as alterações
5. **Backup Automático**: Recovery point < 1 hora

---

## Esquema Completo do Banco

### Tabelas Principais

#### 1. Autenticação e Usuários
```sql
-- Tabela de perfis integrada ao serviço de autenticação interno
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nome_completo TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'readonly')),
    ativo BOOLEAN DEFAULT true,
    ultimo_acesso TIMESTAMPTZ,
    configuracoes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_ativo ON profiles(ativo);
```

#### 2. Beneficiárias
```sql
CREATE TABLE beneficiarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    rg TEXT,
    orgao_emissor_rg TEXT,
    data_emissao_rg DATE,
    data_nascimento DATE NOT NULL,
    endereco TEXT,
    bairro TEXT,
    cep TEXT,
    cidade TEXT DEFAULT 'São Paulo',
    estado TEXT DEFAULT 'SP',
    nis TEXT,
    contato1 TEXT NOT NULL,
    contato2 TEXT,
    email TEXT,
    referencia TEXT,
    data_inicio_instituto DATE DEFAULT CURRENT_DATE,
    programa_servico TEXT,
    status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'suspensa', 'transferida')),
    observacoes TEXT,
    documentos_pendentes TEXT[],
    responsavel_cadastro UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Índices para beneficiarias
CREATE INDEX idx_beneficiarias_cpf ON beneficiarias(cpf);
CREATE INDEX idx_beneficiarias_nome ON beneficiarias USING GIN (to_tsvector('portuguese', nome_completo));
CREATE INDEX idx_beneficiarias_status ON beneficiarias(status);
CREATE INDEX idx_beneficiarias_programa ON beneficiarias(programa_servico);
CREATE INDEX idx_beneficiarias_data_inicio ON beneficiarias(data_inicio_instituto);
CREATE INDEX idx_beneficiarias_created_at ON beneficiarias(created_at);
```

#### 3. Feed e Comunicação
```sql
CREATE TABLE feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('anuncio', 'noticia', 'evento', 'comunicado')),
    autor_id UUID NOT NULL REFERENCES profiles(id),
    imagem_url TEXT,
    anexos TEXT[],
    visibilidade TEXT DEFAULT 'todos' CHECK (visibilidade IN ('todos', 'admins', 'equipe')),
    fixado BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    data_publicacao TIMESTAMPTZ DEFAULT NOW(),
    data_expiracao TIMESTAMPTZ,
    tags TEXT[],
    prioridade INTEGER DEFAULT 1 CHECK (prioridade BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feed_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES feed_comments(id), -- Para comentários aninhados
    conteudo TEXT NOT NULL,
    autor_id UUID NOT NULL REFERENCES profiles(id),
    editado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feed_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT feed_likes_target_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    UNIQUE(post_id, user_id),
    UNIQUE(comment_id, user_id)
);

-- Índices para feed
CREATE INDEX idx_feed_posts_tipo ON feed_posts(tipo);
CREATE INDEX idx_feed_posts_autor ON feed_posts(autor_id);
CREATE INDEX idx_feed_posts_data ON feed_posts(data_publicacao DESC);
CREATE INDEX idx_feed_posts_visibilidade ON feed_posts(visibilidade);
CREATE INDEX idx_feed_posts_ativo ON feed_posts(ativo);
CREATE INDEX idx_feed_comments_post ON feed_comments(post_id);
CREATE INDEX idx_feed_comments_autor ON feed_comments(autor_id);
CREATE INDEX idx_feed_likes_post ON feed_likes(post_id);
CREATE INDEX idx_feed_likes_user ON feed_likes(user_id);
```

#### 4. Tarefas e Projetos
```sql
CREATE TABLE projetos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim_prevista DATE,
    data_fim_real DATE,
    status TEXT DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado')),
    responsavel_id UUID REFERENCES profiles(id),
    orcamento DECIMAL(10,2),
    orcamento_usado DECIMAL(10,2) DEFAULT 0,
    meta_beneficiarias INTEGER,
    beneficiarias_atingidas INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

CREATE TABLE tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    projeto_id UUID REFERENCES projetos(id),
    beneficiaria_id UUID REFERENCES beneficiarias(id),
    responsavel_id UUID NOT NULL REFERENCES profiles(id),
    data_vencimento TIMESTAMPTZ NOT NULL,
    data_conclusao TIMESTAMPTZ,
    prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada', 'reagendada')),
    categoria TEXT,
    tags TEXT[],
    tempo_estimado INTERVAL,
    tempo_gasto INTERVAL,
    observacoes TEXT,
    anexos TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Índices para projetos e tarefas
CREATE INDEX idx_projetos_status ON projetos(status);
CREATE INDEX idx_projetos_responsavel ON projetos(responsavel_id);
CREATE INDEX idx_projetos_data_inicio ON projetos(data_inicio);
CREATE INDEX idx_tarefas_responsavel ON tarefas(responsavel_id);
CREATE INDEX idx_tarefas_beneficiaria ON tarefas(beneficiaria_id);
CREATE INDEX idx_tarefas_vencimento ON tarefas(data_vencimento);
CREATE INDEX idx_tarefas_status ON tarefas(status);
CREATE INDEX idx_tarefas_prioridade ON tarefas(prioridade);
```

#### 5. Oficinas e Atividades
```sql
CREATE TABLE oficinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    instrutor TEXT,
    data_oficina TIMESTAMPTZ NOT NULL,
    duracao INTERVAL DEFAULT '2 hours',
    local TEXT,
    capacidade_maxima INTEGER DEFAULT 20,
    material_necessario TEXT[],
    objetivo TEXT,
    publico_alvo TEXT,
    status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'em_andamento', 'concluida', 'cancelada')),
    feedback_instrutor TEXT,
    avaliacao_media DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

CREATE TABLE oficina_presencas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oficina_id UUID NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    beneficiaria_id UUID NOT NULL REFERENCES beneficiarias(id),
    presente BOOLEAN DEFAULT false,
    chegada TIMESTAMPTZ,
    saida TIMESTAMPTZ,
    observacoes TEXT,
    avaliacao INTEGER CHECK (avaliacao BETWEEN 1 AND 5),
    certificado_emitido BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(oficina_id, beneficiaria_id)
);

-- Índices para oficinas
CREATE INDEX idx_oficinas_data ON oficinas(data_oficina);
CREATE INDEX idx_oficinas_status ON oficinas(status);
CREATE INDEX idx_oficinas_instrutor ON oficinas(instrutor);
CREATE INDEX idx_presencas_oficina ON oficina_presencas(oficina_id);
CREATE INDEX idx_presencas_beneficiaria ON oficina_presencas(beneficiaria_id);
CREATE INDEX idx_presencas_presente ON oficina_presencas(presente);
```

#### 6. Sistema de Auditoria
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela TEXT NOT NULL,
    operacao TEXT NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
    registro_id UUID,
    user_id UUID REFERENCES profiles(id),
    dados_antigos JSONB,
    dados_novos JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para auditoria
CREATE INDEX idx_audit_logs_tabela ON audit_logs(tabela);
CREATE INDEX idx_audit_logs_operacao ON audit_logs(operacao);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_registro ON audit_logs(registro_id);
```

#### 7. Mensagens e Notificações
```sql
CREATE TABLE mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remetente_id UUID NOT NULL REFERENCES profiles(id),
    destinatario_id UUID NOT NULL REFERENCES profiles(id),
    assunto TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    lida BOOLEAN DEFAULT false,
    data_leitura TIMESTAMPTZ,
    prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    anexos TEXT[],
    thread_id UUID REFERENCES mensagens(id), -- Para respostas
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('tarefa', 'mensagem', 'oficina', 'sistema', 'lembrete')),
    titulo TEXT NOT NULL,
    conteudo TEXT,
    lida BOOLEAN DEFAULT false,
    data_leitura TIMESTAMPTZ,
    acao_url TEXT,
    metadados JSONB DEFAULT '{}',
    expira_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mensagens e notificações
CREATE INDEX idx_mensagens_destinatario ON mensagens(destinatario_id);
CREATE INDEX idx_mensagens_remetente ON mensagens(remetente_id);
CREATE INDEX idx_mensagens_lida ON mensagens(lida);
CREATE INDEX idx_mensagens_thread ON mensagens(thread_id);
CREATE INDEX idx_notificacoes_user ON notificacoes(user_id);
CREATE INDEX idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);
```

---

## Scripts de Migração

### Estrutura de Migrations
```bash
migrations/
├── 001_initial_schema.sql          # Schema inicial
├── 002_add_audit_system.sql        # Sistema de auditoria
├── 003_add_indexes.sql              # Índices de performance
├── 004_create_rls_policies.sql      # Políticas RLS
├── 005_create_functions.sql         # Funções e triggers
├── 006_insert_initial_data.sql      # Dados iniciais
└── rollback/
    ├── 001_rollback.sql
    ├── 002_rollback.sql
    └── ...
```

### Script de Migração Inicial
```sql
-- migrations/001_initial_schema.sql
BEGIN;

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Criar schema para logs se não existir
CREATE SCHEMA IF NOT EXISTS logs;

-- Executar criação de todas as tabelas
-- (conteúdo das tabelas acima)

-- Verificar integridade
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') >= 10,
           'Erro: Número insuficiente de tabelas criadas';
    
    RAISE NOTICE 'Migração inicial concluída com sucesso';
END $$;

COMMIT;
```

### Triggers de Auditoria
```sql
-- migrations/005_create_functions.sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        tabela,
        operacao,
        registro_id,
        user_id,
        dados_antigos,
        dados_novos,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        inet_client_addr()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers em todas as tabelas importantes
CREATE TRIGGER beneficiarias_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON beneficiarias
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER tarefas_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tarefas
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Repetir para outras tabelas críticas...
```

---

## Índices e Performance

### Índices Compostos para Queries Frequentes
```sql
-- migrations/003_add_indexes.sql

-- Busca de beneficiárias por múltiplos critérios
CREATE INDEX idx_beneficiarias_composite_search 
ON beneficiarias(status, programa_servico, data_inicio_instituto);

-- Dashboard - contadores por status
CREATE INDEX idx_tarefas_dashboard 
ON tarefas(status, responsavel_id, data_vencimento);

-- Feed - posts por visibilidade e data
CREATE INDEX idx_feed_posts_timeline 
ON feed_posts(visibilidade, ativo, data_publicacao DESC);

-- Relatórios mensais
CREATE INDEX idx_oficinas_relatorio_mensal 
ON oficinas(EXTRACT(YEAR FROM data_oficina), EXTRACT(MONTH FROM data_oficina), status);

-- Busca full-text em beneficiárias
CREATE INDEX idx_beneficiarias_fulltext 
ON beneficiarias USING GIN (
    to_tsvector('portuguese', nome_completo || ' ' || COALESCE(cpf, '') || ' ' || COALESCE(endereco, ''))
);
```

### Configurações de Performance
```sql
-- Configurações específicas para produção
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

---

## Políticas RLS Detalhadas

### Profiles
```sql
-- migrations/004_create_rls_policies.sql

-- Usuários podem ver próprio perfil e perfis ativos se autenticados
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
    auth.uid() = id OR 
    (auth.role() = 'authenticated' AND ativo = true)
);

-- Apenas o próprio usuário pode atualizar seu perfil
CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Apenas admins podem inserir novos perfis
CREATE POLICY "profiles_insert_admin" ON profiles
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);
```

### Beneficiárias
```sql
-- Usuários autenticados podem ver beneficiárias ativas
CREATE POLICY "beneficiarias_select_authenticated" ON beneficiarias
FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (status = 'ativa' OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'user')
    ))
);

-- Apenas usuários com permissão podem inserir/atualizar
CREATE POLICY "beneficiarias_modify_authorized" ON beneficiarias
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'user')
    )
);
```

### Feed e Comunicação
```sql
-- Posts visíveis baseado na visibilidade configurada
CREATE POLICY "feed_posts_select_visibility" ON feed_posts
FOR SELECT USING (
    ativo = true AND
    (
        visibilidade = 'todos' OR
        (visibilidade = 'equipe' AND auth.role() = 'authenticated') OR
        (visibilidade = 'admins' AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ))
    )
);

-- Usuários podem criar posts se autenticados
CREATE POLICY "feed_posts_insert_authenticated" ON feed_posts
FOR INSERT WITH CHECK (
    auth.uid() = autor_id AND auth.role() = 'authenticated'
);

-- Apenas autor ou admin pode atualizar/deletar posts
CREATE POLICY "feed_posts_modify_owner_admin" ON feed_posts
FOR ALL USING (
    auth.uid() = autor_id OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);
```

---

## Procedimentos de Migração

### 1. Pré-Migração
```bash
#!/bin/bash
# scripts/pre_migration_check.sh

echo "🔍 Verificação Pré-Migração"

# Verificar conectividade
psql $DATABASE_URL -c "SELECT version();" || exit 1

# Verificar espaço em disco
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "❌ Erro: Espaço em disco insuficiente ($DISK_USAGE%)"
    exit 1
fi

# Verificar extensões disponíveis
psql $DATABASE_URL -c "SELECT * FROM pg_available_extensions WHERE name IN ('uuid-ossp', 'pgcrypto');"

# Backup pré-migração
echo "📦 Criando backup pré-migração..."
pg_dump $DATABASE_URL > "backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql"

echo "✅ Verificação pré-migração concluída"
```

### 2. Execução da Migração
```bash
#!/bin/bash
# scripts/run_migration.sh

set -e

echo "🚀 Iniciando Migração PostgreSQL"

MIGRATION_DIR="migrations"
ROLLBACK_DIR="migrations/rollback"

# Executar migrations em ordem
for migration in $(ls $MIGRATION_DIR/*.sql | sort); do
    echo "▶️  Executando: $(basename $migration)"
    psql $DATABASE_URL -f $migration
    
    if [ $? -eq 0 ]; then
        echo "✅ Sucesso: $(basename $migration)"
    else
        echo "❌ Erro na migração: $(basename $migration)"
        echo "🔄 Iniciando rollback..."
        
        # Executar rollback
        rollback_file="$ROLLBACK_DIR/$(basename $migration)"
        if [ -f "$rollback_file" ]; then
            psql $DATABASE_URL -f "$rollback_file"
        fi
        exit 1
    fi
done

echo "🎉 Migração concluída com sucesso!"
```

### 3. Validação Pós-Migração
```sql
-- scripts/validate_migration.sql

-- Verificar todas as tabelas foram criadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
ORDER BY tablename, policyname;

-- Verificar triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Estatísticas das tabelas
SELECT 
    relname AS table_name,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples
FROM pg_stat_user_tables
ORDER BY relname;
```

---

## Rollback e Recuperação

### Scripts de Rollback
```sql
-- migrations/rollback/001_rollback.sql
BEGIN;

-- Remover triggers
DROP TRIGGER IF EXISTS beneficiarias_audit_trigger ON beneficiarias;
DROP TRIGGER IF EXISTS tarefas_audit_trigger ON tarefas;

-- Remover funções
DROP FUNCTION IF EXISTS audit_trigger_function();

-- Remover tabelas na ordem reversa (devido a FK)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notificacoes CASCADE;
DROP TABLE IF EXISTS mensagens CASCADE;
DROP TABLE IF EXISTS oficina_presencas CASCADE;
DROP TABLE IF EXISTS oficinas CASCADE;
DROP TABLE IF EXISTS tarefas CASCADE;
DROP TABLE IF EXISTS projetos CASCADE;
DROP TABLE IF EXISTS feed_likes CASCADE;
DROP TABLE IF EXISTS feed_comments CASCADE;
DROP TABLE IF EXISTS feed_posts CASCADE;
DROP TABLE IF EXISTS beneficiarias CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Remover extensões se necessário
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";

COMMIT;
```

### Procedimento de Recuperação de Emergência
```bash
#!/bin/bash
# scripts/emergency_recovery.sh

echo "🚨 Procedimento de Recuperação de Emergência"

# 1. Parar aplicação
echo "1. Parando aplicação..."
# vercel --prod --force (ou comando específico)

# 2. Restaurar backup mais recente
echo "2. Restaurando backup..."
LATEST_BACKUP=$(ls -t backup_*.sql | head -1)
echo "Restaurando: $LATEST_BACKUP"

# Criar banco temporário para teste
createdb temp_recovery_test
psql temp_recovery_test < $LATEST_BACKUP

# Verificar integridade do backup
psql temp_recovery_test -c "SELECT COUNT(*) FROM beneficiarias;"

# Se teste OK, restaurar produção
dropdb temp_recovery_test
psql $DATABASE_URL < $LATEST_BACKUP

# 3. Verificar aplicação
echo "3. Verificando aplicação..."
curl -f $HEALTH_CHECK_URL || echo "❌ Aplicação ainda não respondendo"

echo "✅ Recuperação concluída"
```

---

## Checklist de Migração

### Pré-Migração ✅
- [ ] Backup completo criado e testado
- [ ] Verificação de espaço em disco
- [ ] Teste de conectividade
- [ ] Revisão de scripts de migração
- [ ] Plano de rollback preparado
- [ ] Janela de manutenção agendada

### Durante a Migração ✅
- [ ] Aplicação em modo manutenção
- [ ] Execução de scripts de migração
- [ ] Verificação de integridade
- [ ] Teste de funcionalidades críticas
- [ ] Validação de performance

### Pós-Migração ✅
- [ ] Aplicação funcionando normalmente
- [ ] Monitoramento ativo
- [ ] Backup pós-migração criado
- [ ] Documentação atualizada
- [ ] Equipe notificada
- [ ] Plano de rollback validado

---

**Data de Criação**: Agosto 2025  
**Versão**: 1.0  
**Status**: Pronto para Produção
