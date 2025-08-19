-- Ajustando as tabelas para o dashboard
ALTER TABLE beneficiarias
    ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Garantindo que todas as colunas necessárias existam com os tipos corretos
DO $$ 
BEGIN
    -- Ajustando beneficiarias
    ALTER TABLE beneficiarias
        ALTER COLUMN nome_completo TYPE VARCHAR(255),
        ALTER COLUMN nome_completo SET NOT NULL,
        ALTER COLUMN cpf TYPE VARCHAR(14),
        ALTER COLUMN cpf SET NOT NULL,
        ALTER COLUMN data_nascimento SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'ativa',
        ALTER COLUMN ativo SET DEFAULT true;
EXCEPTION
    WHEN others THEN
        -- Ignora erros (colunas podem já existir)
        NULL;
END $$;
