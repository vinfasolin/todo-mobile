# ToDo Premium (Expo Router + Google Login + API JWT)

Aplicativo **cross‑platform (Android + Web)** de tarefas (To‑Dos) com:

- **Login Google**
  - **Web:** Google Identity Services (GIS) via script `gsi/client`
  - **Android (APK/Dev Client):** Play Services via `@react-native-google-signin/google-signin`
- **Login local (Email/Senha)** *(quando habilitado na API)*
- Troca do **Google ID Token** (ou credenciais locais) por um **JWT da sua API** (NestJS no Render)
- **CRUD de tarefas** sincronizadas pela API (`/todos`)
- **Sessão persistida**
  - Web: `localStorage`
  - Mobile: `expo-secure-store`
- **Token expirado** (401/403) → logout automático + redirecionamento para `/login`
- **Warmup do backend (Render)** para reduzir falhas por “hibernação”
- **Navegação com Drawer** (Expo Router group `/(drawer)`), com tela de detalhe **oculta no menu**
- **Swipe** (concluir/reabrir e excluir) com `Swipeable`
- **Lazy loading cursor-based** com **filtros/busca server-side** (carrega em páginas, ex. **5 em 5**, configurável)
- **Totais do servidor** (backend novo): `totalAll` e `totalFiltered`
- **Bulk delete** (1 chamada no backend) respeitando filtro/busca
- **ConfirmAction** unificado (web `confirm()` + `Alert` no mobile) para ações destrutivas
- **Perfil alinhado com backend (conta Google vs local)**
  - Conta **Google**: **não** troca **foto**, **email** e **senha** no app (foto/email são gerenciados pelo Google)
  - Conta **local**: pode trocar **nome**, **foto**, **email** (retorna token novo) e **senha**
- ✅ **Fix de rotas acidentais no Drawer**: arquivos de suporte em `app/(drawer)` devem começar com `_` (ex.: `_todos.ui.tsx`, `_todos.logic.ts`, `_reminders.local.ts`) para **não** aparecerem como itens no menu.

> API padrão (no `.env`):  
> `EXPO_PUBLIC_API_BASE_URL=https://todo-nest-api-p6b1.onrender.com`  
>
> API de imagens (upload), se você usa troca de foto em conta local:  
> `EXPO_PUBLIC_IMAGES_API_BASE_URL=https://armazenamentoarquivos.com.br/api-images`

---

## Stack & dependências principais

- Expo SDK **54**
- React **19**
- React Native **0.81**
- `expo-router` (rotas por arquivos)
- `expo-secure-store` (token no mobile)
- `expo-linear-gradient` (UI/branding)
- `react-native-gesture-handler` + `Swipeable` (gestos + swipe)
- `@react-native-google-signin/google-signin` (login nativo Android)
- Web: **Google Identity Services** (GIS) via `https://accounts.google.com/gsi/client`

> **Importante:** como usamos `Swipeable` e Drawer, o root do app deve estar envolvido por `GestureHandlerRootView`.

---

## Estrutura do projeto (atual)

> ⚠️ A pasta do drawer precisa ser **`app/(drawer)`** (com parênteses).  
> `app/drawer` (sem parênteses) **quebra as rotas** e pode causar “unmatched route” no release.

### Tree

