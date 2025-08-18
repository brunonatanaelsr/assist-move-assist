# Assist Move Assist

Sistema de gestão para institutos sociais que auxilia no acompanhamento de beneficiárias, na organização de projetos e na comunicação interna.

## Visão Geral
- Cadastro e acompanhamento de beneficiárias
- Dashboard com métricas e exportação de relatórios (PDF/Excel)
- Feed de comunicação e sistema de mensagens
- Gestão de tarefas, projetos e oficinas

## Requisitos
- Node.js 18+
- npm
- Conta no Supabase
- Conta na Vercel (para deploy)

## Instalação
1. **Clone o repositório**
   ```bash
   git clone https://github.com/brunonatanaelsr/assist-move-assist.git
   cd assist-move-assist
   ```
2. **Instale as dependências**
   ```bash
   npm install
   ```
3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env.local
   ```
   Edite `.env.local` com as chaves do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_publica_supabase
   ```
4. **Configure o banco de dados**
   ```bash
   npm install -g supabase
   supabase link --project-ref SEU_PROJECT_REF
   supabase db push
   ```
5. **Execute o projeto**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000)

## Scripts Úteis
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # Linter ESLint
npm run type-check   # Verificação de tipos TypeScript
npm test             # Executar testes
npm run test:coverage # Testes com coverage
npm run test:e2e     # Testes E2E
```

## Testes

### Unitários
Execute todos os testes de unidade do frontend e backend:

```bash
npm test
```

Para testar apenas o frontend ou backend:

```bash
npm run test:frontend
npm run test:backend
```

### E2E
Os testes end-to-end usam Playwright e requerem build prévio do frontend:

```bash
npm run build
npm run test:e2e
```

## Arquitetura
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS. Código principal em `src/`. Detalhes de componentes e hooks em [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md).
- **Backend**: Supabase (PostgreSQL, Auth, Storage). Implementação alternativa com Node/Express em [`backend/`](backend/README.md) para uso com PostgreSQL puro.

Para documentação detalhada consulte:
- [Documentação Técnica](docs/TECHNICAL_DOCUMENTATION.md)
- [Documentação da API](docs/API_DOCUMENTATION.md)
- [Guia de Deploy](docs/DEPLOY_GUIDE.md)
- [Banco de Dados](docs/database/)

---
Projeto sob licença MIT.
