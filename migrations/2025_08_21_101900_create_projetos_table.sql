-- Criação da tabela projetos

CREATE TABLE projetos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_inicio DATE NOT NULL,
  data_fim_prevista DATE,
  data_fim_real DATE,
  status VARCHAR(30) DEFAULT 'planejamento',
  orcamento NUMERIC(12,2),
  responsavel_id INTEGER REFERENCES usuarios(id),
  local_execucao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projetos_status ON projetos(status);
CREATE INDEX idx_projetos_responsavel_id ON projetos(responsavel_id);
CREATE INDEX idx_projetos_ativo ON projetos(ativo);

-- Trigger para atualização automática do campo data_atualizacao
CREATE OR REPLACE FUNCTION update_projetos_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projetos_update_data_atualizacao
BEFORE UPDATE ON projetos
FOR EACH ROW EXECUTE FUNCTION update_projetos_data_atualizacao();

COMMENT ON TABLE projetos IS 'Projetos do sistema, vinculados ou não a oficinas';
COMMENT ON COLUMN projetos.nome IS 'Nome do projeto';
COMMENT ON COLUMN projetos.descricao IS 'Descrição detalhada do projeto';
COMMENT ON COLUMN projetos.status IS 'Status: planejamento, em_andamento, concluido, cancelado etc.';
COMMENT ON COLUMN projetos.orcamento IS 'Valor planejado em reais para o projeto';
COMMENT ON COLUMN projetos.local_execucao IS 'Localização de execução/abrangência do projeto';
