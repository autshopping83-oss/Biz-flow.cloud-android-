# ✅ CHECKLIST DE SEGURANÇA & QUALIDADE

**Última Atualização**: Maio 2026  
**Status**: Pronto para Implementação

---

## 🔒 SEGURANÇA

### Autenticação & Autorização
- [ ] Guest access requer token assinado (não simples ?guest=true)
- [ ] RLS ativado em TODAS as tabelas do Supabase
- [ ] Verificar `auth.uid()` antes de acessar dados do usuário
- [ ] Logout limpa session state e localStorage
- [ ] Timeout de sessão implementado (30 min inatividade)
- [ ] OAuth tokens armazenados de forma segura

**Teste**:
```bash
# Tentar acessar outro usuário
# 1. Fazer login com user A
# 2. Mudar URL para simular user B
# 3. Deve retornar erro 403 (Forbidden)
```

### Input Validation
- [ ] Email validado com regex ou biblioteca
- [ ] Telefone validado (10-15 dígitos, apenas números)
- [ ] NUIT validado (9 dígitos para Moçambique)
- [ ] Senhas validam força mínima
- [ ] Comprimentos máximos verificados
- [ ] Caracteres perigosos removidos

**Teste**:
```javascript
// Executar no console
validators.email("test@example.com") // true
validators.email("invalid.email") // false
validators.phone("123456789") // false (menos de 10)
validators.phone("123456789012") // true
validators.password("weak") // { valid: false, errors: [...] }
```

### XSS Prevention
- [ ] DOMPurify instalado e usado
- [ ] Nomes de arquivo sanitizados
- [ ] HTML user-input não renderizado direto
- [ ] InnerHTML nunca usado com dados do usuário
- [ ] Content Security Policy header configurado

**Teste**:
```javascript
// Tentar injetar script em nome de cliente
// 1. Criar documento com name: "<img src=x onerror=alert('XSS')>"
// 2. Gerar PDF
// 3. Verificar que output.pdf não contém script
```

### CSRF Protection
- [ ] Tokens CSRF implementados para mutações
- [ ] Same-Origin Policy verificada
- [ ] Custom headers em operações sensíveis
- [ ] POST/PUT/DELETE nunca via formulários simples

**Teste**:
```bash
# Verificar headers de requisição
# curl -i <url> | grep "X-CSRF-Token"
```

### File Upload Security
- [ ] Validação de tipo MIME
- [ ] Limite de 2MB por arquivo
- [ ] Whitelist de extensões (.png, .jpg, .webp)
- [ ] Não salvar em /public ou acesso direto
- [ ] Sanitizar nomes de arquivo antes de salvar
- [ ] Scan de malware se possível

**Teste**:
```javascript
// Tentar uploads maliciosos
// 1. Upload .exe como logo - deve falhar
// 2. Upload 10MB arquivo - deve falhar
// 3. Upload .svg com script - deve falhar
// 4. Upload válido .jpg - deve passar
```

### Data Protection
- [ ] Assinaturas salvas no servidor (não localStorage)
- [ ] Logos com limite de tamanho
- [ ] Dados sensíveis não logados em console
- [ ] HTTPS apenas (força HTTPS redirect)
- [ ] Dados em trânsito encriptados
- [ ] Dados em repouso encriptados (Supabase)

**Teste**:
```javascript
// Verificar armazenamento
// console.log(localStorage) - não deve conter signatures
// console.log(sessionStorage) - não deve conter senhas
```

### API Security
- [ ] Rate limiting implementado
- [ ] Validação de origem (CORS)
- [ ] Versioning de API
- [ ] Deprecation de endpoints antigos
- [ ] Logging de acessos suspeitos

**Teste**:
```bash
# Fazer 100 requisições rápidas
# for i in {1..100}; do curl <endpoint>; done
# Deve receber 429 (Too Many Requests) após limite
```

---

## 🐛 QUALIDADE DE CÓDIGO

### Type Safety
- [ ] `any` type removido
- [ ] Tipos genéricos usados corretamente
- [ ] Union types para estados finitos
- [ ] Exhaustiveness checking em switches

**Teste**:
```bash
npm run lint # Sem erros de tipo
```

### Performance
- [ ] Code splitting implementado (lazy loading)
- [ ] Bundle size < 1MB (com gzip)
- [ ] Lighthouse score > 80
- [ ] Memory leaks resolvidos
- [ ] Re-renders desnecessários removidos

**Teste**:
```bash
npm run build
# Verificar dist/ size
ls -lh dist/assets/

# Chrome DevTools
# Performance tab > Record > Gerar documento > Stop
# Procurar por memory leaks
```

### State Management
- [ ] Dependency arrays completos em useEffect
- [ ] Limpeza de listeners (removeEventListener)
- [ ] Cancelamento de requisições abortadas
- [ ] States não mudam durante render

**Teste**:
```javascript
// DevTools React profiler
// Fisgrap com componentes com warning "setState in render"
```

### Error Handling
- [ ] Try/catch em operações assíncronas
- [ ] ErrorBoundary para componentes
- [ ] Mensagens de erro genéricas (segurança)
- [ ] Logging de erros para debugging
- [ ] Fallback UI em caso de erro

**Teste**:
```javascript
// Desativar internet: Dev Tools > Network > Offline
// Testar funcionalidades - deve mostrar mensagem amigável
```

### Accessibility
- [ ] Alt text em imagens
- [ ] Labels em inputs
- [ ] Contraste de cores >= 4.5:1
- [ ] Keyboard navigation funciona
- [ ] Screen reader compatible

