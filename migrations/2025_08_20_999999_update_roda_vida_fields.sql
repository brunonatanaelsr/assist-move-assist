-- Adaptar tabela roda_vida para formato de documento
ALTER TABLE public.roda_vida 
ADD COLUMN data_avaliacao date,
ADD COLUMN objetivo_principal text,
ADD COLUMN observacoes_saude text,
ADD COLUMN observacoes_amor text,
ADD COLUMN observacoes_recursos_financeiros text,
ADD COLUMN observacoes_relacionamento_familiar text,
ADD COLUMN observacoes_vida_social text,
ADD COLUMN observacoes_contribuicao_social text,
ADD COLUMN observacoes_proposito text,
ADD COLUMN observacoes_equilibrio_emocional text,
ADD COLUMN observacoes_lazer text,
ADD COLUMN observacoes_espiritualidade text,
ADD COLUMN planos_melhoria text,
ADD COLUMN assinatura_beneficiaria boolean DEFAULT false,
ADD COLUMN assinatura_profissional boolean DEFAULT false,
ADD COLUMN responsavel_tecnico character varying;
