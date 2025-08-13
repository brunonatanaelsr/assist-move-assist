# 🏠 Assist Move Assist
## Sistema de Gestão para Instituto Social

[![Deploy Status](https://img.shields.io/badge/deploy-success-brightgreen)](https://assist-move-assist.vercel.app)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/brunonatanaelsr/assist-move-assist)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Sistema completo de gestão para institutos sociais, com foco em acompanhamento de beneficiárias, gestão de projetos, oficinas e comunicação interna.

---

## ✨ Funcionalidades Principais

### 👥 **Gestão de Beneficiárias**
- Cadastro completo com validação de documentos brasileiros (CPF, RG, telefone)
- Sistema PAEDI (Plano de Atendimento Individual)
- Histórico detalhado de atividades e evolução
- Controle de presenças em oficinas

### 📊 **Dashboard e Relatórios**
- Dashboard com métricas em tempo real
- Relatórios profissionais em PDF e Excel
- Gráficos interativos de estatísticas
- Exportação avançada com formatação

### 🗨️ **Sistema de Comunicação**
- Feed interno com posts e comentários
- Sistema de mensagens entre usuários
- Notificações em tempo real
- Centro de notificações unificado

### 📝 **Gestão de Tarefas e Projetos**
- Criação e acompanhamento de tarefas
- Gestão de projetos com participantes
- Sistema de prioridades e status
- Controle de prazos e conclusões

### 🎯 **Oficinas e Atividades**
- Cadastro de oficinas e atividades
- Controle de presença em tempo real
- Relatórios de participação
- Acompanhamento de frequência

---

## 🚀 Tecnologias Utilizadas

### **Frontend**
- **React 18** - Interface de usuário moderna
- **TypeScript** - Tipagem estática e desenvolvimento seguro
- **Vite** - Build tool otimizado
- **Tailwind CSS** - Estilização utilitária
- **Shadcn/UI** - Componentes acessíveis e customizáveis

### **Backend**
- **Supabase** - BaaS completo (PostgreSQL + API + Auth + Storage)
- **PostgreSQL** - Banco de dados relacional robusto
- **Row Level Security (RLS)** - Segurança a nível de linha

### **Produção**
- **Vercel** - Deploy e hosting otimizado
- **jsPDF** - Geração de relatórios PDF profissionais
- **XLSX** - Exportação Excel com formatação
- **Sentry** - Monitoramento de erros (preparado)

---

## 📋 Pré-requisitos

- **Node.js** 18+ LTS
- **npm** ou **bun** (recomendado)
- Conta no **Supabase**
- Conta no **Vercel** (para deploy)

---

## 🛠️ Instalação e Configuração

### 1. **Clone o Repositório**
```bash
git clone https://github.com/brunonatanaelsr/assist-move-assist.git
cd assist-move-assist
```

### 2. **Instale as Dependências**
```bash
npm install
# ou
bun install
```

### 3. **Configure as Variáveis de Ambiente**
```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local`:
```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_publica_supabase
```

### 4. **Configure o Banco de Dados**
```bash
# Instalar Supabase CLI
npm install -g supabase

# Conectar ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Aplicar migrações
supabase db push
```

### 5. **Execute o Projeto**
```bash
npm run dev
# ou
bun dev
```

Acesse: [http://localhost:3001](http://localhost:3001)

---

## 📚 Documentação

### **Documentação Técnica**
- 📖 [API Documentation](docs/API_DOCUMENTATION.md) - Documentação completa das APIs
- 🚀 [Deploy Guide](docs/DEPLOY_GUIDE.md) - Guia completo de deploy
- 🔧 [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) - Documentação técnica dos componentes

### **Estrutura do Projeto**
```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── layout/         # Layout e navegação
│   └── auth/           # Autenticação
├── hooks/              # Hooks customizados
├── lib/                # Serviços e utilitários
│   ├── logger.ts       # Sistema de logging
│   ├── validators.ts   # Validação de documentos
│   └── sessionManager.ts # Gerenciamento de sessão
├── pages/              # Páginas da aplicação
├── integrations/       # Integração com Supabase
└── types/              # Definições de tipos
```

---

## 🔐 Segurança e Validações

### **Validações Implementadas**
- ✅ **CPF e CNPJ** - Validação matemática completa
- ✅ **Telefones brasileiros** - Formatação e validação
- ✅ **CEP** - Validação de formato
- ✅ **Email** - Validação robusta com regex
- ✅ **Formulários** - Validação em tempo real

### **Segurança**
- 🔒 **Row Level Security (RLS)** ativo em todas as tabelas
- 🔑 **Autenticação JWT** com refresh automático
- 🛡️ **Error Boundary** para captura de erros
- 📊 **Logging centralizado** para monitoramento

---

## 📈 Monitoramento e Performance

### **Logging System**
```typescript
import { logger } from '@/lib/logger';

// Log de ações
logger.info('Beneficiária criada', {
  page: '/beneficiarias',
  action: 'create_beneficiaria'
});

// Log de erros
logger.error('Erro ao salvar', error, {
  page: '/beneficiarias',
  action: 'save_error'
});
```

### **Performance**
- ⚡ **Lazy loading** de componentes e páginas
- 🗜️ **Code splitting** automático
- 📦 **Bundle optimization** com Vite
- 🎯 **Tree shaking** para reduzir tamanho

---

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes com coverage
npm run test:coverage

# Testes E2E
npm run test:e2e
```

---

## 🚀 Deploy

### **Deploy Automático com Vercel**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### **Configurações de Produção**
- ✅ **SSL/HTTPS** automático
- 🌐 **CDN global** da Vercel
- 📊 **Analytics** integrado
- 🔄 **Auto-deploy** no push para main

Ver guia completo: [Deploy Guide](docs/DEPLOY_GUIDE.md)

---

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # Linter ESLint
npm run type-check   # Verificação de tipos TypeScript
npm test             # Executar testes
```

---

## 🤝 Contribuição

### **Como Contribuir**
1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

### **Padrões de Código**
- ✅ **TypeScript** obrigatório
- ✅ **ESLint** configurado
- ✅ **Prettier** para formatação
- ✅ **Conventional Commits** preferido

---

## 📞 Suporte

### **Em Caso de Problemas**
1. Verifique a [documentação](docs/)
2. Consulte as [issues abertas](https://github.com/brunonatanaelsr/assist-move-assist/issues)
3. Abra uma nova issue com detalhes do problema

### **Contatos**
- 📧 **Email**: brunonatanaelsr@gmail.com
- 💼 **LinkedIn**: [Bruno Natanael](https://linkedin.com/in/brunonatanaelsr)
- 🐙 **GitHub**: [@brunonatanaelsr](https://github.com/brunonatanaelsr)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🎯 Status do Projeto

### **Funcionalidades Implementadas** ✅
- [x] Sistema completo de autenticação
- [x] Gestão de beneficiárias com validações
- [x] Feed com comentários em tempo real
- [x] Sistema de tarefas e projetos
- [x] Relatórios profissionais (PDF/Excel)
- [x] Controle de presenças em oficinas
- [x] Sistema de mensagens
- [x] Dashboard com métricas
- [x] Infraestrutura de produção completa

### **Próximas Funcionalidades** 🚧
- [ ] Notificações push
- [ ] Integração com WhatsApp
- [ ] Sistema de backup automático
- [ ] Analytics avançados
- [ ] Mobile app (React Native)

---

## 📊 Estatísticas

![GitHub last commit](https://img.shields.io/github/last-commit/brunonatanaelsr/assist-move-assist)
![GitHub issues](https://img.shields.io/github/issues/brunonatanaelsr/assist-move-assist)
![GitHub pull requests](https://img.shields.io/github/issues-pr/brunonatanaelsr/assist-move-assist)

---

**Desenvolvido com ❤️ para institutos sociais que fazem a diferença**
