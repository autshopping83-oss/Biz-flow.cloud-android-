# 🧾 biz-flow.cloud

**biz-flow.cloud** é uma plataforma de gestão de negócios (Business OS) com aplicação **nativa Android** via Capacitor, emissão de documentos profissionais, controle financeiro e sincronização cloud opcional.

[![Android](https://img.shields.io/badge/Android-Native-3DDC84?logo=android)](https://play.google.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF?logo=capacitor)](https://capacitorjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel)](https://vercel.com)

---

## 🚀 Funcionalidades

### 📄 Documentos Fiscais
- **4 tipos**: Fatura, Recibo, Fatura-Recibo, Orçamento
- **PDF profissional monocromático** (jsPDF puro, sem html2canvas)
- **Impressão térmica** 58/80mm via Bluetooth BLE (ESC/POS)
- **Assinatura digital** no canvas + carimbo personalizado

### 💰 Gestão Financeira
- Registo de receitas e despesas
- Dashboard com gráficos de barras, donut e pizza
- Histórico com busca e filtros

### 🌐 Cloud (Opcional)
- Sincronização offline-first com Supabase
- Auth email/password + Google OAuth
- RLS (Row Level Security) em todas as tabelas

### 🌍 Internacionalização (i18n)
- **Detecção automática** de idioma e moeda do dispositivo (`@capacitor/device`)
- Formatador `Intl.NumberFormat` com símbolo da moeda local (sem conversão de valores)
- 5 idiomas: Português, Inglês, Espanhol, Francês, Alemão
- 200+ moedas suportadas

### 🤖 IA (Google Gemini)
- Enriquecimento de descrições de itens (em pausa)

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite |
| **Mobile** | Capacitor 6 (Android nativo) |
| **CSS** | Tailwind CSS 3 (dark mode) |
| **Backend/DB** | Supabase (Auth + DB + Storage) |
| **Offline** | Dexie (IndexedDB) |
| **PDF** | jsPDF puro |
| **BLE** | @capacitor-community/bluetooth-le |
| **CI/CD** | GitHub Actions → AAB signed |
| **Deploy** | Vercel (SPA + serverless API) |

---

## 📁 Estrutura

```
biz-flowcloud/
├── src/                    # Código React (feature-first)
│   ├── app/                # Entry point, hooks, views
│   ├── components/         # Componentes UI partilhados
│   ├── features/           # Módulos de negócio (auth, documents, bluetooth)
│   ├── services/           # API, Dexie, Supabase, traduções
│   ├── types/              # Interfaces TypeScript
│   └── utils/              # Validators, security
├── android/                # Projeto Android nativo (Capacitor)
├── public/                 # Assets estáticos + PWA manifest
├── api/                    # Vercel serverless functions (OAuth, email)
├── services/               # Serviços standalone
│   ├── email-service/      # Servidor Express (Nodemailer + OAuth2)
│   └── whatsapp-service/   # Serviço WhatsApp
├── tools/                  # Ferramentas de desenvolvimento
│   ├── agents/             # Configuração de agentes
│   ├── docs/               # Documentação técnica
│   └── scripts/            # Scripts utilitários
├── supabase/               # Configuração local Supabase CLI
├── .github/                # GitHub Actions workflows
├── capacitor.config.ts     # Configuração Capacitor
├── vite.config.ts          # Configuração Vite
└── vercel.json             # Configuração Deploy Vercel
```

---

## ⚙️ Configuração

```bash
# Instalar dependências
npm install

# Desenvolvimento web
npm run dev

# Build Android
npm run build && npx cap sync
cd android && ./gradlew bundleRelease

# Variáveis de ambiente (.env.local)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 📄 Licença

MIT © biz-flow.cloud
