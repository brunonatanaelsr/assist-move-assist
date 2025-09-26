-- Função para gerar relatório por período
CREATE OR REPLACE FUNCTION gerar_relatorio_periodo(
    p_data_inicio DATE,
    p_data_fim DATE,
    OUT total_beneficiarias INTEGER,
    OUT novas_beneficiarias INTEGER,
    OUT total_atendimentos INTEGER,
    OUT media_presenca NUMERIC,
    OUT oficinas_realizadas INTEGER,
    OUT documentos_processados INTEGER
) AS $$
BEGIN
    -- Total de beneficiárias ativas no período
    SELECT COUNT(DISTINCT b.id)
    INTO total_beneficiarias
    FROM beneficiarias b
    WHERE b.data_cadastro <= p_data_fim
    AND (b.data_desligamento IS NULL OR b.data_desligamento > p_data_inicio);

    -- Novas beneficiárias no período
    SELECT COUNT(*)
    INTO novas_beneficiarias
    FROM beneficiarias
    WHERE data_cadastro BETWEEN p_data_inicio AND p_data_fim;

    -- Total de atendimentos realizados
    SELECT COUNT(*)
    INTO total_atendimentos
    FROM atendimentos
    WHERE data_inicio BETWEEN p_data_inicio AND p_data_fim;

    -- Média de presença em oficinas
    SELECT COALESCE(AVG(p.presenca::int), 0)
    INTO media_presenca
    FROM participacoes p
    JOIN oficinas o ON p.oficina_id = o.id
    WHERE o.data BETWEEN p_data_inicio AND p_data_fim;

    -- Oficinas realizadas
    SELECT COUNT(DISTINCT id)
    INTO oficinas_realizadas
    FROM oficinas
    WHERE data BETWEEN p_data_inicio AND p_data_fim;

    -- Documentos processados
    SELECT COUNT(*)
    INTO documentos_processados
    FROM documentos
    WHERE data_upload BETWEEN p_data_inicio AND p_data_fim;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular métricas de beneficiária
CREATE OR REPLACE FUNCTION calcular_metricas_beneficiaria(
    p_beneficiaria_id UUID,
    OUT progresso_documentacao NUMERIC,
    OUT indice_participacao NUMERIC,
    OUT nivel_engajamento TEXT,
    OUT sugestoes_intervencao TEXT[]
) AS $$
DECLARE
    v_documentos_principais INTEGER;
    v_total_oficinas INTEGER;
    v_presencas INTEGER;
    v_ultimo_atendimento DATE;
