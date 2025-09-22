-- View completa de beneficiárias com estatísticas
CREATE OR REPLACE VIEW view_beneficiarias_completo AS
WITH 
oficinas_stats AS (
    SELECT 
        p.beneficiaria_id,
        COUNT(DISTINCT p.oficina_id) as total_oficinas,
        AVG(p.presenca::int)::numeric(5,2) as media_presenca,
        SUM(CASE WHEN p.presenca THEN 1 ELSE 0 END) as total_presencas,
        SUM(CASE WHEN NOT p.presenca AND p.justificativa IS NOT NULL THEN 1 ELSE 0 END) as faltas_justificadas
    FROM participacoes p
    GROUP BY p.beneficiaria_id
),
atendimentos_stats AS (
    SELECT 
        a.beneficiaria_id,
        COUNT(*) as total_atendimentos,
        COUNT(DISTINCT tipo_atendimento) as tipos_atendimentos_distintos,
        MAX(data_atendimento) as ultimo_atendimento,
        AVG(EXTRACT(EPOCH FROM (data_fim - data_inicio))/60)::numeric(5,2) as duracao_media_minutos
    FROM atendimentos a
    GROUP BY a.beneficiaria_id
),
documentos_stats AS (
    SELECT 
        d.beneficiaria_id,
        COUNT(*) as total_documentos,
        COUNT(DISTINCT tipo_documento) as tipos_documentos_distintos,
        bool_or(documento_principal) as tem_documentos_principais
    FROM documentos d
    GROUP BY d.beneficiaria_id
)
SELECT 
    b.*,
    -- Dados de endereço formatados
    CONCAT(
        b.endereco, ', ', 
        b.numero, 
        CASE WHEN b.complemento IS NOT NULL THEN CONCAT(' - ', b.complemento) ELSE '' END,
        ' - ',
        b.bairro, ' - ',
        b.cidade, '/', 
        b.estado
    ) as endereco_completo,
    
    -- Estatísticas de oficinas
    COALESCE(o.total_oficinas, 0) as total_oficinas,
    COALESCE(o.media_presenca, 0) as media_presenca,
    COALESCE(o.total_presencas, 0) as total_presencas,
    COALESCE(o.faltas_justificadas, 0) as faltas_justificadas,
    
    -- Estatísticas de atendimentos
    COALESCE(a.total_atendimentos, 0) as total_atendimentos,
    COALESCE(a.tipos_atendimentos_distintos, 0) as tipos_atendimentos_distintos,
    a.ultimo_atendimento,
    COALESCE(a.duracao_media_minutos, 0) as duracao_media_atendimentos,
    
    -- Estatísticas de documentos
    COALESCE(d.total_documentos, 0) as total_documentos,
    COALESCE(d.tipos_documentos_distintos, 0) as tipos_documentos_distintos,
    COALESCE(d.tem_documentos_principais, false) as tem_documentos_principais,
    
    -- Cálculos de tempo
    AGE(CURRENT_DATE, b.data_nascimento) as idade,
    AGE(CURRENT_DATE, b.data_cadastro) as tempo_programa,
    
    -- Status de participação
    CASE 
        WHEN o.total_oficinas > 0 AND o.media_presenca >= 0.75 THEN 'Ativa'
        WHEN o.total_oficinas > 0 AND o.media_presenca >= 0.5 THEN 'Parcial'
        WHEN o.total_oficinas > 0 THEN 'Baixa Participação'
        ELSE 'Sem Participação'
    END as status_participacao
FROM 
    beneficiarias b
    LEFT JOIN oficinas_stats o ON b.id = o.beneficiaria_id
    LEFT JOIN atendimentos_stats a ON b.id = a.beneficiaria_id
    LEFT JOIN documentos_stats d ON b.id = d.beneficiaria_id;

-- View de participação em oficinas
CREATE OR REPLACE VIEW view_participacao_oficinas AS
WITH meses_oficina AS (
    SELECT DISTINCT
        DATE_TRUNC('month', o.data) as mes,
        o.id as oficina_id,
        o.titulo
    FROM oficinas o
),
participacoes_mensais AS (
    SELECT 
        b.id as beneficiaria_id,
        b.nome_completo,
        mo.mes,
        mo.oficina_id,
        mo.titulo as oficina_titulo,
        COUNT(p.id) as total_encontros,
        SUM(p.presenca::int) as total_presencas,
        SUM(CASE WHEN NOT p.presenca AND p.justificativa IS NOT NULL THEN 1 ELSE 0 END) as faltas_justificadas,
        STRING_AGG(DISTINCT p.justificativa, '; ') FILTER (WHERE p.justificativa IS NOT NULL) as justificativas
    FROM 
        beneficiarias b
        CROSS JOIN meses_oficina mo
        LEFT JOIN participacoes p ON b.id = p.beneficiaria_id 
            AND mo.oficina_id = p.oficina_id
            AND DATE_TRUNC('month', p.data) = mo.mes
    GROUP BY 
        b.id, b.nome_completo, mo.mes, mo.oficina_id, mo.titulo
)
SELECT 
    beneficiaria_id,
    nome_completo,
    mes,
    oficina_id,
    oficina_titulo,
    total_encontros,
    total_presencas,
    faltas_justificadas,
    justificativas,
    CASE 
        WHEN total_encontros > 0 THEN 
            (total_presencas::numeric / total_encontros * 100)::numeric(5,2)
        ELSE 0
    END as percentual_presenca,
    CASE
        WHEN (total_presencas::numeric / total_encontros) >= 0.75 THEN 'Ótima'
        WHEN (total_presencas::numeric / total_encontros) >= 0.5 THEN 'Regular'
        ELSE 'Baixa'
    END as classificacao_participacao