```text
app/
  _layout.tsx              # Root Stack + AuthProvider + GestureHandlerRootView
  index.tsx                # Entrada: redireciona para /(drawer) ou /login
  login.tsx                # Login (Web GIS + Android nativo + email/senha)
  register.tsx             # Cadastro local
  forgot-password.tsx      # (opcional) fluxo de esqueci a senha
  reset-password.tsx       # (opcional) fluxo de redefinição
  +not-found.tsx           # (opcional) rota 404 amigável

  (drawer)/
    _layout.tsx            # Drawer (To‑Dos, Perfil, todo/[id] oculto)
    index.tsx              # Lista/CRUD + filtros + modais + swipe + lazy loading + totals
    profile.tsx            # Perfil + refresh /me + logout (Google vs local)
    todo/
      [id].tsx             # Detalhe/edição por ID (oculto no menu)

    _todos.ui.tsx          # (suporte) UI da lista/modais (não é rota)
    _todos.logic.ts        # (suporte) lógica/estado (não é rota)
    _reminders.local.ts    # (suporte) lembretes locais (não é rota)

src/
  api/
    client.ts              # fetch wrapper + Bearer token + timeout + 401/403 => event
    auth.ts                # /auth/google, /auth/login, /auth/register, forgot/reset
    me.ts                  # GET /me
    account.ts             # PATCH /me, PATCH /me/email, PATCH /me/password, DELETE /me
    todos.ts               # CRUD /todos + cursor + totals + hasMore + bulk delete
    images.ts              # upload multipart para API externa (conta local)
  auth/
    AuthProvider.tsx       # sessão: bootstrap, warmup, login, logout, refreshMe, busy overlay
    types.ts               # type User (id/email/googleSub/name/picture)
  storage/
    token.ts               # localStorage (web) / SecureStore (mobile)
  ui/
    theme.ts               # tokens de cor (tema claro)
    components.tsx         # Screen/Card/Header/Botões/Pill + DrawerMenuButton
    confirm.ts             # confirmAction (web confirm + Alert no mobile)
    KeyboardScreen.tsx     # wrapper para evitar teclado cobrindo inputs (scroll + refresh)
  utils/
    events.ts              # TinyEmitter (AUTH_EXPIRED_EVENT)
    format.ts              # formatDateSafe, etc.
```

---

## Requisitos

- Node.js (recomendado LTS)
- Expo CLI (via `npx expo ...`)
- Para Android nativo:
  - **Dev Client / APK** (login nativo não funciona no Expo Go)
  - Android Studio / SDK instalado
  - Dispositivo físico ou emulador com **Google Play Services** (emulador com Play Store é melhor)

---

## Configuração (.env)

Crie/edite o arquivo `.env` na raiz:

```env
EXPO_PUBLIC_API_BASE_URL=https://todo-nest-api-p6b1.onrender.com

# Google
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=SEU_WEB_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=SEU_ANDROID_CLIENT_ID.apps.googleusercontent.com

# Upload de imagens (para conta local trocar foto)
EXPO_PUBLIC_IMAGES_API_BASE_URL=https://armazenamentoarquivos.com.br/api-images
```

### Observações importantes sobre Client IDs

- **Web (GIS)** usa `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- **Android nativo** (`GoogleSignin.configure`) normalmente usa **o WEB client id** para obter `idToken` (comportamento esperado).
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` é útil para organização e cenários específicos (package/SHA‑1, redirects, etc.).

---

## app.json (Android) – teclado e ícones

Garanta no `app.json`:

- `android.softwareKeyboardLayoutMode = "resize"`
- `android.adaptiveIcon.foregroundImage = "./assets/adaptive-icon.png"`

Exemplo:

```json
{
  "expo": {
    "android": {
      "package": "com.vinfasolin.todomobilewebpremium",
      "softwareKeyboardLayoutMode": "resize",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0B0F17"
      }
    }
  }
}
```

> Se rodar `npx expo prebuild --clean` e reclamar do `adaptive-icon.png`, confirme que existe em `./assets/adaptive-icon.png`.

---

## Rodando o app

### Web

```bash
npx expo start --web
```

### Android (Dev Client)

> **Importante:** login nativo não funciona no Expo Go.

```bash
npx expo run:android
```

Se precisar limpar cache:

```bash
npx expo start -c
```

---

## Fluxo ponta a ponta (login + API)

1) Abra o app  
2) O app decide:
   - se há sessão válida → vai para `/(drawer)`
   - senão → vai para `/login`
3) Faça login:
   - Web: botão Google (GIS)
   - Android: Google nativo (Play Services)
   - Opcional: Email/senha (login local)
4) O app chama:
   - `POST /auth/google` com `{ idToken }` **ou**
   - `POST /auth/login` com `{ email, password }`
5) A API retorna:
   - `token` (JWT) + `user`
6) O app salva o JWT e passa a chamar:
   - `GET /me`
   - `GET /todos`, `POST /todos`, `PATCH /todos/:id`, `DELETE /todos/:id`

---

## Token expirado (logout automático)

- `src/api/client.ts` detecta `401/403` e emite `AUTH_EXPIRED_EVENT`.
- `src/auth/AuthProvider.tsx` escuta o evento e faz `logout()` limpando o token.
- As telas protegem rotas: sem `user` → redirect `/login`.

---

