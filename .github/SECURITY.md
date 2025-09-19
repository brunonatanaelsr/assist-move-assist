# 🔐 Guia de Segurança

## ⚠️ Credenciais e Variáveis de Ambiente

### **NUNCA** commite:

- Senhas em texto claro
- Chaves de API
- Tokens de acesso
- Certificados privados
- Dados sensíveis em geral

### **Como configurar variáveis de ambiente seguras:**

#### **1. Local Development**

```bash
# Crie um arquivo .env.local (já no .gitignore)
cp .github/deploy.env .env.local

# Edite com suas credenciais locais
nano .env.local
```

#### **2. CI/CD (GitHub Actions)**

```bash
# Configure secrets no GitHub:
# Settings > Secrets and variables > Actions

VPS_HOST=seu-servidor.com
VPS_PASSWORD=senha-super-segura
SUPERADMIN_PASSWORD=admin-senha-complexa
```

#### **3. Produção (Docker/Docker Compose)**

```bash
# Use Docker secrets ou variáveis de ambiente
docker run -e VPS_PASSWORD="$VPS_PASSWORD" app

# Ou no docker-compose.yml:
environment:
  - VPS_PASSWORD=${VPS_PASSWORD}
```

## 🛡️ Boas Práticas de Segurança

### **Senhas Fortes**

- Mínimo 12 caracteres
- Letras maiúsculas e minúsculas
- Números e símbolos
- Evitar palavras do dicionário

### **Rotação de Credenciais**

- Trocar senhas a cada 90 dias
- Revogar tokens não utilizados
- Monitorar acessos suspeitos

### **Validação de Entrada**

- Sempre validar dados do usuário
- Usar prepared statements (SQL injection)
- Sanitizar outputs (XSS)

## 🚨 Em Caso de Exposição

1. **Trocar credenciais imediatamente**
2. **Revogar tokens comprometidos**
3. **Verificar logs de acesso**
4. **Notificar equipe de segurança**

## 📞 Contato

Para reportar vulnerabilidades:

- Email: security@squadsolucoes.com.br
- Criar issue privada no GitHub
