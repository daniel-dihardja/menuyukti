# CRM — Passwordless Registrations Phases Plan

Implementation plan for restaurant CRM in Menuyukti: marketing programs (cashback, etc.) with customers, starting with **Registrations** and **passwordless device enrollment**.

## Architecture split

| Actor            | Auth                                        | Surface                     |
| ---------------- | ------------------------------------------- | --------------------------- |
| Restaurant staff | Clerk (existing)                            | `apps/web` CRM sidenav      |
| End customer     | Device keys + short JWT                     | New React Native (Expo) app |
| Data / APIs      | GraphQL (+ optional REST for mobile crypto) | `apps/graphql`              |

**Principles**

- No passwords for customers; phone numbers are identifiers only (not credentials).
- Customer ID = immutable UUID; auth is per **device**, not per customer.
- Private keys never leave the device; backend stores public keys only.
- Enrollment tokens: single-use, short TTL (2–5 min), bound to a **CRM app** (workspace-scoped loyalty tenant).
- Access JWT ~15 min; refresh token ~30 days (store hashes server-side).
- Persistence stays in **`apps/graphql`** (Python / Postgres). Prefer FastAPI routes on that app for challenge/response rather than a separate Node service unless hard isolation is required later.
- Staff continue to use Clerk; customer JWT auth is a separate trust domain.

---

## Phase 0 — Product shell (CRM nav + Apps + Registrations)

Give the feature a home before crypto work.

1. **Routes** (`apps/web/lib/routes.ts`)
   - Add `/crm`, `/crm/apps`, and `/crm/registrations` to `PROTECTED_APP_SHELL_PREFIXES`
   - Add `routes.crm` / `routes.crmApps` / `routes.crmRegistrations` / `crmRegistrationsWithApp`
2. **Middleware** — keep `middleware.ts` matchers aligned with those prefixes
3. **Feature flags** (`apps/web/config/feature-flags.json`)
   - `nav.crm`, `routes["/crm"]` (enable when ready)
4. **Sidenav** (`apps/web/components/nav-main.tsx`)
   - Collapsible **CRM** with children **Apps** → `/crm/apps` and **Registrations** → `/crm/registrations`
   - Use existing `children` / collapsible pattern; place in commerce or a dedicated CRM group
5. **i18n** (`apps/web/messages/en.json`)
   - Sidebar + page copy under a `crm` namespace (no hardcoded strings)
6. **Domain shell**
   - `crm_app` table + GraphQL `crmApps` / `createCrmApp` (workspace-scoped; public `appId` UUID)
7. **Pages**
   - `app/(protected)/crm/page.tsx` — redirect to registrations (or future programs hub)
   - `app/(protected)/crm/apps/page.tsx` — list + create CRM apps
   - `app/(protected)/crm/registrations/page.tsx` — empty list + enrollment QR placeholder
   - Scope registrations by **app** (`?appId=`), not location

**Done when:** staff see CRM → Apps / Registrations; can create an app; registrations page is app-scoped.

---

## Phase 1 — Domain model (GraphQL / Postgres)

Add Alembic models in `apps/graphql` (only persistence layer). `crm_app` already exists from Phase 0.

| Table                  | Purpose                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `crm_customer`         | UUID id, **crm_app** FK, `phone_e164` (unique per app), optional display name, timestamps, soft-delete |
| `crm_device`           | customer FK, public key, platform, label, refresh token hash, last seen, revoked_at                    |
| `crm_enrollment_token` | token hash, **crm_app** FK, created_by Clerk user, expires_at, used_at, optional customer bind         |
| `crm_auth_challenge`   | device (or pending), nonce, expires_at, consumed_at                                                    |
| `crm_audit_event`      | enrollment / auth / revoke / rate-limit audit trail                                                    |

Rules: hash enrollment and refresh tokens; store public keys only; index app+phone, token hash, device→customer. Optional later: nullable `location_id` on enrollment/audit as **where they enrolled** metadata only — customers remain app-owned.

Wire ORM under `data_sources/models/`, register exports, migrate with Alembic.

**Done when:** schema migrated; public API not required yet (or read-only stub).

