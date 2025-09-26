-- Migração 030: Criar tabelas de declarações e recibos
-- Data: 2025-09-03
-- Autor: Sistema
-- Descrição: Criação das tabelas para gerenciamento de declarações e recibos de beneficiárias

-- Tabela para declarações
CREATE TABLE IF NOT EXISTS declaracoes (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('comparecimento', 'participacao', 'conclusao', 'frequencia')),
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  carga_horaria INTEGER,
  atividades_participadas TEXT NOT NULL,
  frequencia_percentual INTEGER CHECK (frequencia_percentual >= 0 AND frequencia_percentual <= 100),
  observacoes TEXT,
  finalidade VARCHAR(255),
  responsavel_emissao VARCHAR(255),
  data_emissao DATE NOT NULL,
  created_by INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para recibos
CREATE TABLE IF NOT EXISTS recibos (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('auxilio_transporte', 'auxilio_alimentacao', 'material_didatico', 'outro')),
  beneficiaria_id INTEGER NOT NULL REFERENCES beneficiarias(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_recebimento DATE NOT NULL,
  periodo_referencia VARCHAR(100),
  observacoes TEXT,
  responsavel_entrega VARCHAR(255),
  created_by INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_declaracoes_beneficiaria ON declaracoes(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_declaracoes_tipo ON declaracoes(tipo);
CREATE INDEX IF NOT EXISTS idx_declaracoes_data_emissao ON declaracoes(data_emissao);
CREATE INDEX IF NOT EXISTS idx_declaracoes_created_at ON declaracoes(created_at);

CREATE INDEX IF NOT EXISTS idx_recibos_beneficiaria ON recibos(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_recibos_tipo ON recibos(tipo);
CREATE INDEX IF NOT EXISTS idx_recibos_data_recebimento ON recibos(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_recibos_created_at ON recibos(created_at);

-- Comentários para documentação
COMMENT ON TABLE declaracoes IS 'Declarações emitidas para beneficiárias (comparecimento, participação, conclusão, frequência)';
COMMENT ON TABLE recibos IS 'Recibos de auxílios e benefícios recebidos pelas beneficiárias';

COMMENT ON COLUMN declaracoes.tipo IS 'Tipo da declaração: comparecimento, participacao, conclusao, frequencia';
COMMENT ON COLUMN declaracoes.beneficiaria_id IS 'ID da beneficiária que recebe a declaração';
COMMENT ON COLUMN declaracoes.atividades_participadas IS 'Descrição das atividades que constam na declaração';
COMMENT ON COLUMN declaracoes.frequencia_percentual IS 'Percentual de frequência (0-100) quando aplicável';

COMMENT ON COLUMN recibos.tipo IS 'Tipo do benefício: auxilio_transporte, auxilio_alimentacao, material_didatico, outro';
COMMENT ON COLUMN recibos.beneficiaria_id IS 'ID da beneficiária que recebe o benefício';
COMMENT ON COLUMN recibos.valor IS 'Valor monetário do benefício em reais';
COMMENT ON COLUMN recibos.periodo_referencia IS 'Período a que se refere o benefício (ex: Janeiro/2024)';

-- Log de migração removido: o runner registra em tabela "migrations"
