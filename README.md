# todo-mobile-web-premium (Expo Router) — Mobile + Web

App premium (React Native + Expo) consumindo sua API NestJS:
- Login Google (ID Token) -> POST /auth/google -> JWT da API (persistido)
- /me e CRUD /todos
- UI premium: gradiente, cards, busca, filtros, pull-to-refresh, swipe actions, modal criar/editar

## Requisitos
- Node.js 18+ (recomendado 20+)
- Expo CLI via `npx`
- No Android: Expo Go instalado no celular

## 1) Instalar dependências
```bash
npm install
```

## 2) Variáveis de ambiente
Já vem pronto em `.env` com seus Client IDs e API base.

## 3) Rodar
### Mobile (Expo Go)
```bash
npx expo start -c --tunnel
```
Escaneie o QR Code com o Expo Go (Android).

### Web
```bash
npx expo start -c --web
```

## 4) Login Android com 4 Client IDs
Na tela de login (Android), você pode selecionar **qual Client ID Android** usar (A/B/C/D) e testar cada um.
- No Web, usa o Web Client ID automaticamente.

## 5) Observações de Google Cloud
- Para Web: autorize a origem que você usar (ex.: `http://localhost:8081`) no seu OAuth client do tipo Web.
- Para Android: cada Client ID deve estar corretamente configurado no Google Cloud (SHA-1 quando aplicável).

## API base
- https://todo-nest-api-p6b1.onrender.com

## Endpoints
- POST /auth/google { idToken }
- GET /me (Bearer JWT)
- GET/POST/PATCH/DELETE /todos (Bearer JWT)
