-- Script para corrigir as views do dashboard
-- Criado em 19/08/2025

-- 1. Dropar as views existentes se houver
DROP MATERIALIZED VIEW IF EXISTS mv_beneficiarias_stats;
DROP MATERIALIZED VIEW IF EXISTS mv_oficinas_stats;
DROP MATERIALIZED VIEW IF EXISTS mv_projetos_stats;

-- 2. Recriar as views com queries otimizadas
CREATE MATERIALIZED VIEW mv_beneficiarias_stats AS
SELECT 
    date_trunc('month', b.data_cadastro) as month,
    COUNT(DISTINCT b.id) as total_registros,
    COUNT(DISTINCT CASE WHEN b.status = 'ativa' AND b.ativo = true THEN b.id END) as ativas,
    COUNT(DISTINCT CASE WHEN b.status = 'inativa' OR b.ativo = false THEN b.id END) as inativas,
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.ativo = true THEN b.id END) as com_participacao,
    COUNT(DISTINCT CASE WHEN dc.id IS NOT NULL AND dc.ativo = true THEN b.id END) as com_declaracoes,
    NOW() as ultima_atualizacao
FROM beneficiarias b
LEFT JOIN participacoes p ON b.id = p.beneficiaria_id AND p.ativo = true
LEFT JOIN declaracoes_comparecimento dc ON b.id = dc.beneficiaria_id AND dc.ativo = true
GROUP BY date_trunc('month', b.data_cadastro)
WITH DATA;

CREATE MATERIALIZED VIEW mv_oficinas_stats AS
SELECT 
    date_trunc('month', o.data_inicio) as month,
    COUNT(DISTINCT o.id) as total_oficinas,
    COALESCE(SUM(o.vagas_totais), 0) as total_vagas,
    COALESCE(SUM(o.vagas_ocupadas), 0) as vagas_ocupadas,
    COUNT(DISTINCT CASE WHEN p.ativo = true THEN p.beneficiaria_id END) as total_participantes,
    ROUND(AVG(CASE WHEN p.avaliacao IS NOT NULL AND p.ativo = true THEN p.avaliacao ELSE NULL END), 2) as media_avaliacao,
    NOW() as ultima_atualizacao
FROM oficinas o
LEFT JOIN participacoes p ON o.id = p.oficina_id 
WHERE o.ativo = true
GROUP BY date_trunc('month', o.data_inicio)
WITH DATA;

CREATE MATERIALIZED VIEW mv_projetos_stats AS
SELECT 
    date_trunc('month', p.data_inicio) as month,
    COUNT(DISTINCT p.id) as total_projetos,
    COUNT(DISTINCT o.id) as total_oficinas,
    COUNT(DISTINCT CASE WHEN pa.ativo = true THEN pa.beneficiaria_id END) as total_beneficiarias,
    COALESCE(SUM(p.orcamento), 0) as orcamento_total,
    NOW() as ultima_atualizacao
FROM projetos p
LEFT JOIN oficinas o ON p.id = o.projeto_id AND o.ativo = true
LEFT JOIN participacoes pa ON o.id = pa.oficina_id 
WHERE p.ativo = true
GROUP BY date_trunc('month', p.data_inicio)
WITH DATA;

-- 3. Criar índices para melhorar performance
CREATE UNIQUE INDEX idx_mv_beneficiarias_stats_month ON mv_beneficiarias_stats(month);
CREATE UNIQUE INDEX idx_mv_oficinas_stats_month ON mv_oficinas_stats(month);
CREATE UNIQUE INDEX idx_mv_projetos_stats_month ON mv_projetos_stats(month);

-- 4. Adicionar função para atualização concorrente das views
CREATE OR REPLACE FUNCTION refresh_dashboard_stats() 
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_beneficiarias_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_oficinas_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_projetos_stats;
    
    INSERT INTO maintenance_log (operation, executed_at, details)
    VALUES (
        'refresh_dashboard_stats',
        NOW(),
        jsonb_build_object(
            'views_refreshed', jsonb_build_array(
                'mv_beneficiarias_stats',
                'mv_oficinas_stats',
                'mv_projetos_stats'
            )
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Registrar na tabela de manutenção
INSERT INTO maintenance_log (operation, executed_at, details)
VALUES (
    'fix_dashboard_views',
    NOW(),
    jsonb_build_object(
        'action', 'Views recriadas com queries otimizadas',
        'views', jsonb_build_array(
            'mv_beneficiarias_stats',
            'mv_oficinas_stats',
            'mv_projetos_stats'
        )
    )
);
