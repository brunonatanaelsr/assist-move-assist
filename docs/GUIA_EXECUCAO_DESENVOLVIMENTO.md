# Guia de Execução em Ambiente de Desenvolvimento

Este documento reúne as instruções práticas para subir a stack completa do Assist Move Assist durante o desenvolvimento. Ele consolida os requisitos, variáveis de ambiente e comandos essenciais em um passo a passo único, facilitando o onboarding de novas pessoas no time.

## 1. Requisitos Básicos

Antes de iniciar, garanta que as ferramentas abaixo estejam instaladas nas versões recomendadas:

| Ferramenta | Versão sugerida | Observações |
| ---------- | --------------- | ----------- |
| Node.js    | 20.x            | Utilize `nvm install 20 && nvm use 20` para alinhar o ambiente. |
| npm        | 10.x            | Instalado junto com o Node 20. |
| Docker + Compose | Docker 24+, Compose V2 | Necessário para Postgres e Redis. |
| Git        | 2.40+           | Para versionamento e scripts auxiliares. |
| `psql` e `redis-cli` (opcionais) | — | Úteis para administração manual dos serviços. |

## 2. Clonar o Repositório

```bash
git clone git@github.com:SEU-USUARIO/assist-move-assist.git
cd assist-move-assist
```

> Ajuste a URL de clone caso esteja utilizando HTTPS ou Codespaces.

## 3. Configurar Variáveis de Ambiente

Crie os arquivos locais a partir dos templates disponíveis:

```bash
cp .env.example .env.local
cp apps/backend/.env.example apps/backend/.env
```

Os valores padrão suportam o ambiente local. Ajuste apenas se necessário. Principais variáveis:

- **Frontend (`.env.local`)**
  - `APP_URL=http://localhost:5173`
  - `VITE_API_BASE_URL=http://localhost:3000/api`
  - `VITE_WS_URL=ws://localhost:3000`
- **Backend (`apps/backend/.env`)**
  - `PORT=3000`
  - `POSTGRES_HOST=localhost`
  - `POSTGRES_USER=assistmove`
  - `POSTGRES_PASSWORD=assistmove123`
  - `POSTGRES_DB=assist_move_assist`
  - `REDIS_HOST=127.0.0.1`
  - `REDIS_PORT=6379`
  - `CORS_ORIGIN=http://localhost:5173`

## 4. Subir Infraestrutura de Apoio

Inicie Postgres e Redis via Docker Compose:

```bash
docker compose up -d postgres redis
```

Para verificar se os serviços estão rodando:

```bash
docker compose ps
```

Caso deseje derrubar os serviços posteriormente, utilize `docker compose down` (adicione `--volumes` para limpar dados).

## 5. Instalar Dependências

Instale os pacotes do frontend e backend:

```bash
npm install
npm --prefix apps/backend install
```

## 6. Aplicar Migrações e Seeds

Execute as migrações do banco e aplique os dados iniciais necessários para autenticação e testes:

```bash
npm --prefix apps/backend run migrate:node
```

Caso precise resetar a base, derrube os containers com `docker compose down --volumes` e repita as etapas 4 a 6.

## 7. Rodar a Aplicação

Com a infraestrutura pronta, suba backend e frontend em terminais separados:

```bash
# Terminal 1
docker compose up -d postgres redis  # garante que a infraestrutura está ativa
npm --prefix apps/backend run dev         # backend com hot-reload

# Terminal 2
npm run dev                          # frontend Vite
```

A aplicação ficará disponível em `http://localhost:5173` e a API em `http://localhost:3000/api`.

As credenciais iniciais para login encontram-se em [`docs/TEST_CREDENTIALS.md`](TEST_CREDENTIALS.md).

## 8. Fluxo Alternativo: Stack Completa via Docker Compose

Se preferir subir tudo com um único comando (frontend, backend, Postgres e Redis):

```bash
docker compose up -d
```

Após o build inicial, acesse:

- Frontend: http://localhost:5173
- API: http://localhost:3000/api

Para interromper, rode `docker compose down`. Utilize `--volumes` para remover os dados locais se necessário.

## 9. Testes Rápidos

Para garantir que o ambiente está íntegro, os comandos mais utilizados são:

```bash
npm run lint                # lint do frontend
npm run test                # testes do frontend (Vitest)
npm --prefix apps/backend run test   # testes do backend (Jest)
```

Consulte o [README principal](../README.md) para fluxos adicionais, testes end-to-end e guias complementares.

---

Com essas etapas você terá a stack pronta para desenvolvimento iterativo, incluindo migrações aplicadas e dados de teste populados. Em caso de dúvidas, verifique a seção de solução de problemas no README principal.
