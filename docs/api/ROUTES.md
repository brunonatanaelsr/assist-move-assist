# Inventário de Rotas

## Autenticação
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/logout` - Logout de usuário
- `GET /api/auth/me` - Obter usuário autenticado

## Beneficiárias
- [Ver documentação detalhada](./routes/beneficiarias.md)
- `GET /api/beneficiarias` - Listar beneficiárias
- `POST /api/beneficiarias` - Criar beneficiária
- `GET /api/beneficiarias/:id` - Buscar beneficiária
- `PUT /api/beneficiarias/:id` - Atualizar beneficiária
- `GET /api/beneficiarias/:id/resumo` - Buscar resumo da beneficiária

## Oficinas
- `GET /api/oficinas` - Listar oficinas
- `POST /api/oficinas` - Criar oficina
- `GET /api/oficinas/:id` - Buscar oficina
- `PUT /api/oficinas/:id` - Atualizar oficina
- `DELETE /api/oficinas/:id` - Excluir oficina
- `GET /api/oficinas/:id/participantes` - Listar participantes da oficina

## Usuários
- `GET /api/usuarios` - Listar usuários
- `POST /api/usuarios` - Criar usuário
- `GET /api/usuarios/:id` - Buscar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Excluir usuário
- `POST /api/usuarios/:id/reset-senha` - Resetar senha do usuário

## Configurações
- `GET /api/configuracoes` - Obter configurações globais
- `PUT /api/configuracoes` - Atualizar configurações globais
- `GET /api/configuracoes/permissoes` - Listar permissões disponíveis
- `GET /api/configuracoes/usuarios/:id/permissoes` - Obter permissões do usuário
- `PUT /api/configuracoes/usuarios/:id/permissoes` - Atualizar permissões do usuário

## Documentos
- `POST /api/documentos/upload` - Upload de documento
- `GET /api/documentos/:id` - Download de documento
- `DELETE /api/documentos/:id` - Excluir documento
- `GET /api/documentos/tipos` - Listar tipos de documento

## Logs e Auditoria
- `GET /api/logs` - Listar logs do sistema
- `GET /api/logs/usuarios` - Listar logs de usuários
- `GET /api/logs/atividades` - Listar logs de atividades

## Considerações
1. Todas as rotas são prefixadas com `/api`
2. Autenticação é requerida para todas as rotas exceto `/api/auth/login`
3. Todas as respostas seguem o [formato padrão de resposta](../RESPONSE_FORMAT.md)
4. Paginação é suportada em todas as rotas de listagem via query params `page` e `limit`
5. Busca e filtros são suportados via query params específicos de cada rota