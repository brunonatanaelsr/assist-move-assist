-- Melhorias na tabela de oficinas
BEGIN;

-- Adicionar novos campos para melhor controle
ALTER TABLE oficinas
  ADD COLUMN IF NOT EXISTS status_detalhado VARCHAR(50) DEFAULT 'em_planejamento' CHECK (status_detalhado IN (
    'em_planejamento', 'inscricoes_abertas', 'em_andamento', 
    'concluida', 'cancelada', 'pausada', 'em_revisao'
  )),
  ADD COLUMN IF NOT EXISTS vagas_ocupadas INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lista_espera_limite INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS tem_lista_espera BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS publico_alvo TEXT,
  ADD COLUMN IF NOT EXISTS pre_requisitos TEXT[],
  ADD COLUMN IF NOT EXISTS objetivos TEXT[],
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) DEFAULT 'iniciante' CHECK (nivel IN ('iniciante', 'intermediario', 'avancado')),
  ADD COLUMN IF NOT EXISTS carga_horaria INTEGER,
  ADD COLUMN IF NOT EXISTS certificado_disponivel BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS materiais_necessarios TEXT[],
  ADD COLUMN IF NOT EXISTS meta_dados JSONB DEFAULT '{}';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_oficinas_status_detalhado ON oficinas(status_detalhado);
CREATE INDEX IF NOT EXISTS idx_oficinas_categoria ON oficinas(categoria);
CREATE INDEX IF NOT EXISTS idx_oficinas_nivel ON oficinas(nivel);

-- Criar tabela para lista de espera
CREATE TABLE IF NOT EXISTS lista_espera_oficinas (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER REFERENCES oficinas(id),
  beneficiaria_id INTEGER REFERENCES beneficiarias(id),
  data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  posicao INTEGER,
  status VARCHAR(30) DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'chamada', 'desistencia', 'expirada')),
  observacoes TEXT,
  meta_dados JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(oficina_id, beneficiaria_id, ativo)
);

-- Criar tabela para avaliações das oficinas
CREATE TABLE IF NOT EXISTS avaliacoes_oficinas (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER REFERENCES oficinas(id),
  beneficiaria_id INTEGER REFERENCES beneficiarias(id),
  nota INTEGER CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  aspectos_positivos TEXT[],
  aspectos_negativos TEXT[],
  sugestoes TEXT,
  data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  meta_dados JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(oficina_id, beneficiaria_id, ativo)
);

-- Criar tabela para presença nas oficinas
CREATE TABLE IF NOT EXISTS presencas_oficinas (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER REFERENCES oficinas(id),
  beneficiaria_id INTEGER REFERENCES beneficiarias(id),
  data_encontro DATE NOT NULL,
  presente BOOLEAN DEFAULT false,
  justificativa TEXT,
  observacoes TEXT,
  meta_dados JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(oficina_id, beneficiaria_id, data_encontro)
);

-- Adicionar triggers para auditoria
CREATE OR REPLACE FUNCTION update_oficina_vagas_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ativo = true THEN
    UPDATE oficinas 
    SET vagas_ocupadas = vagas_ocupadas + 1
    WHERE id = NEW.oficina_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.ativo = true AND NEW.ativo = false THEN
      UPDATE oficinas 
      SET vagas_ocupadas = vagas_ocupadas - 1
      WHERE id = NEW.oficina_id;
    ELSIF OLD.ativo = false AND NEW.ativo = true THEN
      UPDATE oficinas 
      SET vagas_ocupadas = vagas_ocupadas + 1
      WHERE id = NEW.oficina_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_oficina_vagas_count
AFTER INSERT OR UPDATE ON participacoes
FOR EACH ROW
EXECUTE FUNCTION update_oficina_vagas_count();

-- Criar função para atualizar data_atualizacao
CREATE OR REPLACE FUNCTION update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de data_atualizacao nas novas tabelas
CREATE TRIGGER trg_update_lista_espera_data_atualizacao
BEFORE UPDATE ON lista_espera_oficinas
FOR EACH ROW
EXECUTE FUNCTION update_data_atualizacao();

CREATE TRIGGER trg_update_avaliacoes_data_atualizacao
BEFORE UPDATE ON avaliacoes_oficinas
FOR EACH ROW
EXECUTE FUNCTION update_data_atualizacao();

CREATE TRIGGER trg_update_presencas_data_atualizacao
BEFORE UPDATE ON presencas_oficinas
FOR EACH ROW
EXECUTE FUNCTION update_data_atualizacao();

COMMIT;
