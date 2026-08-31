# Phase 0 Native — Audit de Autenticação (login opcional)

Data: 2026-08-31 · Branch `feat/phase-0-native` · Validação: CI (compilação offline impossível, AAPT2 musl vs glibc)

## 1. Porque o LoginScreen é o primeiro ecrã (comportamento a corrigir)

`MainActivity.kt:36-44` — `AuthGate` decide o conteúdo da raiz:

```kotlin
when (sessionStatus) {
    is SessionStatus.Authenticated -> AppShell()
    SessionStatus.LoadingFromStorage -> AuthLoadingScreen()
    else -> LoginScreen()          // <-- qualquer não-autenticado cai aqui
}
```

Para qualquer utilizador sem sessão, a app abre no `LoginScreen`. Isto torna o login
**obrigatório** no primeiro arranque, o que contradiz o requisito "login opcional; modo
local deve funcionar sem conta/internet". O `LoginScreen` não é uma falha em si, mas
está no lugar errado: deve viver dentro de um fluxo "Perfil/Conta/Cloud", não na raiz.

## 2. Porque "Criar conta" não funciona hoje

`AuthManager.signUp` (AuthManager.kt:40-52) chama `signUpWith(Email)` e **imediatamente**
`signInWith(Email)`. Problemas:

- Se o e-mail estiver **já registado**, `signUpWith` devolve o utilizador existente e o
  `signInWith` seguinte inicia sessão — comportamento confuso (não avisa "já existe").
- Se `Enable email confirmations` estiver ativo no Supabase, `signUpWith` cria a conta
  mas **não** gera sessão; o `signInWith` subsequente falha com "Email not confirmed".
  O fluxo não distingue "conta criada, confirme o e-mail" de "falha".
- A `LoginScreen` partilha o mesmo ecrã/submit para entrar e criar conta; não há um
  ecrã de registo dedicado com estado Loading/Error/Confirmação.
- Sem tratamentode `Loading`, `Success` e `Error` explícitos no registo.

## 3. Não existe recuperação de palavra-passe

`AuthManager` não tem qualquer método `resetPasswordForEmail`. A `LoginScreen` não tem
ligação "Esqueci a palavra-passe". `AuthConfig` não do remetente (smtp/from) configurado
no código — depende da consola Supabase.

## 4. Google Sign-In

- **supabase-kt 2.6.1 (instalado)**: `Google` é um `IDTokenProvider` (Providers.kt:4),
  mas via `signInWith(Google)` + `startExternalAuth` abre o **browser** e faz OAuth
  completo (implicit ou PKCE) com deep-link de retorno — ver `Android.kt:34-51
  handleDeeplinks`. **Não** requer Google Sign-In SDK/Play Services; requer:
  1. `AuthConfig { scheme = "bizflowcloud"; host = "auth"; flowType = ... }` — hoje o
     `SupabaseClientProvider` faz `install(Auth)` sem config (scheme/host = null), por
     isso `handleDeeplinks` retorna cedo e OAuth falharia.
  2. `MainActivity.onNewIntent/onCreate` a chamar `auth.handleDeeplinks(intent)`.
  3. O provider "Google" **habilitado e configurado na consola Supabase** (redirect
     `bizflowcloud://auth`, client ID OAuth) — configuração externa `ai`, fora do repo.
- **Apenas-local** (sem SUPABASE_URL/KEY no build): sem Google. Este caminho exige cloud.

## 5. Room suporta utilizador anónimo (sem gate em dados)

As entidades `clients`, `transactions`, `products` têm coluna `userId: String?`; o
`documents` **não** tem coluna de ownership local. Nenhum DAO/UI aplica gate por user —
os dados locais são lidos/escrítes independentemente de sessão. O modo local funciona
hoje por completo; só o sync é que exige sessão.

## 6-7. Dados locais sem dono + transição local → cloud

- Ownership é atribuída **em push**, não no armazenamento local: `RemoteSync.pushDocument`
  faz `toRemoteDoc(items).withUser(uid)` (RemoteSync.kt:17-20) — o `uid` da sessão activa
  é gravado na linha remota no momento do push. Pull é user-scoped via RLS.
- Na primeira autenticação, o que subir para a conta do novo user? Isso é uma decisão de
  produto/privacy (ver questões). Opção não-destrutiva de base: **só sobe o que o user
  autoriza** (outbox já pendente ou botão "Sincronizar agora" explícito). Nenhuma
  migração destrutiva de esquema é necessária — `documents` não precisa de coluna local.

## 8. Logout NÃO apaga dados locais (correcto)

`AuthManager.signOut` chama `auth.signOut()` apenas — não toca em Room. O `AppShell`
liga `onSignOut = { app.authManager.signOut() }` (AppShell.kt:70). Após logout a sessão
torna-se `NotAuthenticated` e hoje o `AuthGate` voltaria ao `LoginScreen`; com a mudança
para login opcional, deve voltar ao `AppShell` (modo local).

