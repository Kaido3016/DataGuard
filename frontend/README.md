# DataGuard Québec — web console

Canonical frontend (React 19 + strict TypeScript + Vite). Architecture, endpoints used, authentication, serving/CSP
model, CI, security and demo-data policy: [`docs/FRONTEND.md`](../docs/FRONTEND.md). `dataguard/frontend/` is the
deprecated prototype still mounted by the API.

```bash
npm install && npm run dev     # http://localhost:3000 (proxy -> http://127.0.0.1:8000)
npm run typecheck && npm run lint && npm test && npm run build
```