FROM participacoes_mensais;

-- View de produtividade da equipe
CREATE OR REPLACE VIEW view_produtividade_equipe AS
WITH atendimentos_stats AS (
    SELECT 
        u.id as user_id,
        u.nome as nome_usuario,
        DATE_TRUNC('month', a.data_inicio) as mes,
        COUNT(*) as total_atendimentos,
        COUNT(DISTINCT a.beneficiaria_id) as beneficiarias_atendidas,
        AVG(EXTRACT(EPOCH FROM (a.data_fim - a.data_inicio))/60)::numeric(5,2) as duracao_media_minutos,
        COUNT(DISTINCT a.tipo_atendimento) as tipos_atendimento
    FROM 
        users u
        LEFT JOIN atendimentos a ON u.id = a.realizado_por
    GROUP BY u.id, u.nome, DATE_TRUNC('month', a.data_inicio)
),
oficinas_stats AS (
    SELECT 
        u.id as user_id,
        DATE_TRUNC('month', o.data) as mes,
        COUNT(DISTINCT o.id) as total_oficinas,
        COUNT(DISTINCT p.beneficiaria_id) as total_participantes,
        AVG(p.presenca::int)::numeric(5,2) as media_presenca
    FROM 
        users u
        LEFT JOIN oficinas o ON u.id = o.responsavel_id
        LEFT JOIN participacoes p ON o.id = p.oficina_id
    GROUP BY u.id, DATE_TRUNC('month', o.data)
)
SELECT 
    a.user_id,
    a.nome_usuario,
    a.mes,
    a.total_atendimentos,
    a.beneficiarias_atendidas,
    a.duracao_media_minutos,
    a.tipos_atendimento,
    COALESCE(o.total_oficinas, 0) as total_oficinas,
    COALESCE(o.total_participantes, 0) as total_participantes,
    COALESCE(o.media_presenca, 0) as media_presenca_oficinas,
    -- Cálculo de pontuação de produtividade
    (
        (a.total_atendimentos * 2) + 
        (a.beneficiarias_atendidas * 3) +
        (COALESCE(o.total_oficinas, 0) * 5) +
        (COALESCE(o.total_participantes, 0) * 0.5)
    )::numeric(8,2) as pontuacao_produtividade
FROM 
    atendimentos_stats a
    LEFT JOIN oficinas_stats o ON a.user_id = o.user_id AND a.mes = o.mes;

-- View de timeline de atividades
CREATE OR REPLACE VIEW view_timeline_atividades AS
WITH todas_atividades AS (
    -- Atendimentos
    SELECT
        'atendimento' as tipo_atividade,
        a.id as atividade_id,
        a.beneficiaria_id,
        a.data_inicio as data_atividade,
        a.tipo_atendimento as subtipo,
        u.nome as responsavel,
        a.observacoes as descricao,
        NULL as local
    FROM atendimentos a
    JOIN users u ON a.realizado_por = u.id
    
    UNION ALL
    
    -- Oficinas
    SELECT
        'oficina' as tipo_atividade,
        o.id as atividade_id,
        p.beneficiaria_id,
        o.data as data_atividade,
        o.titulo as subtipo,
        u.nome as responsavel,
        o.descricao,
        o.local
    FROM oficinas o
    JOIN participacoes p ON o.id = p.oficina_id
    JOIN users u ON o.responsavel_id = u.id
    
    UNION ALL
    
    -- Documentos
    SELECT
        'documento' as tipo_atividade,
        d.id as atividade_id,
        d.beneficiaria_id,
        d.data_upload as data_atividade,
        d.tipo_documento as subtipo,
        u.nome as responsavel,
        d.nome_arquivo as descricao,
        NULL as local
    FROM documentos d
    JOIN users u ON d.uploaded_by = u.id
)
SELECT 
    ta.*,
    b.nome_completo as beneficiaria_nome,
    ROW_NUMBER() OVER (
        PARTITION BY ta.beneficiaria_id 
        ORDER BY ta.data_atividade
    ) as sequencia_atividade,
    LEAD(ta.data_atividade) OVER (
        PARTITION BY ta.beneficiaria_id 
        ORDER BY ta.data_atividade
    ) - ta.data_atividade as tempo_ate_proxima_atividade
FROM todas_atividades ta
JOIN beneficiarias b ON ta.beneficiaria_id = b.id;
