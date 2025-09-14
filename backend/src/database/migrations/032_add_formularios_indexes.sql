-- Índices adicionais para desempenho em formulários
-- Melhoram filtros por beneficiária/tipo e ordenação por data

CREATE INDEX IF NOT EXISTS idx_formularios_beneficiaria ON formularios(beneficiaria_id);
CREATE INDEX IF NOT EXISTS idx_formularios_tipo ON formularios(tipo);
CREATE INDEX IF NOT EXISTS idx_formularios_created_at ON formularios(created_at DESC);

