-- Criar extensão para UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha_hash VARCHAR(72) NOT NULL,
  papel VARCHAR(20) NOT NULL CHECK (
    papel IN ('admin', 'coordenador', 'profissional', 'assistente')
  ),
  telefone VARCHAR(20),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_papel ON usuarios(papel);

-- Trigger para atualizar data_atualizacao
CREATE OR REPLACE FUNCTION update_data_atualizacao_usuarios()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_data_atualizacao
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_data_atualizacao_usuarios();
