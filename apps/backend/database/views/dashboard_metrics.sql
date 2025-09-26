-- Criar extensão pgcrypto se não existir
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- View de estatísticas de beneficiárias
CREATE MATERIALIZED VIEW view_beneficiarias_stats AS
WITH beneficiarias_mes AS (
    SELECT
        date_trunc('month', data_cadastro) as mes_referencia,
        programa_servico,
        status,
        COUNT(*) as total
    FROM beneficiarias
    GROUP BY 
        date_trunc('month', data_cadastro),
        programa_servico,
        status
)
SELECT
    mes_referencia,
    SUM(total) as total_beneficiarias,
    SUM(CASE WHEN status = 'ativo' THEN total ELSE 0 END) as beneficiarias_ativas,
    SUM(CASE WHEN status = 'inativo' THEN total ELSE 0 END) as beneficiarias_inativas,
    programa_servico,
    SUM(total) as total_por_programa
FROM beneficiarias_mes
GROUP BY mes_referencia, programa_servico
WITH DATA;

-- View de estatísticas de oficinas
CREATE MATERIALIZED VIEW view_oficinas_stats AS
WITH presencas_consolidadas AS (
    SELECT
        o.id as oficina_id,
        o.data_oficina,
        o.capacidade_maxima,
        COUNT(DISTINCT p.beneficiaria_id) FILTER (WHERE p.presente = true) as presentes
    FROM oficinas o
    LEFT JOIN oficina_presencas p ON o.id = p.oficina_id
    WHERE o.status != 'cancelada'
    GROUP BY o.id, o.data_oficina, o.capacidade_maxima
)
SELECT
    date_trunc('month', data_oficina) as mes,
    COUNT(DISTINCT oficina_id) as total_oficinas,
    ROUND(AVG(CAST(presentes AS FLOAT) / NULLIF(capacidade_maxima, 0)) * 100, 2) as taxa_ocupacao,
    SUM(presentes) as total_participantes
FROM presencas_consolidadas
GROUP BY date_trunc('month', data_oficina)
WITH DATA;

-- View de estatísticas de tarefas
CREATE MATERIALIZED VIEW view_tarefas_stats AS
WITH tarefas_responsavel AS (
    SELECT
        responsavel_id,
        u.nome as responsavel_nome,
        status,
        COUNT(*) as total,
        AVG(CASE 
            WHEN status = 'concluida' 
            THEN EXTRACT(EPOCH FROM data_conclusao - data_criacao)
            ELSE NULL
        END) as tempo_medio_conclusao
    FROM tarefas t
    JOIN usuarios u ON t.responsavel_id = u.id
    GROUP BY responsavel_id, u.nome, status
)
SELECT
    responsavel_id,
    responsavel_nome,
    SUM(total) as total_tarefas,
    SUM(CASE WHEN status = 'pendente' THEN total ELSE 0 END) as pendentes,
    SUM(CASE WHEN status = 'concluida' THEN total ELSE 0 END) as concluidas,
    ROUND(AVG(tempo_medio_conclusao) / 86400.0, 2) as media_dias_conclusao
FROM tarefas_responsavel
GROUP BY responsavel_id, responsavel_nome
WITH DATA;

-- View de engajamento do feed
CREATE MATERIALIZED VIEW view_feed_engagement AS
WITH post_stats AS (
    SELECT
        date_trunc('month', data_criacao) as mes,
        COUNT(*) as total_posts,
        COUNT(DISTINCT autor_id) as autores_unicos
    FROM posts
    GROUP BY date_trunc('month', data_criacao)
),
interacao_stats AS (
    SELECT
        date_trunc('month', c.data_criacao) as mes,
        COUNT(DISTINCT c.id) as total_comentarios,
        COUNT(DISTINCT r.id) as total_reacoes
    FROM posts p
    LEFT JOIN comentarios c ON p.id = c.post_id
    LEFT JOIN reacoes r ON p.id = r.post_id
    GROUP BY date_trunc('month', c.data_criacao)
)
SELECT
    COALESCE(p.mes, i.mes) as mes,
    COALESCE(p.total_posts, 0) as total_posts,
    COALESCE(p.autores_unicos, 0) as autores_unicos,
    COALESCE(i.total_comentarios, 0) as total_comentarios,
    COALESCE(i.total_reacoes, 0) as total_reacoes,
    CASE 
        WHEN COALESCE(p.total_posts, 0) > 0 
        THEN ROUND(CAST(COALESCE(i.total_comentarios, 0) + COALESCE(i.total_reacoes, 0) AS FLOAT) / COALESCE(p.total_posts, 1), 2)
        ELSE 0
    END as taxa_engajamento
FROM post_stats p
FULL OUTER JOIN interacao_stats i ON p.mes = i.mes
WITH DATA;

-- Função para refresh das views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_beneficiarias_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_oficinas_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_tarefas_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_feed_engagement;
END;
$$ LANGUAGE plpgsql;

-- Índices para otimização
CREATE UNIQUE INDEX idx_beneficiarias_stats_mes_programa 
ON view_beneficiarias_stats(mes_referencia, programa_servico);

CREATE UNIQUE INDEX idx_oficinas_stats_mes 
ON view_oficinas_stats(mes);

CREATE UNIQUE INDEX idx_tarefas_stats_responsavel 
ON view_tarefas_stats(responsavel_id);

CREATE UNIQUE INDEX idx_feed_engagement_mes 
ON view_feed_engagement(mes);
