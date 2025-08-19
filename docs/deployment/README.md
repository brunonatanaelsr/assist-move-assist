# Deploy em Produção - Assist Move Assist

## 🚀 Deploy Automático Completo

Este guia descreve o processo de deploy completamente automatizado para o sistema Assist Move Assist em produção usando Ubuntu 24.04 LTS.

### 🎯 Configuração do Deploy

- **Domínio**: `movemarias.squadsolucoes.com.br`
- **Sistema**: Ubuntu 24.04 LTS
- **Super Admin**: `bruno@move.com` / `15002031`
- **SSL**: Let's Encrypt com renovação automática
- **Database**: PostgreSQL puro (sem Supabase)

### 📋 Pré-requisitos

1. **Servidor Ubuntu 24.04 LTS** (mínimo 2GB RAM, 20GB disco)
2. **Domínio configurado** apontando para o IP do servidor
3. **Acesso root/sudo** no servidor
4. **Porta 80 e 443** liberadas no firewall

### 🔧 Execução do Deploy

#### 1. Clone o repositório no servidor:
```bash
git clone https://github.com/brunonatanaelsr/assist-move-assist.git
cd assist-move-assist
```

#### 2. Execute o script de deploy:
```bash
chmod +x scripts/deploy-production.sh
sudo ./scripts/deploy-production.sh
```

#### 3. Aguarde o processo completo (15-20 minutos)

### 🏗️ O que o script faz automaticamente:

#### **Sistema Base**
- ✅ Atualiza Ubuntu 24.04
- ✅ Instala Node.js 20 LTS
- ✅ Instala PostgreSQL 14+
- ✅ Instala Nginx
- ✅ Configura Firewall UFW
- ✅ Configura Fail2Ban

#### **Banco de Dados**
- ✅ Cria usuário e banco PostgreSQL
- ✅ Executa migrações do schema
- ✅ Cria super administrador
- ✅ Configura permissões

#### **Backend Node.js**
- ✅ Instala dependências
- ✅ Configura variáveis de ambiente
- ✅ Compila TypeScript
- ✅ Cria serviço systemd
- ✅ Inicia automaticamente

#### **Frontend React**
- ✅ Builda para produção
- ✅ Configura para API backend
- ✅ Otimiza assets estáticos

#### **Nginx + SSL**
- ✅ Configura proxy reverso
- ✅ Instala certificado SSL
- ✅ Configura renovação automática
- ✅ Headers de segurança
- ✅ Rate limiting
- ✅ Compressão gzip

### 🔐 Credenciais Geradas

O script gera automaticamente:

- **Usuário PostgreSQL**: `assist_user`
- **Senha PostgreSQL**: (gerada automaticamente)
- **JWT Secret**: (gerado automaticamente)
- **Session Secret**: (gerado automaticamente)

### 👤 Super Administrador

- **Email**: `bruno@move.com`
- **Senha**: `15002031`
- **Role**: `admin`
- **Permissões**: Todas as funcionalidades do sistema

### 🌐 URLs de Acesso

Após o deploy:
- **Site**: https://movemarias.squadsolucoes.com.br
- **API**: https://movemarias.squadsolucoes.com.br/api
- **Health Check**: https://movemarias.squadsolucoes.com.br/health

### 🛠️ Scripts de Manutenção

O deploy cria scripts úteis para manutenção:

#### Status do Sistema
```bash
sudo /usr/local/bin/assist-status.sh
```

#### Health Check Completo
```bash
sudo /usr/local/bin/assist-health-check.sh
```

#### Backup Manual
```bash
sudo /usr/local/bin/assist-backup.sh
```

#### Atualização do Sistema
```bash
sudo /workspaces/assist-move-assist/scripts/update-production.sh
```

### 📊 Monitoramento Automático

#### **Logs**
- Backend: `journalctl -u assist-move-assist -f`
- Nginx: `tail -f /var/log/nginx/assist-move-assist-error.log`
- Sistema: `/var/log/assist-move-assist/`

#### **Backups Automáticos**
- **Frequência**: Diário às 02:00
- **Localização**: `/var/backups/assist-move-assist/`
- **Retenção**: 7 dias
- **Conteúdo**: Banco de dados + arquivos

#### **SSL Renovação**
- **Frequência**: Diário às 12:00
- **Comando**: `certbot renew --quiet`
- **Reload**: Nginx recarregado automaticamente

---

**✅ Deploy completamente automatizado e pronto para produção!**

O sistema está configurado com todas as melhores práticas de segurança, monitoramento e backup automático.
- **Git**
- Conta no **Supabase**
- Conta no **Vercel** ou **Netlify**

### Conhecimentos Técnicos
- React/TypeScript
- PostgreSQL básico
- Configuração de DNS
- Conceitos de CI/CD

---

## Configuração do Supabase

