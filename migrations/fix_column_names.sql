-- Correção dos nomes das colunas para manter consistência
ALTER TABLE projetos 
    RENAME COLUMN localizacao TO local_execucao;

-- Adicionando novas colunas úteis para projetos
ALTER TABLE projetos 
    ADD COLUMN IF NOT EXISTS objetivos text,
    ADD COLUMN IF NOT EXISTS publico_alvo text,
    ADD COLUMN IF NOT EXISTS metas text,
    ADD COLUMN IF NOT EXISTS resultados_esperados text,
    ADD COLUMN IF NOT EXISTS parceiros text,
    ADD COLUMN IF NOT EXISTS observacoes text;