---

## Phase 2 — Staff GraphQL: list + enroll QR

Clerk-authenticated GraphQL (`user_id_from_info`, workspace ownership via app).

**Queries**

- `crmCustomers(appId, search?, cursor?)` — Registrations table
- `crmCustomer(id)` — detail (devices, last seen, revoked)

**Mutations**

- `createCrmEnrollmentToken(appId)` — returns raw token **once** + `expiresAt` (+ optional deep-link URL)
- `revokeCrmDevice(deviceId)`
- Later: update customer, unlink phone, etc.

**Web**

- Registrations table: masked phone, enrolled at, device count, last seen, status
- “Enroll customer” → mint token → QR (e.g. `menuyukti://enroll?token=…&app=<appId UUID>` or HTTPS universal link)
- UI countdown for TTL; regenerate when expired

**Security:** owner/member only; rate-limit token creation; audit create/use/revoke.

**Done when:** staff can list customers and mint a short-lived enrollment QR.

---

## Phase 3 — Customer auth API (passwordless)

Separate from Clerk. Prefer REST on `apps/graphql` (or a thin sibling) — GraphQL is awkward for challenge/response.

| Step      | Endpoint                      | Behavior                                                                                             |
| --------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Enroll    | `POST /crm/v1/enroll`         | Validate token; upsert customer by phone; create device + public key; issue refresh; mark token used |
| Challenge | `POST /crm/v1/auth/challenge` | `deviceId` → random nonce, short TTL                                                                 |
| Verify    | `POST /crm/v1/auth/verify`    | Verify signature; issue access JWT (~15m)                                                            |
| Refresh   | `POST /crm/v1/auth/refresh`   | Refresh hash → new access JWT                                                                        |
| Optional  | `POST /crm/v1/auth/revoke`    | Self-revoke current device                                                                           |

Crypto: Ed25519 preferred (or P-256 if Expo constraints require it). JWT claims: `sub` = customer UUID, `did` = device id, tenant/`app_id` (public UUID), `exp`. Rate-limit all auth endpoints.

**Done when:** enroll with a staff-minted token and obtain access via signed challenge (e.g. curl/integration tests).

---

## Phase 4 — Mobile app (Expo)

1. Generate keypair; store private key in Keychain / Keystore / Secure Enclave
2. Scan QR → enroll
3. Persist `deviceId` + refresh token securely
4. API client: Bearer access JWT; on 401 → refresh → else challenge + sign
5. Minimal “Registered” confirmation (programs later)

**Done when:** scan QR in restaurant → customer appears on Registrations.

---

## Phase 5 — Harden, then programs

- Rate limits, lockouts, richer audit UI
- Device list + revoke on customer detail in web CRM
- Phone change as identity update, not re-auth
- Then programs: `crm_program`, membership, ledger — keyed by `crm_customer.id`, authorized by device JWT (cashback, stamps, etc.)

---

## Build checklist

1. Nav + Apps + empty Registrations page (Phase 0) — app-scoped
2. DB models + migration for customers/devices/tokens (Phase 1)
3. `crmCustomers` query + table UI (Phase 2a)
4. `createCrmEnrollmentToken` + QR dialog (Phase 2b)
5. Enroll REST + tests (Phase 3a)
6. Challenge / verify / refresh + revoke (Phase 3b)
7. Expo enroll + auth loop (Phase 4)
8. E2E: QR → mobile → row in Registrations
9. Programs / cashback (Phase 5)

---

## Repo conventions

- **Web:** RSC + `graphqlQuery` for staff data; next-intl; no direct DB
- **GraphQL:** mixin queries/mutations, ownership checks, tests under `apps/graphql/tests/`
- **Customer JWT:** not Clerk; validate only on CRM customer routes
- Do not log private keys or raw refresh/enrollment tokens in GraphQL or admin list fields

## Defer

- Cashback / points ledger until registrations + auth are solid
- Cross-tenant identity (start **app**- or workspace-scoped)
- App ↔ Location many-to-many; optional enrollment `location_id` metadata only
- A separate Node/Express auth stack — same security model, but Python + existing Postgres fits this monorepo better
