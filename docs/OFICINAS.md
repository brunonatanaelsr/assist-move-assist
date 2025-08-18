# Sistema de Gestão de Oficinas - Documentação Técnica

## Visão Geral
O módulo de oficinas foi aprimorado com funcionalidades avançadas para melhor gestão de participantes, controle de presenças, avaliações e lista de espera.

## Novas Funcionalidades

### 1. Gestão de Oficinas
- Status detalhados (em_planejamento, inscricoes_abertas, em_andamento, etc.)
- Controle de vagas automático
- Metadados expandidos (público-alvo, pré-requisitos, objetivos, etc.)
- Categorização e níveis
- Certificados

### 2. Lista de Espera
- Controle automático de posições
- Limite configurável por oficina
- Notificações de vagas
- Histórico de chamadas

### 3. Sistema de Avaliações
- Avaliações numéricas (1-5 estrelas)
- Aspectos positivos e negativos
- Sugestões de melhoria
- Estatísticas por oficina

### 4. Controle de Presenças
- Registro por encontro
- Justificativas de ausência
- Relatórios de frequência
- Histórico por beneficiária

## Endpoints da API

### Oficinas
- `GET /api/oficinas` - Listar oficinas
- `POST /api/oficinas` - Criar oficina
- `PUT /api/oficinas/:id` - Atualizar oficina
- `DELETE /api/oficinas/:id` - Excluir oficina (soft delete)

### Lista de Espera
- `POST /api/lista-espera` - Adicionar à lista de espera
- `GET /api/lista-espera/oficina/:id` - Listar pessoas na lista de espera
- `DELETE /api/lista-espera/:id` - Remover da lista de espera
- `POST /api/lista-espera/chamar-proxima/:oficina_id` - Chamar próxima pessoa

### Avaliações
- `POST /api/avaliacoes` - Registrar avaliação
- `GET /api/avaliacoes/oficina/:id` - Listar avaliações de uma oficina

### Presenças
- `POST /api/presencas` - Registrar presença
- `GET /api/presencas/oficina/:id` - Listar presenças de uma oficina
- `GET /api/presencas/beneficiaria/:id` - Listar presenças de uma beneficiária

## Estrutura do Banco de Dados

### Tabela: oficinas
```sql
ALTER TABLE oficinas
  ADD COLUMN status_detalhado VARCHAR(50),
  ADD COLUMN vagas_ocupadas INTEGER,
  ADD COLUMN lista_espera_limite INTEGER,
  ADD COLUMN tem_lista_espera BOOLEAN,
  ADD COLUMN publico_alvo TEXT,
  ADD COLUMN pre_requisitos TEXT[],
  ADD COLUMN objetivos TEXT[],
  ADD COLUMN categoria VARCHAR(50),
  ADD COLUMN nivel VARCHAR(20),
  ADD COLUMN carga_horaria INTEGER,
  ADD COLUMN certificado_disponivel BOOLEAN,
  ADD COLUMN materiais_necessarios TEXT[],
  ADD COLUMN meta_dados JSONB;
```

### Tabela: lista_espera_oficinas
```sql
CREATE TABLE lista_espera_oficinas (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER REFERENCES oficinas(id),
  beneficiaria_id INTEGER REFERENCES beneficiarias(id),
  posicao INTEGER,
  status VARCHAR(30),
  observacoes TEXT,
  meta_dados JSONB,
  ativo BOOLEAN
);
```

### Tabela: avaliacoes_oficinas
```sql
CREATE TABLE avaliacoes_oficinas (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER REFERENCES oficinas(id),
  beneficiaria_id INTEGER REFERENCES beneficiarias(id),
  nota INTEGER CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  aspectos_positivos TEXT[],
  aspectos_negativos TEXT[],
  sugestoes TEXT,
  meta_dados JSONB,
  ativo BOOLEAN
);
```

### Tabela: presencas_oficinas
```sql
CREATE TABLE presencas_oficinas (
  id SERIAL PRIMARY KEY,
  oficina_id INTEGER REFERENCES oficinas(id),
  beneficiaria_id INTEGER REFERENCES beneficiarias(id),
  data_encontro DATE,
  presente BOOLEAN,
  justificativa TEXT,
  observacoes TEXT,
  meta_dados JSONB,
  ativo BOOLEAN
);
```

## Validações e Regras de Negócio

1. **Oficinas**
   - Data fim deve ser posterior à data início
   - Horário fim deve ser posterior ao horário início
   - Nome não pode ser duplicado na mesma data
   - Campos obrigatórios: nome, data_inicio, horarios, carga_horaria

2. **Lista de Espera**
   - Beneficiária não pode estar na lista se já está inscrita
   - Respeita limite configurado por oficina
   - Posições são reordenadas automaticamente
   - Status: aguardando, chamada, desistencia, expirada

3. **Avaliações**
   - Uma avaliação por beneficiária por oficina
   - Beneficiária deve ter participado da oficina
   - Nota obrigatória (1-5)

4. **Presenças**
   - Uma presença por beneficiária por encontro
   - Beneficiária deve estar inscrita na oficina
   - Data do encontro deve estar dentro do período da oficina

## Integração com Auditoria

Todas as operações críticas são registradas no sistema de auditoria:
- Criação/alteração/exclusão de oficinas
- Movimentações na lista de espera
- Registros de presença
- Avaliações

## Próximas Melhorias Planejadas

1. Sistema de notificações automáticas
2. Geração de certificados automatizada
3. Relatórios avançados de desempenho
4. Integração com calendário
5. Sistema de feedbacks contínuos
