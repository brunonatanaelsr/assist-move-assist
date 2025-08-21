-- Criação da tabela anamneses_social

CREATE TABLE anamneses_social (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
  composicao_familiar TEXT,
  situacao_habitacional TEXT,
  tipo_moradia TEXT,
  condicoes_moradia TEXT,
  renda_familiar_total DECIMAL(10,2),
  fonte_renda TEXT,
  beneficios_sociais TEXT[], -- array de benefícios sociais
  gastos_principais TEXT,
  condicao_saude_geral TEXT,
  problemas_saude TEXT,
  uso_medicamentos BOOLEAN DEFAULT false,
  medicamentos_uso TEXT,
  acompanhamento_medico BOOLEAN DEFAULT false,
  nivel_escolaridade TEXT,
  desejo_capacitacao TEXT,
  areas_interesse TEXT[],    -- array de interesses
  rede_apoio TEXT,
  participacao_comunitaria TEXT,
  violencias_enfrentadas TEXT,
  expectativas_programa TEXT,
  objetivos_pessoais TEXT,
  disponibilidade_participacao TEXT,
  observacoes TEXT,
  responsavel_preenchimento TEXT,
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para acesso rápido por beneficiária
CREATE INDEX idx_anamneses_social_beneficiaria ON anamneses_social(beneficiaria_id);

-- Trigger para atualizar automaticamente o campo data_atualizacao
CREATE OR REPLACE FUNCTION update_anamneses_social_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_anamneses_social_update_data_atualizacao
BEFORE UPDATE ON anamneses_social
FOR EACH ROW EXECUTE FUNCTION update_anamneses_social_data_atualizacao();

COMMENT ON TABLE anamneses_social IS 'Ficha de anamnese social, preenchida por beneficiária';
COMMENT ON COLUMN anamneses_social.beneficiaria_id IS 'Chave estrangeira para beneficiaria';
COMMENT ON COLUMN anamneses_social.beneficios_sociais IS 'Lista de benefícios recebidos pela família';
COMMENT ON COLUMN anamneses_social.ativo IS 'Soft delete de ficha';
