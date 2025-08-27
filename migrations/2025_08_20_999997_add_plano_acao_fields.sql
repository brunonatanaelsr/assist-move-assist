-- Add new fields to planos_acao table for the reformulated format
ALTER TABLE public.planos_acao 
ADD COLUMN data_plano date,
ADD COLUMN objetivo_principal text,
ADD COLUMN areas_prioritarias jsonb,
ADD COLUMN outras_areas text,
ADD COLUMN acoes_realizadas text,
ADD COLUMN suporte_instituto text,
ADD COLUMN primeira_avaliacao_data date,
ADD COLUMN primeira_avaliacao_progresso text,
ADD COLUMN segunda_avaliacao_data date,
ADD COLUMN segunda_avaliacao_progresso text,
ADD COLUMN assinatura_beneficiaria boolean DEFAULT false,
ADD COLUMN assinatura_responsavel_tecnico boolean DEFAULT false;

-- Update existing records to have data_plano as data_criacao date
UPDATE public.planos_acao 
SET data_plano = data_criacao::date 
WHERE data_plano IS NULL;