## Warmup do backend (Render)

O `AuthProvider` faz um “warmup” chamando `GET /` (ou endpoint leve) com timeout maior.  
Isso reduz falhas quando o Render “hiberna”.

---

## Perfil (alinhado com backend: Google vs Local)

### Regras

- **Conta Google** (`user.googleSub` presente):
  - **não** mostra seção de **trocar foto**
  - **não** mostra **alterar e-mail**
  - **não** mostra **alterar senha do app**
  - pode **editar nome**
  - `DELETE /me` funciona **sem senha**

- **Conta local** (`user.googleSub` ausente):
  - pode trocar **foto** (upload API externa + `PATCH /me { picture }`)
  - pode trocar **email** (retorna token novo)
  - pode trocar **senha**
  - `DELETE /me` exige senha (enviada via querystring no app, por compat)

### `PATCH /me/email` (token novo)

No backend atual, o DTO canônico é:

```json
{ "newEmail": "novo@exemplo.com", "password": "123456" }
```

No app, foi adotada compatibilidade para aceitar variações:

- o client manda `{ email, newEmail: email, password }`
- assim funciona se o backend esperar `newEmail` **ou** `email`

> Se você preferir “purista”, pode padronizar o backend para aceitar `email` e `newEmail` (alias), mas o app já está robusto para ambos.

---

## Lazy loading (cursor) + filtros/busca server-side + totals

O app usa:

- `listTodosServer({ take, cursor, filter/status, q/search })`

Parâmetros (client):

- `take`: tamanho da página (ex.: `5`)
- `cursor`: cursor retornado pelo backend (string) ou `null`
- `filter` (canônico no backend): `"all" | "open" | "done"`
  - client aceita `status` como alias, mas envia `filter`
- `q` (canônico no backend): string de busca (title/description)
  - client aceita `search` como alias, mas envia `q`
- compat: `done=true|false` (se informado, pode ter prioridade no backend)

Backend esperado (canônico):

- `GET /todos?take=5&cursor=<cursor>&filter=open|done&q=<busca>`

Resposta (backend novo):

```json
{
  "ok": true,
  "items": [],
  "nextCursor": "2026-02-25T12:34:56.789Z|uuid",
  "hasMore": true,
  "totalAll": 200,
  "totalFiltered": 13,
  "total": 13
}
```

Compatibilidade (backends antigos):
- Pode retornar `items` e `nextCursor` em wrappers (`data`, `result`, etc.).
- Pode não retornar `hasMore`: o client infere `hasMore = !!nextCursor`.
- Pode não retornar totals: o app mostra apenas “Carregados X …” sem o “de Y”.

### Carregar 5 em 5

No `app/(drawer)/index.tsx`, ajuste:

```ts
const PAGE_SIZE = 5;
```

### “Carregados X de Y”

Na tela principal, o total exibido segue esta lógica:

- **Sem filtro/busca**: usa `totalAll`
- **Com filtro/busca**: usa `totalFiltered` (ou `total` como compat)

---

## Swipe (concluir/reabrir e excluir)

Na lista (`app/(drawer)/index.tsx`):

- Swipe **concluir/reabrir**: `PATCH /todos/:id { done }`
- Swipe **excluir**: `DELETE /todos/:id` com confirmação

> A exclusão sempre pede confirmação via `confirmAction()`.

---

## Modais (detalhes + criar/editar)

A tela de To‑Dos usa modais:

- **Detalhes**: mostra título/descrição/status/data; permite concluir/reabrir, editar e excluir
- **Criar/Editar**: formulário com título e descrição

Observações de UX implementadas:
- Paginação (`onEndReached`) é bloqueada enquanto qualquer modal estiver aberto.
- Busca tem debounce (ex.: 350ms) antes de disparar consulta no servidor.

---

## Bulk delete (excluir em massa)

O app chama:

- `DELETE /todos/bulk?filter=open|done&q=...`

E espera:

```json
{ "ok": true, "deleted": 123 }
```

> A função `deleteTodosBulk()` respeita filtro/busca do momento (`filter` + `q`).

### Excluir tudo (sem filtro)

- `DELETE /todos` → `{ ok: true, deleted: number }`

O client já possui `deleteTodosAll()` para esse caso.

---

## Teclado cobrindo inputs (Android)

Checklist que resolve:

