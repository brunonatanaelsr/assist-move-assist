# Documentação do Banco de Dados - Move Marias

## Visão Geral
O banco de dados foi projetado para suportar todas as funcionalidades do sistema Move Marias, incluindo gestão de beneficiárias, projetos, oficinas, formulários e documentos.

## Módulos

### 1. Autenticação e Usuários
- `usuarios`: Armazena informações dos usuários do sistema
- `permissoes_usuario`: Gerencia permissões por módulo

### 2. Beneficiárias
- `beneficiarias`: Cadastro completo das beneficiárias do programa

### 3. Projetos e Oficinas
- `projetos`: Projetos do programa
- `oficinas`: Oficinas vinculadas aos projetos
- `participacoes`: Registro de participação nas oficinas

### 4. Formulários
- `anamneses_social`: Formulário de anamnese social
- `roda_da_vida`: Avaliação Roda da Vida
- `plano_desenvolvimento`: Plano de desenvolvimento individual

### 5. Documentos
- `documentos`: Sistema de gestão de documentos

### 6. Auditoria
- `eventos_auditoria`: Registro de todas as ações no sistema

## Relacionamentos Principais

1. Beneficiárias → Formulários (1:N)
2. Projetos → Oficinas (1:N)
3. Oficinas → Participações (1:N)
4. Beneficiárias → Participações (1:N)
5. Usuários → Permissões (1:N)

## Funcionalidades Especiais

1. **Auditoria Automática**
   - Registro de todas as ações
   - Rastreamento de IP
   - Histórico de modificações

2. **Gestão de Documentos**
   - Suporte a múltiplos tipos
   - Vinculação com diferentes entidades
   - Sistema de tags

3. **Formulários Especializados**
   - Anamnese Social
   - Roda da Vida
   - Plano de Desenvolvimento

4. **Controle de Acesso**
   - Permissões granulares por módulo
   - Diferentes níveis de usuário
   - Registro de acessos

## Índices e Otimizações

1. **Índices Principais**
   - Busca por nome/CPF de beneficiárias
   - Filtros por status de projetos
   - Datas de oficinas
   - Relacionamentos principais

2. **Triggers Automáticos**
   - Atualização de timestamps
   - Registro de modificações

## Funções Úteis

1. `get_beneficiaria_formularios`: Retorna todos os formulários de uma beneficiária
   - Tipo do formulário
   - ID do formulário
   - Data de criação
   - Nome do responsável

## Segurança

1. **Dados Sensíveis**
   - Senhas hasheadas com bcrypt
   - Auditoria completa
   - Soft delete para registros

2. **Integridade**
   - Constraints de chave estrangeira
   - Validações de dados
   - Checks em campos críticos