**Teste**:
```bash
npm install -D axe-core
# Executar axe in Chrome DevTools
```

---

## 📱 MOBILE SPECIFIC

### Capacitor
- [ ] Permissões declaradas no AndroidManifest.xml
- [ ] Graceful degradation sem Capacitor
- [ ] Bluetooth conecta/desconecta corretamente
- [ ] Filesystem respeta permissões

**Teste**:
```bash
npm run build
npx cap sync android
# Rodar em dispositivo físico
```

### PWA
- [ ] service-worker.js atualizado
- [ ] manifest.json correto
- [ ] Offline funciona (com dados cached)
- [ ] Install prompt aparece

**Teste**:
```bash
# Chrome
# 1. DevTools > Application > Service Workers
# 2. Marcar "Offline"
# 3. Testar funcionalidades
```

### Storage
- [ ] IndexedDB quota respeitada
- [ ] localStorage não > 5MB
- [ ] Sync com servidor em background
- [ ] Conflitos de sincronização resolvidos

**Teste**:
```javascript
// Simular armazenamento cheio
// Dev Tools > Storage > IndexedDB
// Verificar sincronização quando voltar online
```

---

## 🧪 TESTES

### Unit Tests
- [ ] Validadores testados com casos normais e edge
- [ ] Funções de cálculo (subtotal, tax, total)
- [ ] Geração de números sequenciais

```bash
npm install -D vitest
# Criar src/__tests__/validators.test.ts
```

### Integration Tests
- [ ] Login/Register flow
- [ ] Criar/Editar/Deletar documento
- [ ] PDF generation
- [ ] WhatsApp share

### E2E Tests
- [ ] Fluxo completo de novo usuário
- [ ] Impression térmica
- [ ] Sincronização offline/online

```bash
npm install -D cypress
# Criar cypress/e2e/app.cy.ts
```

---

## 📊 MONITORING

### Analytics
- [ ] Funil de conversão (sign-up to primeira fatura)
- [ ] Taxa de erro
- [ ] Performance metrics (FCP, LCP)
- [ ] Churn rate

### Error Tracking
- [ ] Sentry ou similar configurado
- [ ] Todos os erros capturados
- [ ] Contexto incluído (user, session, ação)

### Logging
- [ ] Logs estruturados (JSON)
- [ ] Níveis apropriados (debug, info, warn, error)
- [ ] PII não logado
- [ ] Rotação de logs

---

## 🚀 DEPLOYMENT

### Pre-Deployment
- [ ] Testes locais passam
- [ ] Build sem warnings
- [ ] Secrets em .env (não no git)
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativado

**Checklist**:
```bash
# Final checks
git status # Nada uncommitted
npm run lint # Sem erros
npm run build # Build sucesso
npm run test # Testes passam
env | grep VITE # Secrets configurados
```

### Post-Deployment
- [ ] Health check endpoint funciona
- [ ] Logs estão sendo coletados
- [ ] Alertas configurados
- [ ] Rollback plano em caso de erro

---

## 📋 DEFESA EM PROFUNDIDADE

### Camada 1: Browser
- ✓ Input validation
- ✓ XSS prevention (sanitize)
- ✓ CSP headers
- ✓ Secure localStorage

### Camada 2: Network
- ✓ HTTPS/TLS
- ✓ CORS
- ✓ Rate limiting
- ✓ WAF rules

### Camada 3: Backend (Supabase)
- ✓ RLS policies
- ✓ SQL injection prevention (parameterized queries)
- ✓ Auth enforcement
- ✓ Input validation

### Camada 4: Database
- ✓ Encryption at rest
- ✓ Backups regulares
- ✓ Access logging
- ✓ Data retention policies

---

## 🔄 CICLO DE SEGURANÇA

### Semanal
- [ ] Revisar logs de erro
- [ ] Verificar rate limiting stats
- [ ] Testar fluxo crítico manualmente

### Mensal
- [ ] Atualizar dependências
- [ ] Executar security audit (`npm audit`)
- [ ] Revisar access logs
- [ ] Performance check

### Trimestral
- [ ] Penetration testing (ou simulação)
- [ ] Code audit completo
- [ ] Atualizar docs de segurança
- [ ] Treinar equipe

### Anual
- [ ] Security compliance review
- [ ] Disaster recovery test
- [ ] Update risk assessment
- [ ] Plan para próximo ano

---

## 📞 CONTATOS & RECURSOS

### Suportes
- Supabase Docs: https://supabase.com/docs
- React Security: https://snyk.io/learn/react-security/
- OWASP: https://owasp.org/www-project-top-ten/

### Tools
- npm audit: `npm audit`
- TypeScript: `npm run lint`
- React DevTools: Chrome Extension
- Lighthouse: Chrome DevTools

---

## ✨ FORMULÁRIO DE SIGN-OFF

```
Revisor: ___________________
Data: ___________________
Build Version: ___________________

Todos os itens deste checklist foram verificados? [ ]

Problemas encontrados: 
_________________________________
_________________________________

Pronto para deployment: [ ] SIM [ ] NÃO

Assinatura: ___________________
```

---

**Para editar este checklist:**
1. Fazer uma cópia em cada sprint
2. Marcar items conforme progresso
3. Comentar qualquer desvio
4. Manter histórico em Git

**Última Revisão**: Maio 2026 - 20 Problemas Identificados