## 9. Google OAuth — deep-link / redirect

Atual `AndroidManifest.xml` regista `<data android:scheme="bizflowcloud"
android:host="auth" />` e `AppShell` regista deep link `bizflowcloud://auth` na rota
HOME (AppShell.kt:47). Precisa de:
- `SupabaseClientProvider`: configurar `AuthConfig { scheme="bizflowcloud"; host="auth" }`
  para que `handleDeeplinks` valide.
- `MainActivity`: chamar `supabase.handleDeeplinks(intent)` no arranque e `onNewIntent`.
- **Redirect na consola Supabase** para `bizflowcloud://auth` (config externa).

## 10. Ficheiros a alterar (mapa)

- `MainActivity.kt` — `AuthGate` passa a renderizar `AppShell` sempre (modo local
  default); `handleDeeplinks` no `onCreate`/`onNewIntent`.
- `SupabaseClientProvider.kt` — `AuthConfig` scheme/host para o deep-link.
- `AppShell.kt` — rota de Account/Cloud; navegação para Login/Registo/Recuperação; logout
  volta para modal local (não para login).
- `MoreScreen.kt` — item "Conta/Cloud" que abre a área de conta.
- `AuthManager.kt` — `resetPasswordForEmail`, `signInWith(Google)` (via
  `signInWith(Google)` no 2.6.1), distinguir estados signUp (confirm vs exists).
- `LoginViewModel.kt` / `LoginScreen.kt` — mover para dentro do fluxo de conta; adicionar
  estados Loading/Success/Error; ligação para registo e recuperação.
- Novos: `ui/auth/SignUpScreen.kt`, `ui/auth/RecoverScreen.kt`, estado de conta
  (LOCAL_ONLY/AUTHENTICATED/OFFLINE/SYNCING/...).
- `strings.xml` ×7 — novas chaves i18n (login opcional, conta, registo, recuperação,
  Google). Fonte de verdade: `/tmp/gen_i18n.py`.
- `SyncWorker`/`SyncRepository` — correr sync só quando autenticado (ou no-op seguro).

## 11. Limitação de validação runtime (honestidade)

Não há dispositivo/emulador neste ambiente; a compilação local é impossível (AAPT2
musl/glibc). A única validação disponível é CI (unit tests + signed bundle release).
Fluxos que dependem de ambiente externo **não validáveis por CI** e exigirão teste em
dispositivo/testes de produção:
- OAuth Google real (precisa de provider/redirect configurados na consola Supabase).
- E-mail de confirmação/recuperação (precisa de SMTP configurado).
- Comportamento offline real (connectividade).
Será reportado explicitamente ao fim.

## 12. Implementado (iteração 8 — CI verde)

- **Login opcional**: `AuthGate` removido; `MainActivity` renderiza sempre `AppShell`
  (modo local default). Login deixou de ser o primeiro ecrã.
- **`SupabaseClientProvider`**: `install(Auth) { scheme="bizflowcloud"; host="auth" }`
  para o deep-link OAuth.
- **`MainActivity`**: `onCreate` + `onNewIntent` → `auth.handleDeeplinks(intent)`
  (importa a sessão no retorno do OAuth, fluxo IMPLICIT via fragment).
- **`AuthManager`**: `signInWithGoogle()` (browser OAuth `signInWith(Google)`),
  `resetPasswordForEmail(email)`; `signUp` corrigido (só faz auto-signin se a sessão
  não foi criada no signUp — trata confirmação de email).
- **Conta/Cloud**: `AccountScreen` + `LoginScreen` (com "Continuar com Google" e link
  "Esqueci a palavra-passe") + `SignUpScreen` + `RecoverScreen`, acessíveis do
  `MoreScreen`; o fluxo sai automaticamente quando a sessão fica Authenticated.
- **Dados locais**: sem migração destrutiva; `documents` sem coluna local de owner —
  ownership atribuída em push via `withUser(uid)`. `SyncWorker` continua no-op sem
  sessão → modo local 100% offline; dados só sobem por opt-in (botão/sync explícito).
- **i18n**: +17 chaves ×7 locales (102 consistentes).
- **Teste**: `AuthManagerTest` (local-only → NotConfiguredException; sem sessão).

### Validação
- CI **verde**: `:app:testDebugUnitTest` passou + `:app:bundleRelease` (assinado,
  `app-release.aab`) — commit `6b57847`.
- **Não validável por CI** (requer dispositivo + consola): fluxo Google OAuth completo
  (browser → deep-link → sessão), confirmação de email, e-mail de recuperação, e
  comportamento offline real. A ligação de código ao Supabase já configurado está feita.

