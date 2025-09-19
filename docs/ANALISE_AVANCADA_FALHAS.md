# Análise Avançada de Falhas

Este documento consolida como o Assist Move Assist detecta, trata e se recupera de falhas em todas as camadas. Ele também lista lacunas e recomendações para aumentar a resiliência operacional.

## Frontend

### Detecção e contenção

- **Error boundary central** – O componente `ErrorBoundary` intercepta exceções de renderização, persiste o erro no estado e envia os detalhes para o logger do frontend com contexto de rota, viabilizando correlação posterior (`page`, `action`). A interface padrão já oferece ações de "Tentar novamente" e "Ir para início", além de aceitar fallbacks customizados ou componentes inteiros para cenários específicos.
- **Fallbacks testados** – Os testes de `ErrorBoundary` garantem que os fallbacks sejam renderizados e que a UI de erro mantenha botões de retry visíveis mesmo sob novas renderizações. Isso evita regressões silenciosas no fluxo de recuperação.
- **Hook de tratamento programático** – O hook `useErrorHandler` fornece um ponto único para normalizar logs de erros não capturados via boundary, acionando `logger.error` e exibindo detalhes verbosos apenas em desenvolvimento.

### Tratamento de requisições e UX após falhas

- **Interceptores Axios** – O `apiService` aplica interceptores para anexar tokens/cookies, enviar cabeçalho de CSRF em mutações, fazer logging detalhado em desenvolvimento e traduzir erros antes de propagá-los. Em respostas de erro, ele remove tokens inválidos, redireciona para o fluxo de login em `401` e encapsula as mensagens em um `ApiResponse` uniforme.
- **Retry com backoff em GET** – O método `get` refaz chamadas idempotentes em falhas de rede ou códigos `5xx`, aguardando 300 ms antes da nova tentativa. Caso ambas falhem, o serviço ainda retorna um envelope padronizado (`success: false`, `message`) que pode ser exibido diretamente.
- **Mensagens amigáveis** – `translateErrorMessage` aplica regexes para converter mensagens técnicas (CPF inválido, duplicidade, erro 500) em textos compreensíveis ao usuário.
- **Hooks React Query** – Os hooks (`useBeneficiarias`, `useCreateBeneficiaria`, etc.) promovem consistência ao lançar exceções quando `success` é `false`, disparando `toast.error` e invalidando caches apenas quando mutações são bem-sucedidas. Isso evita estados locais inconsistentes após falhas de escrita.

## Backend

### Camada de middleware e observabilidade

- **`catchAsync` + `errorHandler`** – Todas as rotas assíncronas usam `catchAsync`, garantindo que exceções caiam no `errorHandler`. O handler gera `traceId` exclusivo, normaliza o status HTTP, oculta detalhes internos em `5xx` e registra o evento com stack trace, método e path via `loggerService`.
- **Logger estruturado** – O `loggerService` usa Winston com rotação diária, logs JSON e níveis dedicados (erro, auditoria, performance, request). Em produção, intercepta `console.*` para padronizar a saída e oferece helpers para medir performance, auditar ações e registrar requisições HTTP.
- **Configuração defensiva** – O bootstrap habilita Helmet, compressão, CORS restritivo em produção, rate limiting configurável e um tratador explícito para colisões de porta. Health-checks e logs de inicialização ajudam a detectar falhas operacionais cedo.

### Serviços resilientes

- **Redis com degradação graciosa** – `cacheService` transforma falhas de leitura em warnings e devolve `null`, evitando que indisponibilidades do cache derrubem as rotas. A exclusão em lote usa `SCAN` para não bloquear o Redis e cai para `KEYS` apenas quando necessário, sempre logando erros com contexto.
- **Stub de cache em memória** – Quando `REDIS_DISABLED=true`, a aplicação ativa um stub em memória com semântica compatível (TTL, listas, transações simples), logando o downgrade de capacidade. A conexão real também limita tentativas e registra falhas recorrentes.
- **Validação de ambiente** – `env.ts` valida variáveis obrigatórias via `zod` e aborta o boot se algo estiver ausente. Em testes, defaults seguros evitam configurações frágeis.

## Cobertura de testes

- **Frontend** – Testes de UI validam que o `ErrorBoundary` exibe fallbacks customizados, mensagens detalhadas em desenvolvimento e mantém botões de retry funcionais.
- **Backend** – A suíte de `error-handling.test.ts` cobre credenciais inválidas, tokens ausentes/inválidos, inputs incorretos e recursos inexistentes, verificando se o payload de erro é retornado com `status` apropriado. As rotas críticas de feed também exigem autenticação, reforçando cenários de falha comuns.

## Recomendações

1. **Telemetria unificada** – Correlacionar o `traceId` backend com logs do `ErrorBoundary` em uma plataforma (Sentry, OpenTelemetry) para rastrear falhas ponta a ponta.
2. **Circuit breaker/retry exponencial** – Estender o `apiService` com política de backoff configurável e abertura de circuito para endpoints críticos, reduzindo pressão em indisponibilidades prolongadas.
3. **Chaos testing** – Automatizar falhas de Redis, PostgreSQL e APIs externas para validar logs, métricas e comportamento do `cacheService`/`apiService` sob estresse.
4. **Alertas orientados por domínio** – Usar `loggerService.audit` e `performance` para alimentar dashboards que sinalizem quedas em fluxos-chave (ex.: matrícula de beneficiárias), priorizando resposta operacional.

Com essas ações, o Assist Move Assist fortalece a capacidade de detectar, conter e solucionar falhas complexas com impacto mínimo às usuárias.
