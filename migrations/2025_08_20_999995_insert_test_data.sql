-- Insert test beneficiarias
INSERT INTO beneficiarias (
  nome_completo, 
  cpf, 
  data_nascimento, 
  contato1, 
  endereco, 
  bairro,
  programa_servico
) VALUES 
  ('Maria Silva Santos', '12345678901', '1985-05-15', '(11) 98765-4321', 'Rua das Flores, 123', 'Centro', 'Projeto Mulheres Empoderadas'),
  ('Ana Paula Oliveira', '98765432100', '1990-08-22', '(11) 97654-3210', 'Av. Brasil, 456', 'Jardim São Paulo', 'Oficinas de Capacitação'),
  ('Carmen Rodriguez', '45612378902', '1978-03-10', '(11) 96543-2109', 'Rua da Esperança, 789', 'Vila Nova', 'Apoio Familiar');

-- Insert test anamneses
INSERT INTO anamneses_social (
  beneficiaria_id,
  data_anamnese,
  observacoes_importantes,
  uso_alcool,
  vulnerabilidades
) VALUES 
  ((SELECT id FROM beneficiarias WHERE nome_completo = 'Maria Silva Santos'), '2024-01-15', 'Família acolhedora, precisa de apoio financeiro', false, ARRAY['Desemprego', 'Criança e Adolescente']),
  ((SELECT id FROM beneficiarias WHERE nome_completo = 'Ana Paula Oliveira'), '2024-01-20', 'Mãe solo, busca capacitação profissional', false, ARRAY['Instabilidade Empregatícia']);

-- Insert test declarations  
INSERT INTO declaracoes_comparecimento (
  beneficiaria_id,
  data_comparecimento,
  hora_entrada,
  hora_saida,
  profissional_responsavel
) VALUES 
  ((SELECT id FROM beneficiarias WHERE nome_completo = 'Maria Silva Santos'), '2024-01-10', '09:00', '11:00', 'Maria Santos'),
  ((SELECT id FROM beneficiarias WHERE nome_completo = 'Ana Paula Oliveira'), '2024-01-12', '14:00', '16:00', 'João Silva'),
  ((SELECT id FROM beneficiarias WHERE nome_completo = 'Carmen Rodriguez'), '2024-01-15', '10:00', '12:00', 'Ana Costa');

-- Insert test evolution records
INSERT INTO fichas_evolucao (
  beneficiaria_id,
  data_evolucao,
  descricao,
  responsavel
) VALUES 
  ((SELECT id FROM beneficiarias WHERE nome_completo = 'Maria Silva Santos'), '2024-01-16', 'Primeira sessão de acompanhamento. Beneficiária demonstra interesse em participar das oficinas.', 'Maria Santos'),
  ((SELECT id FROM beneficiarias WHERE nome_completo = 'Ana Paula Oliveira'), '2024-01-18', 'Evolução positiva no processo de capacitação. Demonstra aptidão para área administrativa.', 'João Silva');
