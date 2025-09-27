# Assist Move Assist – Auditoria Técnica

## Estrutura e Documentação
- A documentação oficial descreve um backend baseado em Prisma com separação rigorosa entre camadas (`controllers → services → repositories`). Entretanto, a implementação atual utiliza consultas SQL manuais diretamente nos serviços e rotas, sem qualquer uso do client Prisma declarado no repositório. Isso quebra a arquitetura prometida e torna a manutenção de migrations inconsistentes com o código.

## Frontend
- Há duas implementações distintas de contexto de autenticação (`useAuth.tsx` e `usePostgreSQLAuth.tsx`), ambas exportando `AuthProvider`/`useAuth`. Essa duplicidade aumenta o risco de importar o provider errado e gera estados divergentes (um lê `AuthService`, o outro chama `apiService`).
- O projeto mantém dois `QueryClientProvider` independentes (`App.tsx` e `providers.tsx`), cada um com políticas diferentes de cache. Componentes renderizados em árvores diferentes enxergam caches distintos, quebrando o cache global esperado do React Query.
- `FormulariosContext.tsx` reimplementa manualmente controle de carregamento/paginação/invalidação chamando `apiService` direto. A lógica duplica responsabilidade que já existe nos hooks React Query e impede reuso/caching automático.
- `MessagingWidget.tsx` mantém toda a regra de negócio de mensageria (carregar conversas, criar threads, enviar mensagens) dentro do componente e, ainda assim, utiliza mocks. Isso dificulta testes, impede reuso e não prepara o widget para integrar com o backend WebSocket já existente.
- `ProtectedRoute.tsx` apenas checa se há usuário em memória/localStorage. O fluxo não confirma permissões com o backend nem aproveita o RBAC prometido na documentação, abrindo brecha para páginas protegidas carregarem com permissões stale.
- O menu lateral (`sidebar.tsx`) carece de atributos ARIA (por exemplo, `aria-expanded`/`aria-controls`) nos botões que expandem submenus, o que dificulta navegação com leitores de tela.
- O hook `useSocket.ts` invoca a API de Notificações diretamente sem verificar se `Notification` existe (ambientes SSR/navegadores sem suporte) e sem degradar quando o usuário nega permissão.

## Backend
- Rotas como `mensagens.routes.ts` concentram validação, regras de negócio, acesso ao banco e notificações, contrariando a separação em camadas descrita na documentação e dificultando cobertura de testes.
- O schema `createParticipacaoSchema` aceita `beneficiaria_id` como string, mas o serviço `ParticipacaoService` envia esse valor diretamente para `pg`, esperando um inteiro. Chamadas legítimas podem falhar silenciosamente ou gerar conversões incorretas.
- A invalidação de cache em `ParticipacaoService` usa `redis.keys` com curingas. Em produção, esse comando é O(N) e pode travar a instância Redis; há utilitários baseados em `SCAN` no projeto que deveriam ser reutilizados.
- `setupSecurity` define sanitização contra XSS/NoSQL, mas nunca é aplicado no `app.ts`. A API, portanto, expõe payloads sem higienização adicional apesar da documentação prometer essa camada extra.
- A rota `/auth/refresh` apenas gera um novo JWT com base no token atual, sem armazenar/verificar refresh tokens. Isso invalida a promessa de “JWT + refresh tokens” e limita o controle de revogação.
- As migrations Prisma criam relacionamentos com uma tabela `Project`, mas o banco real utiliza `projetos`. Executar essas migrations falhará, e a divergência entre schema e SQL real inviabiliza o uso do cliente Prisma anunciado.

## CI/CD e Qualidade
- O workflow `ci.yml` chama `npm run lint`, que por sua vez executa `npm run lint` dentro do backend. Não existe script `lint` em `apps/backend/package.json`, portanto a pipeline falha por ausência de script.

