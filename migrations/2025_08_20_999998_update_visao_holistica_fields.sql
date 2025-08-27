-- Update visoes_holisticas table to match plano_acao format
-- First, add the new columns that match the plano_acao structure
ALTER TABLE public.visoes_holisticas 
ADD COLUMN objetivo_principal text,
ADD COLUMN areas_prioritarias jsonb,
ADD COLUMN acoes text,
ADD COLUMN suporte_instituto text,
ADD COLUMN primeira_avaliacao_data date,
ADD COLUMN primeira_avaliacao_progresso text,
ADD COLUMN segunda_avaliacao_data date,
ADD COLUMN segunda_avaliacao_progresso text,
ADD COLUMN assinatura_beneficiaria boolean DEFAULT false,
ADD COLUMN assinatura_responsavel_tecnico boolean DEFAULT false;

-- Keep the existing fields for backward compatibility but make them nullable
-- historia_vida, rede_apoio, visao_tecnica_referencia, encaminhamento_projeto already exist
