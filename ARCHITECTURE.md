# Architecture — ToDo Premium

Este documento descreve a arquitetura interna do app **ToDo Premium** (Expo Router + Drawer + Google/Login local + API JWT),
com foco em manutenção e evolução. Ele complementa o README de uso.

> ✅ Atualizado para o estado atual do projeto:
> - Drawer em **`app/(drawer)`**
> - `app/index.tsx` (redirect inicial)
> - `GestureHandlerRootView` no root (necessário por Drawer + `Swipeable`)
> - Sessão centralizada em `src/auth/AuthProvider.tsx`
> - HTTP client com timeout + Bearer + logout automático em **401/403**
> - To‑Dos com **paginação cursor-based**, **filtros/busca server-side**, **totais (`totalAll/totalFiltered`)** e **bulk delete**
> - Perfil alinhado ao backend novo (conta **Google vs Local**) e upload de imagem via API externa
> - ✅ **Fix do Drawer mostrando arquivos “de suporte”**: em `app/(drawer)`, arquivos que **não são telas** devem começar com `_` (ex.: `_todos.ui.tsx`, `_todos.logic.ts`, `_reminders.local.ts`) para **não virarem rotas** e **não aparecerem no menu**.

---

## 1) Visão geral (camadas)

O app é dividido em duas áreas principais:

1. **`app/` (rotas/telas)**  
   - Navegação (Expo Router), telas e interação com o usuário.
2. **`src/` (lógica de aplicação)**  
   - Sessão/auth, persistência de token, client HTTP, módulos de API e componentes reutilizáveis.

Fluxo macro:

```
UI (Expo Router: app/*)
   ↓ usa hooks/serviços
Sessão + Serviços (src/auth, src/api, src/storage)
   ↓ chama
API (NestJS) via HTTP (Bearer JWT)
```

---

## 2) Navegação (Expo Router)

### 2.1 Root Stack (`app/_layout.tsx`)

**Responsabilidades**
- Envolve o app em `<AuthProvider>`
- Envolve o root em `GestureHandlerRootView` (Drawer + Swipeable/gesture-handler)
- Define `Stack` com `headerShown: false` (as telas usam seu próprio header)
- Registra as rotas principais:
  - `index` (entrada)
  - `login`, `register` (+ opcionais `forgot-password`, `reset-password`)
  - `(drawer)` (grupo logado)

**Por que isso importa**
- O `AuthProvider` fica no topo: qualquer tela pode usar `useAuth()` e reagir à sessão.
- `GestureHandlerRootView` evita bugs/crashes no Android com gestos (Swipeable + Drawer).

### 2.2 Entrada padrão (`app/index.tsx`)

**Objetivo**
- Centralizar o redirecionamento inicial e evitar problemas de rota “/” no release.

**Fluxo**
- Enquanto `isBootstrapping === true` → mostra loading (ou tela leve)
- Se `user` existe → `router.replace("/(drawer)")`
- Senão → `router.replace("/login")`

### 2.3 Drawer (área logada) (`app/(drawer)/_layout.tsx`)

Cria o Drawer com as telas:

- `index` → “To‑Dos”
- `profile` → “Perfil”
- `todo/[id]` → “To‑Do” (detalhe; **oculto** no menu)

**Importante**
- A pasta deve ser exatamente **`app/(drawer)`** (com parênteses).  
  `app/drawer` (sem parênteses) quebra o roteamento do Expo Router.

**Boas práticas para manter o menu limpo**
- Declare explicitamente apenas as telas desejadas no Drawer:
  - `index`, `profile`
- Oculte telas roteáveis que não devem aparecer:
  - `todo/[id]` com `drawerItemStyle: { display: "none" }`
- Arquivos de suporte (helpers/UI/logic) dentro de `app/(drawer)` devem começar com `_`.

---

## 3) Autenticação e Sessão

### 3.1 Objetivo

Transformar:
- **Google ID Token** (Web/Android) **ou**
- **email/senha** (login local)

em um **JWT da API** (NestJS), persistir esse token, e manter o usuário logado com bootstrap.

### 3.2 Componentes envolvidos

- UI:
  - `app/login.tsx` (Google + login local)
  - `app/register.tsx` (cadastro local)
  - (opcional) `app/forgot-password.tsx` e `app/reset-password.tsx`
- Sessão:
  - `src/auth/AuthProvider.tsx`
  - `src/auth/types.ts`
- Persistência do token:
  - `src/storage/token.ts`
- Chamadas de API:
  - `src/api/client.ts` (wrapper fetch)
  - `src/api/auth.ts` (`/auth/*`)
  - `src/api/me.ts` (`GET /me`)
  - `src/api/account.ts` (PATCH/DELETE `/me*`)
- Eventos:
  - `src/utils/events.ts` (emissor leve)
  - evento `AUTH_EXPIRED_EVENT` (401/403)

### 3.3 Fluxo: Google Login (Web)

