-- Criação da tabela de mensagens do chat

CREATE TABLE mensagens (
  id SERIAL PRIMARY KEY,
  remetente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  destinatario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  grupo_id INTEGER REFERENCES grupos_conversa(id) ON DELETE CASCADE,
  beneficiaria_id INTEGER REFERENCES beneficiarias(id) ON DELETE SET NULL,
  conteudo TEXT,
  anexos JSONB,
  tipo VARCHAR(30) DEFAULT 'mensagem',
  prioridade VARCHAR(20),
  lida BOOLEAN DEFAULT false,
  data_leitura TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mensagens_remetente_id ON mensagens(remetente_id);
CREATE INDEX idx_mensagens_destinatario_id ON mensagens(destinatario_id);
CREATE INDEX idx_mensagens_grupo_id ON mensagens(grupo_id);
CREATE INDEX idx_mensagens_ativo ON mensagens(ativo);
CREATE INDEX idx_mensagens_lida ON mensagens(lida);

CREATE OR REPLACE FUNCTION update_mensagens_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mensagens_update_data_atualizacao
BEFORE UPDATE ON mensagens
FOR EACH ROW EXECUTE FUNCTION update_mensagens_data_atualizacao();

COMMENT ON TABLE mensagens IS 'Mensagens privadas e de grupo do sistema de chat';
COMMENT ON COLUMN mensagens.anexos IS 'JSONB (array ou objeto) de anexos enviados na mensagem';
