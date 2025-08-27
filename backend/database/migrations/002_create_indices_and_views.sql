-- Índices para pesquisa por texto
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_usuarios_nome_trgm ON usuarios USING gin (nome_completo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_usuarios_email_trgm ON usuarios USING gin (email gin_trgm_ops);

-- Views úteis
CREATE OR REPLACE VIEW vw_usuarios_ativos AS
SELECT id, email, nome_completo, cargo, departamento, telefone, foto_url, created_at, updated_at
FROM usuarios
WHERE ativo = true;

CREATE OR REPLACE VIEW vw_usuarios_admin AS
SELECT u.id, u.email, u.nome_completo, u.cargo, u.departamento, u.created_at
FROM usuarios u
WHERE u.role = 'admin' AND u.ativo = true;

-- Função para busca de usuários por texto
CREATE OR REPLACE FUNCTION buscar_usuarios(termo text)
RETURNS TABLE (
  id int,
  email varchar,
  nome_completo varchar,
  cargo varchar,
  departamento varchar,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.nome_completo,
    u.cargo,
    u.departamento,
    greatest(
      similarity(u.nome_completo, termo),
      similarity(u.email, termo)
    ) as similarity
  FROM usuarios u
  WHERE u.ativo = true
    AND (
      u.nome_completo ILIKE '%' || termo || '%'
      OR u.email ILIKE '%' || termo || '%'
      OR u.cargo ILIKE '%' || termo || '%'
      OR u.departamento ILIKE '%' || termo || '%'
    )
  ORDER BY similarity DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
