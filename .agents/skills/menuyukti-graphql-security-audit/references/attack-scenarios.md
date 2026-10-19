# Attack scenarios (GraphQL security)

**Version:** `1.0.0`

Evaluate each scenario in FULL audits. For FOCUSED, evaluate scenarios that map to the chosen scopes. Record outcome in findings or the executive summary scenario table.

For each scenario: **threat**, **expected control**, **observed evidence**, **status**, **severity if open**.

Do not ship runnable exploit PoCs. High-level reproduction steps for engineers are OK when needed for remediation clarity.

---

### S01 — Spoofed identity header

**Threat:** Caller sets `X-User-Id` to an arbitrary Clerk/user id.  
**Expected:** Without valid `X-Internal-Api-Key` (when configured), request rejected; GraphQL must not treat browser-supplied user id as authoritative outside the BFF.  
**Inspect:** `InternalApiKeyMiddleware`, deploy docs, local default when key unset.  
**Scopes:** `identity`, `trust-boundary`

### S02 — Cross-tenant location IDOR

**Threat:** Authenticated owner of location 5 queries/mutates with `locationId=6` (or other sequential ids).  
**Expected:** Deny — empty query result or mutation `PermissionError` / `ValueError`; no data leak.  
**Inspect:** `is_location_owner` / `require_location_owner` on sampled fields; negative tests.  
**Scopes:** `authorization`

### S03 — Child resource IDOR (analytics run, node, order)

**Threat:** Pass a foreign analytics run id, node id, POS order id, or CRM customer id while authenticated as another user.  
**Expected:** Ownership check on the parent resource before return/mutate.  
**Inspect:** `get_analytics_run_if_owner`, POS/CRM query modules.  
**Scopes:** `authorization`

### S04 — Missing mutation guard

**Threat:** New or legacy mutation resolves `user_id` but never calls `require_*`.  
**Expected:** Every mutating location/workspace field follows conventions in `python-graphql-conventions.mdc`.  
**Inspect:** Mutations lacking `require_location_owner` / workspace helpers; especially deletes and money.  
**Scopes:** `authorization`

### S05 — Nested resolver widening

**Threat:** Root field authorizes, but a nested type field loads related entities by raw id without re-check.  
**Expected:** Nested loaders inherit session filters or re-validate ownership.  
**Inspect:** Custom field resolvers on types that accept ids.  
**Scopes:** `authorization`

### S06 — Complexity / alias amplification

**Threat:** Deeply nested or heavily aliased query causes expensive DB work.  
**Expected:** Depth, complexity, alias, token, and field-selection limits reject abusive documents.  
**Inspect:** `schema/__init__.py`, `limits.py`, complexity estimator behavior on lists.  
**Scopes:** `abuse-controls`

### S07 — Error / introspection disclosure

**Threat:** Errors or introspection reveal schema internals, SQL, or stack frames to untrusted clients.  
**Expected:** Production-safe error shaping; introspection locked down if exposed beyond trusted network.  
**Inspect:** `process_result`, deploy/gateway config.  
**Scopes:** `disclosure`

### S08 — Node / JSON mass assignment

**Threat:** Client sets privileged keys inside polymorphic `node.data` or similar JSON blobs.  
**Expected:** Handlers validate and strip disallowed keys (`node_handlers/`).  
**Inspect:** `validate_create` / update paths; GenericHandler fallback risk.  
**Scopes:** `injection`

### S09 — BFF or agents user-id confusion

**Threat:** Attacker influences web API route or agent tool args so GraphQL is called as another user.  
**Expected:** User id always from Clerk/session (web) or explicit trusted agent context — never from untrusted body fields named `userId` without verification.  
**Inspect:** `apps/web/lib/graphql/client.ts`, representative `app/api` routes, agents GraphQL helper.  
**Scopes:** `trust-boundary`

### S10 — CRM / public path escape

**Threat:** Public CRM or menu path skips internal key and reaches operator-only data or mutations.  
**Expected:** `/crm/v1/` (and similar) strictly scoped; no shared unsafe resolvers.  
**Inspect:** CRM route handlers vs GraphQL operator schema.  
**Scopes:** `identity`, `authorization`, `trust-boundary`
