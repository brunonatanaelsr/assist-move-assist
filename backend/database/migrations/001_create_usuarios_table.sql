-- Criação da tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  nome_completo VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  departamento VARCHAR(100),
  telefone VARCHAR(20),
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_nome ON usuarios(nome_completo);

-- Trigger para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar usuário admin inicial se não existir
CREATE OR REPLACE FUNCTION create_admin_if_not_exists() 
RETURNS void AS $$
BEGIN
  -- Verificar se já existe algum usuário admin
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@movemarias.org.br') THEN
    -- Inserir usuário admin com senha hash de 'admin123' (alterar em produção)
    INSERT INTO usuarios (
      email, 
      senha_hash, 
      nome_completo, 
      cargo,
      departamento,
      ativo
    ) VALUES (
      'admin@movemarias.org.br',
      '$2a$10$mJ2vxq3L1Ih6NUxFHm/gkOyqoXp7R9d.h9dKg/nsR7TchKJPJK2S6', -- hash de 'admin123'
      'Administrador',
      'Administrador',
      'TI',
      true
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Executar a função para criar o admin
SELECT create_admin_if_not_exists();
