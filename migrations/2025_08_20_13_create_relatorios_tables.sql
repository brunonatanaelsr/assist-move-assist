-- Migration: 2025_08_20_13_create_relatorios_tables.sql

-- Enum para tipo de relatório
CREATE TYPE tipo_relatorio AS ENUM (
    'beneficiarias',
    'projetos',
    'oficinas',
    'atendimentos',
    'financeiro',
    'impacto',
    'customizado'
);

-- Enum para periodicidade
CREATE TYPE periodicidade_relatorio AS ENUM (
    'diario',
    'semanal',
    'mensal',
    'trimestral',
    'semestral',
    'anual',
    'sob_demanda'
);

-- Tabela principal de relatórios
CREATE TABLE IF NOT EXISTS relatorios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo tipo_relatorio NOT NULL,
    query TEXT NOT NULL,
    parametros JSONB,
    colunas JSONB NOT NULL,
    filtros JSONB,
    agrupamentos JSONB,
    ordenacao JSONB,
    criado_por INTEGER NOT NULL REFERENCES usuarios(id),
    compartilhado BOOLEAN NOT NULL DEFAULT false,
    cache_tempo INTEGER, -- Em minutos
    ultima_execucao TIMESTAMP,
    periodicidade periodicidade_relatorio NOT NULL DEFAULT 'sob_demanda',
    proximo_agendamento TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Execuções dos relatórios
CREATE TABLE IF NOT EXISTS execucoes_relatorio (
    id SERIAL PRIMARY KEY,
    relatorio_id INTEGER NOT NULL REFERENCES relatorios(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    parametros_execucao JSONB,
    tempo_execucao INTEGER, -- Em milissegundos
    registros_processados INTEGER,
    status VARCHAR(50) NOT NULL,
    erro TEXT,
    resultado_cache JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agendamentos de relatórios
CREATE TABLE IF NOT EXISTS agendamentos_relatorio (
    id SERIAL PRIMARY KEY,
    relatorio_id INTEGER NOT NULL REFERENCES relatorios(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    periodicidade periodicidade_relatorio NOT NULL,
    parametros JSONB,
    proxima_execucao TIMESTAMP NOT NULL,
    ultimo_sucesso TIMESTAMP,
    ativo BOOLEAN NOT NULL DEFAULT true,
    notificar_email BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Compartilhamentos de relatórios
CREATE TABLE IF NOT EXISTS compartilhamentos_relatorio (
    id SERIAL PRIMARY KEY,
    relatorio_id INTEGER NOT NULL REFERENCES relatorios(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    permissao VARCHAR(50) NOT NULL DEFAULT 'visualizar',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Exportações de relatórios
CREATE TABLE IF NOT EXISTS exportacoes_relatorio (
    id SERIAL PRIMARY KEY,
    execucao_id INTEGER NOT NULL REFERENCES execucoes_relatorio(id) ON DELETE CASCADE,
    formato VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tamanho INTEGER NOT NULL,
    tempo_geracao INTEGER, -- Em milissegundos
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_tamanho CHECK (tamanho > 0)
);

-- Views materializadas para relatórios frequentes
CREATE MATERIALIZED VIEW relatorio_beneficiarias_resumo AS
SELECT 
    b.id,
    b.nome_completo,
    b.status,
    b.cidade,
    b.estado,
    COUNT(DISTINCT pp.projeto_id) as total_projetos,
    COUNT(DISTINCT po.oficina_id) as total_oficinas,
    COUNT(DISTINCT ha.id) as total_atendimentos
FROM beneficiarias b
LEFT JOIN participacao_projetos pp ON b.id = pp.beneficiaria_id
LEFT JOIN participantes_oficina po ON b.id = po.beneficiaria_id
LEFT JOIN historico_atendimentos ha ON b.id = ha.beneficiaria_id
GROUP BY b.id, b.nome_completo, b.status, b.cidade, b.estado
WITH DATA;

CREATE UNIQUE INDEX idx_relatorio_beneficiarias_resumo ON relatorio_beneficiarias_resumo(id);

-- View materializada para resumo de projetos
CREATE MATERIALIZED VIEW relatorio_projetos_resumo AS
SELECT 
    p.id,
    p.nome,
    p.status,
    p.data_inicio,
    p.data_fim,
    COUNT(DISTINCT pb.beneficiaria_id) as total_beneficiarias,
    COUNT(DISTINCT o.id) as total_oficinas,
    COALESCE(SUM(op.valor_realizado), 0) as total_orcamento_realizado
FROM projetos p
LEFT JOIN participacao_projetos pb ON p.id = pb.projeto_id
LEFT JOIN oficinas o ON p.id = o.projeto_id
LEFT JOIN orcamento_projeto op ON p.id = op.projeto_id
GROUP BY p.id, p.nome, p.status, p.data_inicio, p.data_fim
WITH DATA;

CREATE UNIQUE INDEX idx_relatorio_projetos_resumo ON relatorio_projetos_resumo(id);

-- Triggers para atualização automática
CREATE TRIGGER update_relatorios_updated_at
    BEFORE UPDATE ON relatorios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agendamentos_relatorio_updated_at
    BEFORE UPDATE ON agendamentos_relatorio
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar views materializadas
CREATE OR REPLACE FUNCTION atualizar_views_relatorios()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY relatorio_beneficiarias_resumo;
    REFRESH MATERIALIZED VIEW CONCURRENTLY relatorio_projetos_resumo;
END;
$$ LANGUAGE plpgsql;

-- Agendar atualização das views (requer extensão pg_cron)
SELECT cron.schedule(
    'atualizar-views-relatorios',
    '0 3 * * *', -- Todo dia às 3 da manhã
    $$SELECT atualizar_views_relatorios()$$
);

-- Função para verificar permissão de relatório
CREATE OR REPLACE FUNCTION verificar_permissao_relatorio(
    p_relatorio_id INTEGER,
    p_usuario_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM relatorios r
        LEFT JOIN compartilhamentos_relatorio cr 
            ON r.id = cr.relatorio_id 
            AND cr.usuario_id = p_usuario_id
        WHERE r.id = p_relatorio_id
        AND (r.criado_por = p_usuario_id 
             OR r.compartilhado = true 
             OR cr.id IS NOT NULL)
    );
END;
$$ LANGUAGE plpgsql;

-- Índices
CREATE INDEX idx_relatorios_tipo ON relatorios(tipo);
CREATE INDEX idx_relatorios_criador ON relatorios(criado_por);
CREATE INDEX idx_execucoes_relatorio ON execucoes_relatorio(relatorio_id);
CREATE INDEX idx_execucoes_status ON execucoes_relatorio(status);
CREATE INDEX idx_agendamentos_relatorio ON agendamentos_relatorio(relatorio_id);
CREATE INDEX idx_agendamentos_proxima ON agendamentos_relatorio(proxima_execucao);
CREATE INDEX idx_compartilhamentos_relatorio ON compartilhamentos_relatorio(relatorio_id);
CREATE INDEX idx_exportacoes_execucao ON exportacoes_relatorio(execucao_id);
