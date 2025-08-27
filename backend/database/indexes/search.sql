-- Extensão para busca textual
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para busca textual em beneficiárias
CREATE INDEX idx_beneficiarias_search 
ON beneficiarias 
USING GIN (to_tsvector('portuguese', 
    COALESCE(nome_completo, '') || ' ' || 
    COALESCE(cpf, '') || ' ' || 
    COALESCE(endereco, '') || ' ' ||
    COALESCE(bairro, '') || ' ' ||
    COALESCE(cidade, '')
));

-- Índice GIN para trigramas do nome
CREATE INDEX idx_beneficiarias_nome_trgm
ON beneficiarias
USING GIN (nome_completo gin_trgm_ops);

-- Índice GIN para trigramas do endereço
CREATE INDEX idx_beneficiarias_endereco_trgm
ON beneficiarias
USING GIN (endereco gin_trgm_ops);

-- Stored procedure para busca complexa com ranking
CREATE OR REPLACE FUNCTION search_beneficiarias(
    search_term TEXT,
    OUT id UUID,
    OUT nome_completo TEXT,
    OUT cpf TEXT,
    OUT endereco TEXT,
    OUT rank FLOAT
) RETURNS SETOF record AS $$
DECLARE
    query_tokens TEXT[];
    query_str TEXT;
BEGIN
    -- Normalizar e tokenizar o termo de busca
    query_tokens := regexp_split_to_array(
        lower(unaccent(search_term)),
        '\s+'
    );
    
    -- Construir query para busca textual
    query_str := array_to_string(
        array_agg(token || ':*' ORDER BY token),
        ' & '
    ) FROM unnest(query_tokens) AS token;
    
    RETURN QUERY
    SELECT 
        b.id,
        b.nome_completo,
        b.cpf,
        b.endereco,
        (
            ts_rank(
                to_tsvector('portuguese',
                    COALESCE(unaccent(b.nome_completo), '') || ' ' ||
                    COALESCE(b.cpf, '') || ' ' ||
                    COALESCE(unaccent(b.endereco), '') || ' ' ||
                    COALESCE(unaccent(b.bairro), '') || ' ' ||
                    COALESCE(unaccent(b.cidade), '')
                ),
                to_tsquery('portuguese', query_str)
            ) +
            similarity(b.nome_completo, search_term) +
            similarity(b.endereco, search_term)
        ) * CASE
            WHEN b.nome_completo ILIKE '%' || search_term || '%' THEN 2
            WHEN b.cpf = regexp_replace(search_term, '\D', '', 'g') THEN 3
            ELSE 1
        END as rank
    FROM beneficiarias b
    WHERE 
        to_tsvector('portuguese',
            COALESCE(unaccent(b.nome_completo), '') || ' ' ||
            COALESCE(b.cpf, '') || ' ' ||
            COALESCE(unaccent(b.endereco), '') || ' ' ||
            COALESCE(unaccent(b.bairro), '') || ' ' ||
            COALESCE(unaccent(b.cidade), '')
        ) @@ to_tsquery('portuguese', query_str)
        OR b.nome_completo % search_term
        OR b.endereco % search_term
        OR b.cpf = regexp_replace(search_term, '\D', '', 'g')
    ORDER BY rank DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;
