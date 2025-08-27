-- Configurações de teste para PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Configurações de performance para testes
ALTER SYSTEM SET 
    shared_buffers = '128MB',
    work_mem = '4MB',
    maintenance_work_mem = '32MB',
    random_page_cost = 1.1,
    effective_cache_size = '256MB',
    effective_io_concurrency = 200;

-- Funções auxiliares para testes
CREATE OR REPLACE FUNCTION truncate_all_tables() RETURNS void AS $$
DECLARE
    statements CURSOR FOR
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND 
              tablename NOT IN ('migrations', 'migrations_lock');
BEGIN
    FOR stmt IN statements LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(stmt.tablename) || ' CASCADE;';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para resetar sequências
CREATE OR REPLACE FUNCTION reset_all_sequences() RETURNS void AS $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_record.sequencename || ' RESTART WITH 1;';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar integridade referencial
CREATE OR REPLACE FUNCTION check_referential_integrity() RETURNS TABLE (
    table_name text,
    constraint_name text,
    referenced_table text,
    valid boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.table_name::text,
        tc.constraint_name::text,
        ccu.table_name::text as referenced_table,
        true as valid
    FROM 
        information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND EXISTS (
        SELECT 1
        FROM information_schema.referential_constraints rc
        WHERE rc.constraint_name = tc.constraint_name
    );
END;
$$ LANGUAGE plpgsql;

-- Função para simular carga em tabelas
CREATE OR REPLACE FUNCTION generate_test_load(
    p_table_name text,
    p_num_rows integer
) RETURNS void AS $$
BEGIN
    CASE p_table_name
    WHEN 'beneficiarias' THEN
        INSERT INTO beneficiarias (
            nome_completo,
            cpf,
            data_nascimento,
            telefone,
            email,
            endereco,
            created_at
        )
        SELECT
            'Beneficiária Teste ' || i,
            LPAD(i::text, 11, '0'),
            CURRENT_DATE - (RANDOM() * 10000)::integer,
            LPAD(FLOOR(RANDOM() * 99999999999)::text, 11, '0'),
            'teste' || i || '@exemplo.com',
            'Rua Teste ' || i,
            NOW() - (RANDOM() * 365)::integer * INTERVAL '1 day'
        FROM generate_series(1, p_num_rows) i;
        
    WHEN 'oficinas' THEN
        INSERT INTO oficinas (
            titulo,
            descricao,
            data,
            responsavel_id,
            created_at
        )
        SELECT
            'Oficina Teste ' || i,
            'Descrição da oficina ' || i,
            CURRENT_DATE + (i % 30) * INTERVAL '1 day',
            (SELECT id FROM users ORDER BY RANDOM() LIMIT 1),
            NOW() - (RANDOM() * 365)::integer * INTERVAL '1 day'
        FROM generate_series(1, p_num_rows) i;
        
    ELSE
        RAISE EXCEPTION 'Tabela % não suportada', p_table_name;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Configuração de usuário de teste
CREATE ROLE test_user WITH LOGIN PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test_user;

-- Configurações de logging para testes
ALTER DATABASE test_db SET log_statement = 'all';
ALTER DATABASE test_db SET log_duration = on;
ALTER DATABASE test_db SET log_min_duration_statement = 100; -- ms

-- Índices específicos para testes
CREATE INDEX IF NOT EXISTS idx_test_beneficiarias_created_at 
ON beneficiarias(created_at);

CREATE INDEX IF NOT EXISTS idx_test_oficinas_data 
ON oficinas(data);

-- Visão para monitoramento de testes
CREATE OR REPLACE VIEW test_execution_stats AS
SELECT
    schemaname,
    relname as table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
FROM pg_stat_user_tables
WHERE schemaname = 'public';
