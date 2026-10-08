# DataGuard web console

## 1. Which frontend is canonical

| Path | Status | Role |
|---|---|---|
| **`frontend/`** | **Canonical.** All new UI work happens here. | React 19 + strict TypeScript + Vite single-page app. |
| `dataguard/frontend/` | **Deprecated, retained temporarily.** Do not extend. | 17 KB static prototype (`index.html`, `app.js`, `styles.css`) from Phase 11. |

**Why the legacy folder still exists (verified by search, not assumed):**

* `dataguard/api/app.py` (`create_app`) **unconditionally** does
  `app.mount("/frontend", StaticFiles(directory=<dataguard/frontend>))` and serves `index.html` at `GET /`.
  `StaticFiles` raises at startup if the directory is missing, so deleting it breaks the whole API, not only a page.
* Three backend tests assert it: `tests/api/test_frontend.py` (2 tests) and `tests/api/test_accessibility.py`
  (reads `dataguard/frontend/index.html`).
* The Dockerfile copies `dataguard/` (so the prototype ships in the API image) and does **not** copy `frontend/`.
* `docs/PHASE_11_ENTERPRISE_FRONTEND.md` describes it (now marked superseded).

**It is already non-functional under the shipped security configuration.** The API sends
`Content-Security-Policy: default-src 'none'` on every response (including `/` and `/frontend/*`) and the production
settings validator refuses to disable security headers. Loading the prototype in Chromium with that header shows the
browser refusing both `styles.css` and `app.js` (2 CSP violations). It only works with security headers off, i.e. not in
production.

**Retirement checklist** (a backend change, deliberately not made here):

1. Remove the `/frontend` mount and the `GET /` handler from `create_app` (or replace `/` with a redirect/landing page).
2. Delete or rewrite `test_frontend.py` and the frontend case in `test_accessibility.py`.
3. Delete `dataguard/frontend/` and update/replace `docs/PHASE_11_ENTERPRISE_FRONTEND.md`.
4. Re-run the backend test suite.

## 2. Local development

```bash
cd frontend
npm install        # first run: commit the generated package-lock.json, then use `npm ci`
npm run dev        # http://localhost:3000, proxies /api and /health to http://127.0.0.1:8000
npm run typecheck && npm run lint && npm test && npm run build
```

Backend for local sign-in: `DATAGUARD_ENVIRONMENT=development uvicorn dataguard.main:app`. `main:app` mounts the auth and
audit routers; `create_app()` alone does not (those routes then 404).

Build-time options (`frontend/.env.example`, all public): `VITE_API_BASE_URL`, `VITE_REQUEST_TIMEOUT_MS`,
`VITE_ENABLE_DEV_LOGIN`, `VITE_ENABLE_DEMO_MODE` (default `false`).

### Verification status of this work

The authoring environment had **no npm registry access**, so `npm install`, `npm run typecheck`, `npm run lint`,
`npm test` and `npm run build` have **not** been executed with the real toolchain. What was run instead:

* strict `tsc` against a local approximation of `@types/react` (logic and API layers fully typed; JSX prop types lenient);
* the 72 unit tests on Node through a Vitest-compatible shim;
* an esbuild bundle (not `vite build`) exercised in Chromium: 37 end-to-end checks against a mock of the API contract,
  31 demo/responsive/accessibility checks, 5 production-responsive checks, and a strict-CSP run with zero violations.

Treat the first green `frontend.yml` run (section 7) as the real verification. ESLint in particular has never run.

## 3. Backend endpoints used (and nothing else)

| UI feature | Call | Permission (enforced by backend) |
|---|---|---|
| Dev sign-in | `POST /api/v1/auth/login` | none (development only; 404 elsewhere) |
| Discovery (text) | `POST /api/v1/analyze` | `analysis:write` |
| Discovery (document) | `POST /api/v1/analyze-document` (+ `GET /api/v1/analyses/{id}` for extraction warnings) | `analysis:write` / `analysis:read` |
| Reload a finding set | `GET /api/v1/analyses/{id}` | `analysis:read` |
| PIA create / status change | `POST /api/v1/pias`, `POST /api/v1/pias/{id}/transition` | `pia:manage` |
| Remediation create | `POST /api/v1/remediations` | `analysis:write` |
| Audit integrity | `GET /api/v1/audit/integrity` | `audit:read` |
| API status | `GET /health/ready` | none |

`src/api/endpoints.test.ts` pins this exact set, so an invented endpoint fails CI. There is no `/me`, tenant or settings
endpoint: tenant and role context comes from the token claims.

## 4. Backend limitations (UI is isolated and labelled accordingly)

* No list endpoints for analyses/findings, PIAs, remediations or audit events, and no dashboard aggregates. Pages show
  what this browser session created or re-fetched by id and say so. To integrate later, add list calls in `src/api/*` and
  feed `WorkspaceProvider` (`src/state/workspace.tsx`); the record types already match.
* Remediation: creation only (`OPEN`). `RemediationTransitionRequest` exists but no route is exposed, so the
  Assigned → In progress → Resolved → Verified track is shown as *not available* with no actions. No evidence, due date or
  PIA link fields exist.
* PIA: no get/list, no evidence attachment; `risks` is free-form (UI uses `{title, level, description, mitigation}`).
* Risk is scored per analysis, not per detection; finding severity is inherited and labelled as such.
* `governance.findings[].framework` carries the rule *version*; the UI reads the framework from `governance.framework`.
  Engine explanations/recommendations are English-only.
* Stored analyses return no timestamp or submitted text; reloaded findings show "not provided".
* No refresh-token endpoint: sessions end when the access token expires (banner 2 minutes before).

## 5. Production authentication

