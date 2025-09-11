-- Criação da tabela de matrículas de projetos (mover definição do controller para migração)
CREATE TABLE IF NOT EXISTS matriculas_projetos (
  id SERIAL PRIMARY KEY,
  beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE CASCADE,
  projeto_id INTEGER REFERENCES projetos(id) ON DELETE CASCADE,
  data_matricula DATE DEFAULT CURRENT_DATE,
  data_inicio_prevista DATE,
  data_conclusao_prevista DATE,
  situacao_social_familiar TEXT,
  escolaridade_atual VARCHAR(100),
  experiencia_profissional TEXT,
  motivacao_participacao TEXT NOT NULL,
  expectativas TEXT NOT NULL,
  disponibilidade_horarios JSONB DEFAULT '[]'::jsonb,
  possui_dependentes BOOLEAN DEFAULT FALSE,
  necessita_auxilio_transporte BOOLEAN DEFAULT FALSE,
  necessita_auxilio_alimentacao BOOLEAN DEFAULT FALSE,
  necessita_cuidado_criancas BOOLEAN DEFAULT FALSE,
  atende_criterios_idade BOOLEAN DEFAULT TRUE,
  atende_criterios_renda BOOLEAN DEFAULT TRUE,
  atende_criterios_genero BOOLEAN DEFAULT TRUE,
  atende_criterios_territorio BOOLEAN DEFAULT TRUE,
  atende_criterios_vulnerabilidade BOOLEAN DEFAULT TRUE,
  observacoes_elegibilidade TEXT,
  termo_compromisso_assinado BOOLEAN DEFAULT FALSE,
  frequencia_minima_aceita BOOLEAN DEFAULT FALSE,
  regras_convivencia_aceitas BOOLEAN DEFAULT FALSE,
  participacao_atividades_aceita BOOLEAN DEFAULT FALSE,
  avaliacao_periodica_aceita BOOLEAN DEFAULT FALSE,
  como_conheceu_projeto VARCHAR(200),
  pessoas_referencias TEXT,
  condicoes_especiais TEXT,
  medicamentos_uso_continuo TEXT,
  alergias_restricoes TEXT,
  profissional_matricula VARCHAR(100),
  observacoes_profissional TEXT,
  status_matricula VARCHAR(20) DEFAULT 'pendente',
  motivo_status TEXT,
  data_aprovacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(beneficiaria_id, projeto_id)
);

CREATE INDEX IF NOT EXISTS idx_matriculas_beneficiaria ON matriculas_projetos(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_projeto ON matriculas_projetos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_status ON matriculas_projetos(status_matricula);
CREATE INDEX IF NOT EXISTS idx_matriculas_data ON matriculas_projetos(data_matricula);

-- Trigger para manter updated_at
CREATE OR REPLACE FUNCTION trg_matriculas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_matriculas_updated_at'
  ) THEN
    CREATE TRIGGER trigger_matriculas_updated_at
    BEFORE UPDATE ON matriculas_projetos
    FOR EACH ROW EXECUTE FUNCTION trg_matriculas_updated_at();
  END IF;
END $$;