BEGIN
    -- Verificar documentação
    SELECT 
        COUNT(CASE WHEN documento_principal THEN 1 END),
        COUNT(*)
    INTO v_documentos_principais, progresso_documentacao
    FROM documentos
    WHERE beneficiaria_id = p_beneficiaria_id;

    progresso_documentacao := COALESCE(v_documentos_principais::numeric / 5 * 100, 0);

    -- Calcular índice de participação
    SELECT 
        COUNT(DISTINCT o.id),
        COUNT(CASE WHEN p.presenca THEN 1 END)
    INTO v_total_oficinas, v_presencas
    FROM oficinas o
    LEFT JOIN participacoes p ON o.id = p.oficina_id
    WHERE p.beneficiaria_id = p_beneficiaria_id;

    indice_participacao := CASE 
        WHEN v_total_oficinas > 0 THEN
            (v_presencas::numeric / v_total_oficinas * 100)
        ELSE 0
    END;

    -- Determinar nível de engajamento
    SELECT MAX(data_atendimento)
    INTO v_ultimo_atendimento
    FROM atendimentos
    WHERE beneficiaria_id = p_beneficiaria_id;

    nivel_engajamento := CASE
        WHEN indice_participacao >= 75 AND v_ultimo_atendimento > CURRENT_DATE - 30 THEN
            'Alto'
        WHEN indice_participacao >= 50 OR v_ultimo_atendimento > CURRENT_DATE - 60 THEN
            'Médio'
        ELSE
            'Baixo'
    END;

    -- Gerar sugestões de intervenção
    sugestoes_intervencao := ARRAY[]::TEXT[];
    
    IF progresso_documentacao < 100 THEN
        sugestoes_intervencao := array_append(
            sugestoes_intervencao, 
            'Agendar atendimento para completar documentação'
        );
    END IF;

    IF indice_participacao < 50 THEN
        sugestoes_intervencao := array_append(
            sugestoes_intervencao,
            'Realizar busca ativa para identificar barreiras de participação'
        );
    END IF;

    IF v_ultimo_atendimento IS NULL OR v_ultimo_atendimento < CURRENT_DATE - 60 THEN
        sugestoes_intervencao := array_append(
            sugestoes_intervencao,
            'Agendar atendimento de acompanhamento'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para estatísticas mensais de oficinas
CREATE OR REPLACE FUNCTION estatisticas_oficinas_mensal(
    p_mes DATE DEFAULT CURRENT_DATE,
    OUT oficina_id UUID,
    OUT titulo TEXT,
    OUT total_vagas INTEGER,
    OUT total_inscritas INTEGER,
    OUT media_presenca NUMERIC,
    OUT indice_evasao NUMERIC
) RETURNS SETOF record AS $$
BEGIN
    RETURN QUERY
    WITH presencas_oficina AS (
        SELECT 
            o.id,
            o.titulo,
            o.vagas,
            COUNT(DISTINCT p.beneficiaria_id) as inscritas,
            AVG(p.presenca::int)::numeric(5,2) as presenca_media,
            COUNT(DISTINCT CASE 
                WHEN p.presenca = false AND p.justificativa IS NULL 
                THEN p.beneficiaria_id 
            END)::numeric / NULLIF(COUNT(DISTINCT p.beneficiaria_id), 0) * 100 as taxa_evasao
        FROM oficinas o
        LEFT JOIN participacoes p ON o.id = p.oficina_id
        WHERE DATE_TRUNC('month', o.data) = DATE_TRUNC('month', p_mes)
        GROUP BY o.id, o.titulo, o.vagas
    )
    SELECT 
        po.id,
        po.titulo,
        po.vagas,
        po.inscritas,
        po.presenca_media * 100,
        po.taxa_evasao
    FROM presencas_oficina po;
END;
$$ LANGUAGE plpgsql;

-- Função para relatório de produtividade customizado
CREATE OR REPLACE FUNCTION relatorio_produtividade_customizado(
    p_data_inicio DATE,
    p_data_fim DATE,
    p_tipo_atividade TEXT[] DEFAULT NULL,
    p_usuario_id UUID DEFAULT NULL
) RETURNS TABLE (
    usuario_id UUID,
    nome_usuario TEXT,
    total_atividades INTEGER,
    horas_trabalhadas NUMERIC,
    media_diaria NUMERIC,
    tipos_atividade TEXT[],
    beneficiarias_atendidas INTEGER,
    eficiencia_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH atividades_periodo AS (
        -- Atendimentos
        SELECT 
            a.realizado_por as usuario_id,
            u.nome as nome_usuario,
            COUNT(*) as total_atividades,
            SUM(EXTRACT(EPOCH FROM (a.data_fim - a.data_inicio))/3600) as horas,
            COUNT(DISTINCT a.beneficiaria_id) as beneficiarias,
            array_agg(DISTINCT a.tipo_atendimento) as tipos
        FROM atendimentos a
        JOIN users u ON a.realizado_por = u.id
        WHERE 
            a.data_inicio BETWEEN p_data_inicio AND p_data_fim
            AND (p_tipo_atividade IS NULL OR 'atendimento' = ANY(p_tipo_atividade))
            AND (p_usuario_id IS NULL OR a.realizado_por = p_usuario_id)
        GROUP BY a.realizado_por, u.nome

        UNION ALL

        -- Oficinas
        SELECT 
            o.responsavel_id,
            u.nome,
            COUNT(*),
            SUM(o.duracao_horas),
            COUNT(DISTINCT p.beneficiaria_id),
            array_agg(DISTINCT o.tipo_oficina)
        FROM oficinas o
        JOIN users u ON o.responsavel_id = u.id
        LEFT JOIN participacoes p ON o.id = p.oficina_id
        WHERE 
            o.data BETWEEN p_data_inicio AND p_data_fim
            AND (p_tipo_atividade IS NULL OR 'oficina' = ANY(p_tipo_atividade))
            AND (p_usuario_id IS NULL OR o.responsavel_id = p_usuario_id)
        GROUP BY o.responsavel_id, u.nome
    )
    SELECT 
        ap.usuario_id,
        ap.nome_usuario,
        SUM(ap.total_atividades)::INTEGER,
        SUM(ap.horas)::numeric(10,2),
        (SUM(ap.horas) / EXTRACT(days FROM p_data_fim - p_data_inicio))::numeric(10,2),
        array_agg(DISTINCT unnest(ap.tipos)),
        SUM(ap.beneficiarias)::INTEGER,
        (
            (SUM(ap.total_atividades) * 0.3) + 
            (SUM(ap.horas) * 0.3) + 
            (SUM(ap.beneficiarias) * 0.4)
        )::numeric(10,2)
    FROM atividades_periodo ap
    GROUP BY ap.usuario_id, ap.nome_usuario;
END;
$$ LANGUAGE plpgsql;