What the backend does today (`dataguard/security/auth.py`, `core/config.py`):

* **Resource server only.** It validates a bearer JWT; it does not run an OIDC login flow, and no OIDC *provider
  integration* (code flow, PKCE, refresh) exists in the backend or in this frontend.
* **Production** (`DATAGUARD_ENVIRONMENT=production`) requires `RS256` or `ES256`, `oidc_issuer_url`, `oidc_jwks_url`
  (both HTTPS), `jwt_issuer` and `jwt_audience`. The signing key is fetched from the JWKS URL; HMAC tokens and local
  issuance are refused.
* **Required claims:** `sub` (string), `roles` (list), `iat`, `exp`, and the tenant as `org` **or** `org_id` (string).
  `iss`/`aud` are checked when configured. Token size limit 16 KiB.
* **Roles** must be exactly `viewer`, `analyst`, `privacy_officer`, `security_admin`, `org_admin`. An unknown role value
  rejects the *whole token* (401), so the identity provider must map groups to exactly these values.
* **Tenant/workspace context** is the `org`/`org_id` claim → `TenantContext` → row-level security. The frontend never
  sends a tenant id; it decodes the claim only for display and to key its in-memory workspace.
* `POST /api/v1/auth/login` and `/register` exist only when `environment == "development"` (404 otherwise).

What the frontend does: accepts a token pasted at the sign-in screen (or issued by the dev login) and holds it in memory
only. It is never written to `localStorage`/`sessionStorage`/cookies/URL and never logged; a reload signs the user out.
Set `VITE_ENABLE_DEV_LOGIN=false` for production builds.

**Deployment work (not implemented, intentionally):** a real browser login flow (authorization-code + PKCE against the
organisation's IdP) that hands the access token to the in-memory store, plus IdP group→role mapping. Keep tokens out of
persistent storage when adding it (keep them in memory; use a backend-for-frontend if silent renewal is required).

## 6. Serving model and CSP

Backend facts: every response carries `default-src 'none'; frame-ancestors 'none'` (mandatory in production); CORS allows
the configured `DATAGUARD_ALLOWED_ORIGINS` (HTTPS only in production) with methods `GET POST PUT PATCH DELETE`, headers
`Authorization`, `Content-Type`, `X-Request-ID`, `allow_credentials=False`; `TrustedHostMiddleware` limits hosts.

| | A. Same origin (FastAPI serves the SPA) | B. Separate origin (static host/CDN + API) |
|---|---|---|
| Backend change | Required: path-scoped CSP in `SecurityHeadersMiddleware`, static mount of `frontend/dist`, retire `/` and `/frontend`, Docker multi-stage Node build | **None** |
| CSP | Must relax `default-src 'none'` for the static path | API keeps `default-src 'none'`; SPA host sets its own strict CSP |
| CORS | Not needed | Needed (already supported and validated) |
| Blast radius | Security middleware edit on the API's most sensitive path | Static content isolated from the API |
| Release coupling | SPA ships with the API image | Independent deploys |

**Recommendation: Option B.** It needs no change to the DataGuard security architecture, never weakens the API's CSP, and
matches how the repository is already built (Dockerfile does not include `frontend/`; CORS/trusted-host settings exist).

Setup for B: serve `frontend/dist` over HTTPS at e.g. `https://app.example`; build with
`VITE_API_BASE_URL=https://api.example`; set `DATAGUARD_ALLOWED_ORIGINS=["https://app.example"]` on the API; add the API
host to `DATAGUARD_ALLOWED_HOSTS`; send on the static host:

```
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';
  connect-src 'self' https://api.example; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

This policy contains no `unsafe-inline` or `unsafe-eval`. It was tested by serving the built SPA under it (with
`connect-src 'self'`) and running login, analysis, dialogs and every page in Chromium: zero violations. The bundle has no
inline scripts or styles and no external fonts or CDNs. SPA routing is hash-based, so the static host needs no rewrite
rules. Cross-origin calls to the real API with these CORS settings were not exercised end to end here. Note the API does
not expose `X-Request-ID` to cross-origin scripts, so the UI shows its own generated request id in that setup.

## 7. CI

`.github/workflows/frontend.yml` runs install, `typecheck`, `lint`, `test`, `build`, and fails if the production output
contains demo code/data. It is a **separate workflow** because `.github/workflows/quality.yml` is **already invalid YAML in
the original repository** (line ~128, the long `curl` line in the Docker integration job; strict YAML parsers reject it).
That defect is unrelated to the frontend and was left untouched (`quality.yml` is byte-identical to the original); until it
is fixed, GitHub is expected to reject that workflow and its backend jobs will not run. Confirm in the Actions tab.
After the first `npm install`, commit `frontend/package-lock.json`, switch the install step to `npm ci` and enable
`cache: npm`.

## 8. Security model

Token only in a module closure; 401 ends the session; 403 handled everywhere; role checks are UX hints mirrored from
`policy.py`, never authoritative; JWT claims decoded for display only (signature verified by the server); workspace data
is keyed by `org:subject` and never shown to another owner; raw submitted text is never stored (a locally redacted
`[TYPE]` preview is kept in memory); only opaque analysis ids are kept in `sessionStorage` per organisation and cleared on
explicit sign-out; language preference is the only `localStorage` key; no `console` output; no `innerHTML`; 5xx detail
is never displayed.

## 9. Demo data

`src/demo/` is synthetic. Enabling it needs **both** `VITE_ENABLE_DEMO_MODE=true` at build time and a switch in Settings.
The import sits behind a literal build-time comparison, so a production build contains no demo code or data (verified by
inspecting the output; CI enforces it). While active: permanent banner on every page, `DEMO` tags, all write actions and
audit verification disabled, discarded on sign-out.
