# Migração para Cookies HttpOnly e CSRF

Este guia descreve como operar a autenticação com cookies HttpOnly e proteção CSRF, reduzindo exposição do token a XSS e fortalecendo requisições state‑changing.

## Estado Atual

- Login já define cookie HttpOnly `auth_token` (ver `backend/src/routes/auth.routes.ts`).
- O cliente (`src/services/apiService.ts`) envia `withCredentials: true` e, se existir cookie `csrf_token`, envia `X-CSRF-Token` automaticamente.
- Autorização no backend funciona com cookie `auth_token` ou `Authorization: Bearer` como fallback.

## Passos Recomendados

1. Habilitar CORS com credenciais

- Em `backend/src/app.ts` CORS já está ativo. Garanta `credentials: true` e `origin` com a lista de domínios confiáveis (sem `*` em produção).

2. Provisionar CSRF Token (cookie + header)

- Adicionar middleware CSRF e registrar o cookie não HttpOnly `csrf_token` (apenas token aleatório). O cliente devolverá esse valor em `X-CSRF-Token` para métodos mutantes.
- Exemplo de middleware em `backend/src/middleware/csrf.ts` (já incluído neste repo) — não habilitado por padrão.

3. Ligar CSRF no app (opcional, por etapas)

```ts
// backend/src/app.ts
// import { csrfMiddleware } from './middleware/csrf';
// app.use(csrfMiddleware);
```

- Ative inicialmente apenas em ambientes internos e/ou whitelist de rotas para diminuir impacto.

4. Cookies HttpOnly

- Já habilitados no login. Use HTTPS em produção: `secure: true` e `sameSite: 'strict'`.
- Em dev, `secure: false` e `sameSite: 'lax'` facilitam testes locais.

5. Política de Rotas

- Preferir downloads via endpoints autenticados com `Content-Disposition: attachment` (já adotado em documentos).
- Evitar servir diretórios estaticamente para conteúdo de usuários. Imagens do feed passaram a ser servidas por rota autenticada `GET /api/feed/images/:filename`.

## Middleware CSRF (detalhes)

- Gera/renova `csrf_token` no cookie do navegador.
- Exige que requisições `POST/PUT/PATCH/DELETE` incluam `X-CSRF-Token` igual ao cookie `csrf_token`.
- GET/HEAD/OPTIONS são isentos.

## CORS e Proxies

- Configure `CORS_ORIGIN` com domínios separados por vírgula quando houver múltiplos frontends.
- O Vite proxy (`vite.config.ts`) já está pronto para encaminhar `/api` e `/socket.io` para o backend, mantendo `ws: true` e `changeOrigin: true`.

## Rollout sugerido

1. Ativar cookie HttpOnly (já ativo) mantendo também o token no corpo por compatibilidade.
2. Introduzir CSRF middleware em staging com whitelist de rotas críticas.
3. Remover gradualmente o uso do token em `localStorage` no frontend, migrando para autenticação totalmente baseada em cookie.
4. Forçar HTTPS e `secure: true` em produção.

## Troubleshooting

- 401 após login: verifique `CORS` (`origin` correto) e `withCredentials` no cliente.
- CSRF falhando: confirme que o navegador tem `csrf_token` e que o header `X-CSRF-Token` é enviado em métodos mutantes.
- Cookies não chegam: em dev sem HTTPS, use `sameSite: 'lax'` e `secure: false`.
