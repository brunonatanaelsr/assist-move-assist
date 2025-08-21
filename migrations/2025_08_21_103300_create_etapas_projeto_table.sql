-- Criar tabela de etapas do projeto
CREATE TABLE etapas_projeto (
    id SERIAL PRIMARY KEY,
    projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    ordem INTEGER NOT NULL,
    responsavel_id INTEGER REFERENCES usuarios(id),
    porcentagem_conclusao INTEGER DEFAULT 0 CHECK (porcentagem_conclusao >= 0 AND porcentagem_conclusao <= 100),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para otimização
CREATE INDEX idx_etapas_projeto_projeto ON etapas_projeto(projeto_id);
CREATE INDEX idx_etapas_projeto_responsavel ON etapas_projeto(responsavel_id);
CREATE INDEX idx_etapas_projeto_status ON etapas_projeto(status);

COMMENT ON TABLE etapas_projeto IS 'Armazena as etapas/fases dos projetos';
COMMENT ON COLUMN etapas_projeto.status IS 'Status da etapa (ex: pendente, em andamento, concluída)';
COMMENT ON COLUMN etapas_projeto.ordem IS 'Ordem de execução da etapa no projeto';
COMMENT ON COLUMN etapas_projeto.porcentagem_conclusao IS 'Porcentagem de conclusão da etapa (0-100)';