### 1. Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta ou faça login
3. Clique em "New Project"
4. Configure:
   ```
   Nome: assist-move-assist-prod
   Database Password: [senha segura]
   Região: East US (ou mais próxima)
   ```

### 2. Configurar Banco de Dados

#### Executar Migrações
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login no Supabase
supabase login

# Conectar ao projeto
supabase link --project-ref [SEU_PROJECT_REF]

# Executar migrações
supabase db push
```

#### Aplicar Schema Completo
```sql
-- Execute no SQL Editor do Supabase Dashboard
-- Arquivo: /migrations/complete_schema.sql

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE oficinas ENABLE ROW LEVEL SECURITY;
-- ... outras tabelas
```

### 3. Configurar Autenticação

#### Configurações de Auth
```javascript
// No Supabase Dashboard > Authentication > Settings
{
  "site_url": "https://seudominio.com",
  "redirect_urls": [
    "https://seudominio.com/auth/callback",
    "http://localhost:3000/auth/callback"
  ],
  "jwt_expiry": 3600,
  "refresh_token_rotation": true,
  "email_confirm_required": true
}
```

#### Criar Usuário Admin Inicial
```sql
-- No SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@seudominio.com',
  crypt('sua_senha_segura', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
);

-- Criar perfil admin
INSERT INTO profiles (id, email, nome_completo, role) 
SELECT id, email, 'Administrador', 'admin' 
FROM auth.users 
WHERE email = 'admin@seudominio.com';
```

### 4. Configurar Storage

#### Buckets Necessários
```sql
-- Criar buckets no SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('images', 'images', true),
  ('documents', 'documents', false),
  ('exports', 'exports', false);
```

#### Políticas de Storage
```sql
-- Política para imagens públicas
CREATE POLICY "Imagens são públicas" ON storage.objects
FOR SELECT USING (bucket_id = 'images');

-- Política para upload de imagens (usuários autenticados)
CREATE POLICY "Usuários podem fazer upload de imagens" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);
```

### 5. Configurar Functions (Opcional)

#### Deploy Functions
```bash
# Fazer deploy das functions
supabase functions deploy generate-document

# Configurar secrets
supabase secrets set OPENAI_API_KEY=sua_chave_openai
```

---

## Configuração do Frontend

### 1. Configurar Variáveis de Ambiente

#### Arquivo: `.env.production`
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_supabase
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# API
VITE_API_BASE_URL=https://seu-dominio/api

# Opcional: Monitoramento
VITE_SENTRY_DSN=https://sua-chave@sentry.io/projeto
VITE_LOGROCKET_APP_ID=seu-app-id

# Configurações da aplicação
VITE_APP_NAME="Assist Move Assist"
VITE_APP_VERSION="1.0.0"
VITE_ENVIRONMENT="production"
```

### 2. Build de Produção

```bash
# Instalar dependências
npm install

# Build de produção
npm run build

# Testar build localmente
npm run preview
```

### 3. Verificar Configurações

#### Arquivo: `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})
```

---

## Deploy Vercel/Netlify

### Deploy na Vercel (Recomendado)

#### 1. Configuração Inicial
```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy inicial
vercel

# Configurar projeto
vercel --prod
```

#### 2. Arquivo `vercel.json`
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "env": {
    "VITE_API_BASE_URL": "@vite_api_base_url",
    "VITE_SUPABASE_URL": "@vite_supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@vite_supabase_anon_key"
  },
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### 3. Configurar Variáveis de Ambiente na Vercel
```bash
# Via CLI
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_API_BASE_URL production

# Ou via Dashboard: vercel.com > Project > Settings > Environment Variables
```

### Deploy na Netlify

#### 1. Arquivo `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  VITE_API_BASE_URL = "https://seu-dominio/api"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

#### 2. Deploy via Git
1. Conecte repositório GitHub
2. Configure build settings:
   ```
   Build command: npm run build
   Publish directory: dist
   ```
3. Adicione variáveis de ambiente no dashboard

---

## Configurações de Produção

### 1. Configurar Domínio Personalizado

#### DNS Settings
```
# Registrar CNAME ou A record
CNAME: www.seudominio.com -> cname.vercel-dns.com
A: seudominio.com -> 76.76.19.61
```

#### SSL/HTTPS
- Vercel: SSL automático
- Netlify: SSL automático
- Cloudflare: Configuração manual

### 2. Configurar CDN e Cache

#### Vercel Edge Caching
```javascript
// Arquivo: vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 3. Configurar Analytics

#### Google Analytics
```typescript
// src/lib/analytics.ts
import { gtag } from 'ga-gtag';

export const trackPageView = (url: string) => {
  gtag('config', 'GA_MEASUREMENT_ID', {
    page_path: url,
  });
};

