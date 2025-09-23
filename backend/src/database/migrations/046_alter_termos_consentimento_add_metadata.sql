ALTER TABLE IF EXISTS termos_consentimento
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(60) DEFAULT 'lgpd',
  ADD COLUMN IF NOT EXISTS versao_texto VARCHAR(40) DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS decisao VARCHAR(20) DEFAULT 'granted',
  ADD COLUMN IF NOT EXISTS base_legal VARCHAR(120) DEFAULT 'consentimento do titular',
  ADD COLUMN IF NOT EXISTS evidencia JSONB DEFAULT '{}'::jsonb;

UPDATE termos_consentimento
   SET tipo = COALESCE(NULLIF(dados ->> 'tipo_termo', ''), NULLIF(dados ->> 'tipo', ''), tipo, 'lgpd'),
       versao_texto = COALESCE(NULLIF(dados ->> 'versao_texto', ''), NULLIF(dados ->> 'versao', ''), versao_texto, '1.0'),
       decisao = CASE
                   WHEN lower(COALESCE(dados ->> 'aceito', dados ->> 'aceite', 'false')) = 'true' THEN 'granted'
                   ELSE 'denied'
                 END,
       base_legal = COALESCE(NULLIF(dados ->> 'base_legal', ''), base_legal, 'consentimento do titular'),
       evidencia = jsonb_strip_nulls(
         COALESCE(
           evidencia,
           '{}'::jsonb
         ) || jsonb_build_object(
           'registrado_em', COALESCE((evidencia ->> 'registrado_em')::timestamptz, created_at),
           'dados_formulario', dados
         )
       );

ALTER TABLE IF EXISTS termos_consentimento
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN decisao SET NOT NULL,
  ALTER COLUMN evidencia SET DEFAULT '{}'::jsonb;
