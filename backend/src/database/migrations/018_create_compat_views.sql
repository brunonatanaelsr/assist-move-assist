-- Compatibility view for legacy references to anamneses_social
CREATE OR REPLACE VIEW anamneses_social AS
SELECT * FROM anamnese_social;