1. `app/login.tsx` carrega GIS: `https://accounts.google.com/gsi/client`
2. Inicializa com `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
3. Recebe `resp.credential` (ID Token)
4. Chama `loginWithGoogleIdToken(idToken)`
5. `AuthProvider` troca token:
   - `POST /auth/google` `{ idToken }` (`auth:false`)
6. API retorna `{ ok:true, token, user }`
7. App salva token e entra em `/(drawer)`

### 3.4 Fluxo: Google Login (Android nativo)

1. `GoogleSignin.configure({ webClientId })`
2. `GoogleSignin.hasPlayServices()`
3. `GoogleSignin.signIn()` retorna tokens (ou `getTokens()` como fallback)
4. Chama `loginWithGoogleIdToken(idToken)` → mesmo fluxo do backend

> Observação: login nativo não funciona no **Expo Go** (precisa Dev Client / APK / EAS).

### 3.5 Fluxo: Login/Cadastro local

- Login:
  - `POST /auth/login` `{ email, password }` (`auth:false`)
- Register:
  - `POST /auth/register` `{ name, email, password }` (`auth:false`)

### 3.6 Bootstrapping (sessão persistida + warmup)

Ao iniciar o app, `AuthProvider`:

1) faz **warmup** `GET /` (best-effort) para reduzir falhas em cold start do Render  
2) lê token:
   - Web: `localStorage`
   - Mobile: `expo-secure-store`
3) se houver token, chama `GET /me`
4) se falhar, limpa token e seta `user=null`
5) marca `isBootstrapping=false`

### 3.7 Expiração de token (logout automático)

- `src/api/client.ts` detecta **401/403** e emite `AUTH_EXPIRED_EVENT`
- `AuthProvider` escuta esse evento e chama `logout()`:
  - limpa token
  - zera `user`
  - telas redirecionam para `/login`

---

## 4) Persistência do Token (`src/storage/token.ts`)

Chave: **`todo_api_jwt_v1`**

- Web: `window.localStorage`
- Mobile: `expo-secure-store`

API:
- `getToken(): Promise<string | null>`
- `setToken(token: string): Promise<void>`
- `clearToken(): Promise<void>`

---

## 5) Cliente HTTP (`src/api/client.ts`)

Função principal: `api<T>(path, opts)`

### Responsabilidades
- Base URL via env:
  - `EXPO_PUBLIC_API_BASE_URL` (fallback local)
- Headers padrão + injeção de `Authorization: Bearer <token>` (exceto `opts.auth === false`)
- Tratamento de body:
  - `FormData`: não seta `Content-Type` (fetch coloca boundary)
  - objetos/arrays: envia JSON
  - string: envia como texto (caller pode setar header)
- Timeout: `AbortController` (default 20s; ajustável por endpoint)
- Parse resiliente:
  - lê `res.text()`, tenta JSON, senão retorna texto puro
- Erros:
  - converte status para mensagens legíveis
  - emite evento `AUTH_EXPIRED_EVENT` em 401/403

---

## 6) Módulo de Usuário / Perfil

### 6.1 Endpoints (backend)

- `GET /me`
- `PATCH /me` `{ name?: string|null, picture?: string|null }`
- `PATCH /me/email`
  - **canônico atual**: `{ email, password }`
  - compat: alguns builds aceitam `{ newEmail, password }`
  - resposta: `{ ok:true, token, user }` (token novo porque o email está no payload do JWT)
- `PATCH /me/password` `{ currentPassword, newPassword }` (somente conta local)
- `DELETE /me`
  - conta local exige `password`
  - conta Google pode omitir

### 6.2 Regras: conta Google vs conta local

- **Conta Google** (`user.googleSub` existe):
  - não pode alterar email/senha
  - não faz reset de senha
  - no app: seções de email/senha/foto podem ficar ocultas conforme regra do produto
- **Conta local**:
  - pode alterar nome/foto/email/senha
  - ao alterar email: precisa atualizar token salvo no app

### 6.3 API do app (`src/api/account.ts`)

- `patchMeEmail(email, password)` envia `{ email, newEmail: email, password }` para compatibilidade.
- `deleteMe(password?)` usa querystring quando há password (mais robusto do que body em DELETE).

---

## 7) Upload de Imagens (API externa)

Arquivo: `src/api/images.ts`

- Base por env:
  - `EXPO_PUBLIC_IMAGES_API_BASE_URL`
  - fallback: `https://armazenamentoarquivos.com.br/api-images`
- Endpoint:
  - `POST /upload` (multipart field `file`)
- Retorno esperado:
  - `{ ok:true, url }` (ou `data.url` em alguns formatos)

---

## 8) Módulo To‑Dos

### 8.1 API (`src/api/todos.ts`)

Query params canônicos:
- `take` (alias `limit`)
- `cursor`
- `filter=all|open|done` (alias `status`)
- `q` (alias `search`)
- `done` (compat)

Resposta (backend novo) inclui `items`, `nextCursor`, `hasMore` e totais `totalAll/totalFiltered`.

### 8.2 Lista (`app/(drawer)/index.tsx`)
- filtros + busca server-side (debounce)
- paginação cursor-based (`onEndReached`)
- swipe toggle/delete + confirmação
- bulk delete e (opcional) delete all
- exibe totais (“Carregados X de Y”) usando:
  - sem filtro/busca → `totalAll`
  - com filtro/busca → `totalFiltered`

---

## 9) UI / Design System
- `src/ui/theme.ts` (tokens)
- `src/ui/components.tsx` (componentes)
- `src/ui/confirm.ts` (confirmAction cross-platform)
- `src/ui/KeyboardScreen.tsx` (keyboard-safe)

---

## 10) Android: estabilidade, teclado e build
- Root com `GestureHandlerRootView`
- `app.json`: `android.softwareKeyboardLayoutMode="resize"`
- Build local:
  - `npx expo prebuild --clean`
  - `cd android`
  - `gradlew.bat clean`
  - `gradlew.bat assembleRelease`

---

## 11) Diagramas resumidos

### Login (Google)
```
Web/Android → obtém Google ID Token
  ↓
app/login.tsx
  ↓ loginWithGoogleIdToken(idToken)
AuthProvider
  ↓ POST /auth/google (auth:false)
API (NestJS)
  → token + user
AuthProvider
  → setToken(token) + setUser(user)
  ↓
router.replace("/(drawer)")
```

### Bootstrapping
```
App start
  ↓
AuthProvider warmup (GET /)
  ↓
getToken()
  ├─ não tem → user=null → /login
  └─ tem token → GET /me
       ├─ ok → user=me
       └─ falha → clearToken → user=null
```
