-- Criar tabela de recursos do projeto
CREATE TABLE recursos_projeto (
    id SERIAL PRIMARY KEY,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    tipo_recurso VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    quantidade NUMERIC(10,2),
    unidade_medida VARCHAR(30),
    custo_estimado NUMERIC(10,2),
    custo_real NUMERIC(10,2),
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    data_necessidade TIMESTAMP WITH TIME ZONE,
    fornecedor VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para otimização
CREATE INDEX idx_recursos_projeto_projeto ON recursos_projeto(projeto_id);
CREATE INDEX idx_recursos_projeto_tipo ON recursos_projeto(tipo_recurso);
CREATE INDEX idx_recursos_projeto_status ON recursos_projeto(status);

COMMENT ON TABLE recursos_projeto IS 'Armazena os recursos necessários para os projetos';
COMMENT ON COLUMN recursos_projeto.tipo_recurso IS 'Tipo do recurso (ex: material, humano, financeiro)';
COMMENT ON COLUMN recursos_projeto.quantidade IS 'Quantidade necessária do recurso';
COMMENT ON COLUMN recursos_projeto.unidade_medida IS 'Unidade de medida do recurso (ex: horas, unidades, kg)';
COMMENT ON COLUMN recursos_projeto.status IS 'Status do recurso (ex: pendente, aprovado, adquirido)';
