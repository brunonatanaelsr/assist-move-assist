-- Ajustes na tabela de oficinas
DO $$ 
BEGIN
    -- Adiciona as colunas que faltam
    ALTER TABLE oficinas 
        ADD COLUMN IF NOT EXISTS horario_inicio TIME,
        ADD COLUMN IF NOT EXISTS horario_fim TIME,
        ADD COLUMN IF NOT EXISTS dias_semana TEXT[],
        ADD COLUMN IF NOT EXISTS vagas INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS local TEXT;

    -- Garante que as colunas obrigatórias sejam NOT NULL
    ALTER TABLE oficinas
        ALTER COLUMN nome SET NOT NULL,
        ALTER COLUMN data_inicio SET NOT NULL,
        ALTER COLUMN responsavel_id SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'ativo';

    -- Adiciona check constraints
    ALTER TABLE oficinas
        DROP CONSTRAINT IF EXISTS oficinas_horario_check,
        ADD CONSTRAINT oficinas_horario_check
        CHECK (horario_fim IS NULL OR horario_inicio < horario_fim);

    ALTER TABLE oficinas
        DROP CONSTRAINT IF EXISTS oficinas_vagas_check,
        ADD CONSTRAINT oficinas_vagas_check
        CHECK (vagas >= 0);

EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Adiciona índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_oficinas_projeto_id ON oficinas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_oficinas_responsavel_id ON oficinas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_oficinas_status ON oficinas(status);
CREATE INDEX IF NOT EXISTS idx_oficinas_data_inicio ON oficinas(data_inicio);

-- Garante que o status seja válido
ALTER TABLE oficinas
    DROP CONSTRAINT IF EXISTS oficinas_status_check,
    ADD CONSTRAINT oficinas_status_check
    CHECK (status IN ('ativo', 'inativo', 'planejamento', 'em_andamento', 'concluido', 'cancelado'));
