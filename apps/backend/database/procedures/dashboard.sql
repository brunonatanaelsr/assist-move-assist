-- Procedimento para calcular métricas de crescimento
CREATE OR REPLACE PROCEDURE calcular_metricas_crescimento(
    IN data_inicio DATE,
    IN data_fim DATE,
    OUT crescimento_beneficiarias NUMERIC,
    OUT crescimento_oficinas NUMERIC,
    OUT taxa_retencao NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    beneficiarias_anterior INT;
    beneficiarias_atual INT;
    oficinas_anterior INT;
    oficinas_atual INT;
    beneficiarias_retidas INT;
BEGIN
    -- Calcular crescimento de beneficiárias
    SELECT COUNT(*) INTO beneficiarias_anterior
    FROM beneficiarias
    WHERE data_cadastro < data_inicio;

    SELECT COUNT(*) INTO beneficiarias_atual
    FROM beneficiarias
    WHERE data_cadastro <= data_fim;

    IF beneficiarias_anterior > 0 THEN
        crescimento_beneficiarias := ROUND(((beneficiarias_atual::NUMERIC - beneficiarias_anterior) / beneficiarias_anterior) * 100, 2);
    ELSE
        crescimento_beneficiarias := 0;
    END IF;

    -- Calcular crescimento de oficinas
    SELECT COUNT(*) INTO oficinas_anterior
    FROM oficinas
    WHERE data_oficina < data_inicio;

    SELECT COUNT(*) INTO oficinas_atual
    FROM oficinas
    WHERE data_oficina <= data_fim;

    IF oficinas_anterior > 0 THEN
        crescimento_oficinas := ROUND(((oficinas_atual::NUMERIC - oficinas_anterior) / oficinas_anterior) * 100, 2);
    ELSE
        crescimento_oficinas := 0;
    END IF;

    -- Calcular taxa de retenção
    SELECT COUNT(DISTINCT b.id) INTO beneficiarias_retidas
    FROM beneficiarias b
    JOIN oficina_presencas p ON b.id = p.beneficiaria_id
    WHERE 
        b.data_cadastro <= data_inicio
        AND EXISTS (
            SELECT 1 
            FROM oficina_presencas p2
            JOIN oficinas o ON p2.oficina_id = o.id
            WHERE 
                p2.beneficiaria_id = b.id
                AND o.data_oficina BETWEEN data_inicio AND data_fim
        );

    IF beneficiarias_anterior > 0 THEN
        taxa_retencao := ROUND((beneficiarias_retidas::NUMERIC / beneficiarias_anterior) * 100, 2);
    ELSE
        taxa_retencao := 0;
    END IF;
END;
$$;

-- Procedimento para calcular métricas de performance
CREATE OR REPLACE PROCEDURE calcular_metricas_performance(
    IN data_inicio DATE,
    IN data_fim DATE,
    OUT media_participacao NUMERIC,
    OUT eficiencia_oficinas NUMERIC,
    OUT taxa_conclusao_tarefas NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calcular média de participação em oficinas
    SELECT ROUND(AVG(taxa_ocupacao), 2) INTO media_participacao
    FROM view_oficinas_stats
    WHERE mes BETWEEN data_inicio AND data_fim;

    -- Calcular eficiência das oficinas (participantes reais vs. capacidade)
    WITH eficiencia AS (
        SELECT
            SUM(op.presentes) as total_presentes,
            SUM(o.capacidade_maxima) as total_capacidade
        FROM oficinas o
        LEFT JOIN (
            SELECT 
                oficina_id,
                COUNT(*) FILTER (WHERE presente = true) as presentes
            FROM oficina_presencas
            GROUP BY oficina_id
        ) op ON o.id = op.oficina_id
        WHERE o.data_oficina BETWEEN data_inicio AND data_fim
    )
    SELECT 
        ROUND((total_presentes::NUMERIC / NULLIF(total_capacidade, 0)) * 100, 2)
    INTO eficiencia_oficinas
    FROM eficiencia;

    -- Calcular taxa de conclusão de tarefas
    WITH tarefas_periodo AS (
        SELECT
            COUNT(*) as total_tarefas,
            COUNT(*) FILTER (WHERE status = 'concluida') as tarefas_concluidas
        FROM tarefas
        WHERE data_criacao BETWEEN data_inicio AND data_fim
    )
    SELECT 
        ROUND((tarefas_concluidas::NUMERIC / NULLIF(total_tarefas, 0)) * 100, 2)
    INTO taxa_conclusao_tarefas
    FROM tarefas_periodo;
END;
$$;

-- Procedimento para gerar relatório completo
CREATE OR REPLACE PROCEDURE gerar_relatorio_dashboard(
    IN data_inicio DATE,
    IN data_fim DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_crescimento_beneficiarias NUMERIC;
    v_crescimento_oficinas NUMERIC;
    v_taxa_retencao NUMERIC;
    v_media_participacao NUMERIC;
    v_eficiencia_oficinas NUMERIC;
    v_taxa_conclusao_tarefas NUMERIC;
BEGIN
    -- Calcular métricas de crescimento
    CALL calcular_metricas_crescimento(
        data_inicio,
        data_fim,
        v_crescimento_beneficiarias,
        v_crescimento_oficinas,
        v_taxa_retencao
    );

    -- Calcular métricas de performance
    CALL calcular_metricas_performance(
        data_inicio,
        data_fim,
        v_media_participacao,
        v_eficiencia_oficinas,
        v_taxa_conclusao_tarefas
    );

    -- Inserir resultados na tabela de relatórios
    INSERT INTO dashboard_relatorios (
        periodo_inicio,
        periodo_fim,
        crescimento_beneficiarias,
        crescimento_oficinas,
        taxa_retencao,
        media_participacao,
        eficiencia_oficinas,
        taxa_conclusao_tarefas,
        data_geracao
    ) VALUES (
        data_inicio,
        data_fim,
        v_crescimento_beneficiarias,
        v_crescimento_oficinas,
        v_taxa_retencao,
        v_media_participacao,
        v_eficiencia_oficinas,
        v_taxa_conclusao_tarefas,
        CURRENT_TIMESTAMP
    );
END;
$$;
