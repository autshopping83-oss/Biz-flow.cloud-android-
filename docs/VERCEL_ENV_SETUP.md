# 🚀 Guia de Configuração de Variáveis de Ambiente na Vercel

## 📋 Variáveis Necessárias

A Biz-Flow utiliza as seguintes variáveis de ambiente:

| Nome | Tipo | Descrição | Exemplo |
|------|------|-----------|---------|
| `VITE_SUPABASE_URL` | **Público** | URL do seu projeto Supabase | `https://seu-projeto.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Público** | Chave Anônima do Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_GEMINI_API_KEY` | **Privado** | Chave da API do Google Gemini | `AIzaSy...` |
| `VITE_WALLET_ID` | **Público** | ID da Carteira de Pagamentos | `1764016232895x517043067934736400` |

---

## 🔑 Como Obter as Chaves

### 1️⃣ **Supabase (Banco de Dados)**

1. Acesse: [https://app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para: **Settings > API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

✅ Estas chaves são públicas (ok commitar em `.env.example`)

---

### 2️⃣ **Google Gemini API (IA)**

1. Acesse: [https://ai.google.dev/](https://ai.google.dev/)
2. Clique em **"Get API Key"**
3. Crie um novo projeto ou use um existente
4. Copie a chave gerada → `VITE_GEMINI_API_KEY`

⚠️ **PRIVADO** - Nunca exponha esta chave!

---

### 3️⃣ **Wallet ID (Pagamentos)**

Obtenha com seu provedor de pagamentos (Mozpayment, etc):
- Configure no seu painel de controle
- Use o ID fornecido → `VITE_WALLET_ID`

---

## 🔧 Configurar na Vercel

### Método 1: Dashboard Vercel (Recomendado)

1. **Acesse sua dashboard:** [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione o projeto **biz-flowcloud**
3. Vá para: **Settings > Environment Variables**
4. Clique em **"Add New"**
5. Preencha cada variável:

```
Nome: VITE_SUPABASE_URL
Valor: https://seu-projeto.supabase.co
✓ Production
✓ Preview
✓ Development
[Save]
```

Repita para cada variável.

---

### Método 2: CLI Vercel

```bash
# Instale o Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Configure variáveis de ambiente
vercel env add VITE_SUPABASE_URL
# (Será solicitado o valor)

vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_GEMINI_API_KEY
vercel env add VITE_WALLET_ID

# Verifique o que foi adicionado
vercel env list
```

---

### Método 3: Arquivo `vercel.json`

Crie um arquivo `vercel.json` na raiz do projeto:

```json
{
  "env": [
    {
      "key": "VITE_SUPABASE_URL",
      "value": "@supabase_url"
    },
    {
      "key": "VITE_SUPABASE_ANON_KEY",
      "value": "@supabase_key"
    },
    {
      "key": "VITE_GEMINI_API_KEY",
      "value": "@gemini_key"
    },
    {
      "key": "VITE_WALLET_ID",
      "value": "@wallet_id"
    }
  ]
}
```

Depois execute:
```bash
vercel link
vercel env pull
```

---

## ✅ Checklist Final

- [ ] Supabase URL configurada? (`VITE_SUPABASE_URL`)
- [ ] Supabase Anon Key configurada? (`VITE_SUPABASE_ANON_KEY`)
- [ ] Google Gemini API Key configurada? (`VITE_GEMINI_API_KEY`)
- [ ] Wallet ID configurado? (`VITE_WALLET_ID`)
- [ ] Não há credenciais no arquivo `.env` local?
- [ ] `.env.local` está no `.gitignore`?
- [ ] Deploy foi realizado após configurar variáveis?

---

## 🔄 Deploy Após Configuração

```bash
# Fazer push das mudanças
git add .
git commit -m "Configure environment variables for Vercel"
git push origin main

# Vercel fará auto-deploy automaticamente
# OU manualmente na dashboard
```

---

## 🚨 Segurança

### ⚠️ DO's:
- ✅ Usar `.env.example` com valores dummy
- ✅ Configurar variáveis no dashboard Vercel
- ✅ Usar `VITE_` para variáveis públicas (frontend)
- ✅ Manter `VITE_GEMINI_API_KEY` como privada

### ❌ DON'Ts:
- ❌ Commitar `.env` com valores reais
- ❌ Compartilhar chaves em chat ou emails
- ❌ Expor `VITE_GEMINI_API_KEY` no código sem uso de variáveis de ambiente
- ❌ Usar mesmas chaves em dev/prod

---

## 📞 Suporte

Dúvidas? Consulte:
- Docs Vercel: [https://vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables)
- Docs Supabase: [https://supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)
- Docs Google Gemini: [https://ai.google.dev/docs](https://ai.google.dev/docs)