1) `app.json` com `android.softwareKeyboardLayoutMode="resize"`
2) Em telas com formulários (login/cadastro/modais):
   - `ScrollView` com `keyboardShouldPersistTaps="handled"`
   - wrapper `KeyboardScreen` quando necessário

> Observação: em `Modal transparent`, o teclado pode não empurrar o layout.  
> Em casos chatos, use `KeyboardAvoidingView` dentro do conteúdo do modal.

---

## Navegação (Drawer)

- Root: `app/_layout.tsx` (Stack + AuthProvider + GestureHandlerRootView)
- Área logada: `app/(drawer)/_layout.tsx` (Drawer)
- Detalhe por ID:
  - arquivo: `app/(drawer)/todo/[id].tsx`
  - navegação recomendada:

```ts
router.push({ pathname: "/(drawer)/todo/[id]", params: { id } });
```

- Tela `todo/[id]` fica **oculta** no menu (Drawer).

---

## Build Android

### Opção A — EAS (mais simples e confiável)

```bash
npm i -g eas-cli
eas login
eas build -p android --profile preview
```

- `preview` normalmente gera **APK** (instalável direto).
- `production` costuma gerar **AAB** (Play Store), mas é configurável.

### Opção B — Windows local: Expo prebuild + Gradle (controle total)

1) Gerar nativo (android/):

```bash
npx expo prebuild --clean
```

2) Build do APK (Windows):

```bash
cd android
gradlew.bat clean
gradlew.bat assembleRelease
```

APK sai em:

```text
android\app\build\outputs\apk\release\app-release.apk
```

---

## Smoke test rápido (produção)

### 1) Conta local (email/senha)
1. Login local
2. `Perfil → Alterar e-mail`
3. Confirmar que volta **token novo**
4. Confirmar que o app continua logado e `GET /me` mostra o novo email

### 2) Conta Google
1. Login Google
2. Confirmar que **não aparecem**: “Trocar foto”, “Alterar e-mail”, “Alterar senha do app”
3. Confirmar que o app continua funcionando e sincroniza To‑Dos normalmente

---

## Troubleshooting

### 1) Build Windows: `.gradle\buildOutputCleanup.lock` / EBUSY (arquivo travado)
Soluções típicas:

- Fechar Android Studio / emulador
- Parar gradle:

```bash
cd android
gradlew.bat --stop
```

- Matar processos `java.exe`, `gradle`, `adb` pelo Gerenciador de Tarefas
- Apagar `android\.gradle\buildOutputCleanup\buildOutputCleanup.lock` (ou a pasta `android\.gradle`)
- Tentar novamente:

```bash
gradlew.bat clean
gradlew.bat assembleRelease
```

### 2) Build lento (30+ min)
- Rodar com logs:

```bash
gradlew.bat assembleRelease --info --stacktrace
```

- Tentar sem daemon:

```bash
gradlew.bat assembleRelease --no-daemon --stacktrace
```

- Adicionar exclusões no Windows Defender/antivírus:
  - pasta do projeto (incluindo `android/` e `node_modules/`)
  - `C:\Users\<seu-usuario>\.gradle`
  - (opcional) Android SDK

### 3) App instala mas não abre / crash com swipe/drawer
Checklist:

- `import "react-native-gesture-handler";`
- root envolvido por `GestureHandlerRootView` (flex: 1)
- pasta do drawer é `app/(drawer)` (com parênteses)

### 4) Unmatched route (“todo-premium:///”)
- Confirme `app/(drawer)/...` existe
- Confirme `app/index.tsx` redireciona corretamente para `/(drawer)` ou `/login`
- (Opcional) `app/+not-found.tsx` para 404 amigável

### 5) Web: botão do Google não aparece
- Confirme `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- Verifique erros no console do navegador

### 6) Android: “DEVELOPER_ERROR” no login
- SHA‑1 do app instalado não bate com o OAuth Android no Google Cloud
- Confirme `package name` + SHA‑1 do keystore usado no build instalado

### 7) APK não fala com a API
- Em device instalado, **não use** `localhost`
- Ajuste `EXPO_PUBLIC_API_BASE_URL` para URL do Render

---

## Licença

Escolha a licença (MIT, Apache‑2.0, etc.) e adicione um arquivo `LICENSE` se desejar.
