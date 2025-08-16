-- Migration: Sistema de Mensagens Completo
-- Data: 2025-08-16

-- Tabela de grupos de conversa
CREATE TABLE IF NOT EXISTS grupos_conversa (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  criador_id INTEGER REFERENCES usuarios(id),
  tipo VARCHAR(20) DEFAULT 'privado' CHECK (tipo IN ('privado', 'publico')),
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de participantes do grupo
CREATE TABLE IF NOT EXISTS participantes_grupo (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER REFERENCES grupos_conversa(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id),
  role VARCHAR(20) DEFAULT 'membro' CHECK (role IN ('admin', 'membro')),
  adicionado_por INTEGER REFERENCES usuarios(id),
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (grupo_id, usuario_id)
);

-- Atualizar tabela de mensagens para suportar grupos e anexos
ALTER TABLE mensagens 
  ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES grupos_conversa(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS data_leitura TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS anexos TEXT[],
  ADD COLUMN IF NOT EXISTS arquivo_nome VARCHAR(255),
  ADD COLUMN IF NOT EXISTS arquivo_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS arquivo_tipo VARCHAR(100),
  ADD COLUMN IF NOT EXISTS arquivo_tamanho INTEGER;

-- Adicionar trigger para atualizar data_atualizacao
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.data_atualizacao = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS update_grupos_conversa_updated_at ON grupos_conversa;
CREATE TRIGGER update_grupos_conversa_updated_at 
    BEFORE UPDATE ON grupos_conversa 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_participantes_grupo_updated_at ON participantes_grupo;
CREATE TRIGGER update_participantes_grupo_updated_at 
    BEFORE UPDATE ON participantes_grupo 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_mensagens_grupo ON mensagens(grupo_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente_destinatario ON mensagens(remetente_id, destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_data_criacao ON mensagens(data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_lida ON mensagens(lida);
CREATE INDEX IF NOT EXISTS idx_grupos_conversa_ativo ON grupos_conversa(ativo);
CREATE INDEX IF NOT EXISTS idx_grupos_conversa_criador ON grupos_conversa(criador_id);
CREATE INDEX IF NOT EXISTS idx_participantes_grupo_usuario ON participantes_grupo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_participantes_grupo_grupo ON participantes_grupo(grupo_id);

-- Inserir alguns grupos de exemplo
INSERT INTO grupos_conversa (nome, descricao, criador_id, tipo) VALUES 
('Coordenadores', 'Grupo para coordenadores das oficinas', 1, 'privado'),
('Geral', 'Grupo geral para todos os usuários', 1, 'publico'),
('Suporte Técnico', 'Grupo para questões técnicas', 1, 'privado')
ON CONFLICT DO NOTHING;

-- Adicionar participantes aos grupos (assumindo que existe usuário com id 1)
INSERT INTO participantes_grupo (grupo_id, usuario_id, papel, adicionado_por) 
SELECT g.id, 1, 'admin', 1 
FROM grupos_conversa g 
WHERE EXISTS (SELECT 1 FROM usuarios WHERE id = 1)
ON CONFLICT (grupo_id, usuario_id) DO NOTHING;

COMMENT ON TABLE grupos_conversa IS 'Tabela para armazenar grupos de conversa';
COMMENT ON TABLE participantes_grupo IS 'Tabela para participantes dos grupos de conversa';
COMMENT ON COLUMN mensagens.grupo_id IS 'ID do grupo (para mensagens de grupo)';
COMMENT ON COLUMN mensagens.anexos IS 'Array com URLs dos anexos';
COMMENT ON COLUMN mensagens.data_leitura IS 'Timestamp de quando a mensagem foi lida';