export const trackEvent = (eventName: string, parameters: any) => {
  gtag('event', eventName, parameters);
};
```

---

## Monitoramento

### 1. Configurar Sentry (Error Tracking)

#### Instalação
```bash
npm install @sentry/react @sentry/tracing
```

#### Configuração
```typescript
// src/lib/sentry.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});
```

### 2. Configurar Monitoramento de Performance

#### Web Vitals
```typescript
// src/lib/webVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function sendToAnalytics(metric: any) {
  // Enviar métricas para analytics
  gtag('event', metric.name, {
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_category: 'Web Vitals',
    event_label: metric.id,
    non_interaction: true,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 3. Configurar Uptime Monitoring

#### UptimeRobot (Gratuito)
```
URL: https://seudominio.com/health
Intervalo: 5 minutos
Alertas: Email, SMS
```

#### Health Check Endpoint
```typescript
// pages/api/health.ts
export default function handler(req: any, res: any) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VITE_APP_VERSION
  });
}
```

---

## Backup e Segurança

### 1. Backup do Banco de Dados

#### Backup Automático Supabase
```bash
# Via CLI (diário)
supabase db dump -f backup-$(date +%Y%m%d).sql

# Configurar cron job
0 2 * * * cd /path/to/project && supabase db dump -f backup-$(date +%Y%m%d).sql
```

#### Backup para S3
```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d)
supabase db dump -f backup-$DATE.sql
aws s3 cp backup-$DATE.sql s3://seu-bucket/backups/
rm backup-$DATE.sql
```

### 2. Configurações de Segurança

#### Headers de Segurança
```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://sua-instancia.supabase.co wss://sua-instancia.supabase.co;"
        }
      ]
    }
  ]
}
```

### 3. Configurar WAF (Web Application Firewall)

#### Cloudflare WAF
```
# Regras recomendadas:
- Rate limiting: 100 requests/minute por IP
- Geo blocking: Bloquear países suspeitos
- Bot protection: Ativado
- DDoS protection: Ativado
```

---

## Troubleshooting

### Problemas Comuns

#### 1. Erro de CORS
```typescript
// Verificar configuração no Supabase
// Dashboard > Settings > API > CORS Origins
// Adicionar: https://seudominio.com
```

#### 2. Build Falha
```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install

# Verificar versões Node
node --version  # Deve ser 18+
npm --version

# Build verbose
npm run build --verbose
```

#### 3. Erro de Autenticação
```typescript
// Verificar redirect URLs
// Supabase > Auth > Settings > Redirect URLs
// Deve incluir: https://seudominio.com/auth/callback
```

#### 4. Performance Lenta
```bash
# Analisar bundle
npm install -g @next/bundle-analyzer
npm run analyze

# Otimizar imagens
npm install sharp
# Converter para WebP
```

### Logs e Debugging

#### Vercel Logs
```bash
# Ver logs em tempo real
vercel logs --follow

# Logs de deploy
vercel logs --deployment [DEPLOYMENT_ID]
```

#### Supabase Logs
```bash
# Logs da API
supabase logs api

# Logs de autenticação
supabase logs auth
```

### Scripts de Manutenção

#### Script de Deploy
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Iniciando deploy..."

# Verificar testes
npm test

# Build de produção
npm run build

# Deploy
vercel --prod

# Verificar saúde
curl -f https://seudominio.com/health || exit 1

echo "✅ Deploy concluído com sucesso!"
```

#### Script de Rollback
```bash
#!/bin/bash
# rollback.sh

echo "⏪ Executando rollback..."

# Obter deployment anterior
PREVIOUS=$(vercel list --limit 2 | grep READY | tail -n 1 | awk '{print $1}')

# Promover deployment anterior
vercel promote $PREVIOUS --scope seu-team

echo "✅ Rollback concluído!"
```

---

## Checklist de Deploy

### Pré-Deploy
- [ ] Testes passando
- [ ] Build de produção funcionando
- [ ] Variáveis de ambiente configuradas
- [ ] Backup do banco criado
- [ ] DNS configurado

### Deploy
- [ ] Deploy realizado com sucesso
- [ ] SSL/HTTPS funcionando
- [ ] Autenticação testada
- [ ] Funcionalidades críticas testadas
- [ ] Performance verificada

### Pós-Deploy
- [ ] Monitoramento configurado
- [ ] Alertas funcionando
- [ ] Backup automático ativo
- [ ] Documentação atualizada
- [ ] Equipe notificada

---

## Contatos e Suporte

### Em Caso de Emergência
1. **Verificar status**: https://status.vercel.com
2. **Logs**: `vercel logs --follow`
3. **Rollback**: Executar script de rollback
4. **Suporte Supabase**: support@supabase.com

### Recursos Úteis
- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Supabase Status](https://status.supabase.com)

---

**Data da última atualização**: Agosto 2025
**Versão do sistema**: 1.0.0
**Responsável**: Equipe de Desenvolvimento
