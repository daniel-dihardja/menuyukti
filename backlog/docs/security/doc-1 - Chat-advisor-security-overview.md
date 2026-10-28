---
id: doc-1
title: Chat advisor security overview
type: guide
created_date: '2026-10-28T08:49:00Z'
updated_date: '2026-10-28T09:04:00Z'
tags:
  - security
  - chat
  - advisor
  - agents
---

# Chat advisor security overview

**Audience:** engineering  
**Scope:** `/advisor` chat (and related BFF → agents → GraphQL path), including ChatKit, inventar, and IG Studio chat modes that share `POST /api/chat` / agents `/chat`.  
**Kind:** engineering security assessment vs industry LLM-agent practice — not a penetration test or legal opinion.  
**Date:** 2026-10-28 (guardrails inventory added same day)  
**Related:** GraphQL trust boundary (`X-User-Id` + `X-Internal-Api-Key`); skill `menuyukti-graphql-security-audit` for a full API authz audit.

---

## Executive summary

The advisor’s **application identity plumbing is solid** for a BFF + shared-secret agent: Clerk owns the user id, agents never trust the browser for identity, thread checkpoints are user-prefixed, and tools take `user_id` / `location_id` from injected run config (not model-chosen args).

Several **concrete guardrails are already implemented in code** (auth middleware, Zod/Pydantic validation, injected tool args, mode-scoped tools, confirmation gate, allowlists, size/recursion limits). See [Existing guardrails (implemented)](#existing-guardrails-implemented).

**Prompt-injection and LLM-abuse hardening are still largely missing** as a dedicated layer. You rely on those structural controls and GraphQL ownership checks, not on treating the model (or retrieved content) as hostile. That matches many early production agents — not current industry best practice for tool-using agents (OWASP LLM Top 10, especially LLM01 Prompt Injection).

| Area                                 | Posture            |
| ------------------------------------ | ------------------ |
| Session → user id                    | Strong             |
| Thread isolation                     | Strong             |
| Tool-arg identity spoofing           | Strong             |
| Mode tool scoping                    | Good               |
| GraphQL-backed authz                 | Dependent (verify) |
| Shared-secret service trust          | Conditional        |
| Prompt injection                     | Weak               |
| Abuse / spend limits                 | Weak               |
| Side-effect HITL                     | Partial            |
| Indirect injection (web / RAG / viz) | Weak               |

---

## Request path (trust boundary)

```text
Browser (Clerk session)
  → Next.js BFF  /api/chat | /api/chatkit | /api/chat/history
  → apps/agents  /chat | /chatkit   (X-Menuyukti-User-Id + X-Internal-Api-Key)
  → tools (location, charts, media, knowledge, Tavily, image generate, …)
  → GraphQL (X-User-Id + same internal key)
```

**Key code:**

- Web BFF: `apps/web/app/api/chat/route.ts`, `apps/web/lib/agents/headers.ts`, `apps/web/app/api/chat/schema.ts`
- Agents server auth: `apps/agents/server.py` (`InternalApiKeyMiddleware`, `validate_startup_security`)
- Chat router / threads: `apps/agents/routers/chat.py`, `apps/agents/agents/core/chat/chat_run_config.py`
- Tools / gates: `apps/agents/agents/core/chat/tools.py`, `tools_registry.py`, `generate_confirmation_gate.py`
- Prompts: `apps/agents/agents/core/chat/prompts/`

---

## Existing guardrails (implemented)

Inventory of **code-level** controls that already constrain the advisor. These are structural / deterministic guards (preferred over prompt-only wording). Prompt “behavior rules” are listed separately at the end of this section.

### A. Authentication & service trust

| Guardrail                        | Where                                                           | What it does                                                                                           |
| -------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Clerk session required           | `apps/web/lib/pro-plan-api.ts` → `requireProPlanApi()`          | `/api/chat` and history reject unauthenticated callers (401).                                          |
| User id from session, not body   | `apps/web/app/api/chat/route.ts`                                | BFF stamps Clerk `userId` into agents headers; client cannot choose identity.                          |
| Shared secret to agents          | `apps/web/lib/agents/headers.ts`                                | Sends `X-Internal-Api-Key` from `GRAPHQL_INTERNAL_API_KEY`; required in production.                    |
| Agents inbound key middleware    | `apps/agents/server.py` → `InternalApiKeyMiddleware`            | When a key is set, all routes except `GET /health` need matching `X-Internal-Api-Key` (403 otherwise). |
| Production startup fail-fast     | `apps/agents/server.py` → `validate_startup_security()`         | Requires internal API key (+ checkpoint DB) in production / when `AGENTS_REQUIRE_*` flags are set.     |
| Agents require user header       | `chat_run_config.resolve_thread_id`, chatkit router             | Missing `X-Menuyukti-User-Id` → 401.                                                                   |
| Outbound GraphQL / generate auth | `graphql_base.graphql_headers`, `generate_instagram_post_image` | Forwards `X-User-Id` + internal key to GraphQL and web `/api/posts/generate`.                          |

### B. Tenant / thread isolation

| Guardrail                  | Where                                        | What it does                                                                                               |
| -------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| User-prefixed thread ids   | `chat_run_config.resolve_thread_id`          | Checkpoint key = `{user_id}:agent:{agent_thread_id}`.                                                      |
| History scoped to that key | `routers/chat.py` GET/DELETE `/chat/history` | Load/delete only the caller’s prefixed thread (DELETE also best-effort cleans ChatKit store for same ids). |
| UUID thread id at BFF      | `apps/web/app/api/chat/schema.ts`            | `agentThreadId` must be a UUID (Zod).                                                                      |

### C. Request validation (BFF + agents)

| Guardrail                    | Where                                               | What it does                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod chat body schema         | `apps/web/app/api/chat/schema.ts`                   | Allowlists `chatMode`, Leonardo model/format/quality enums, viz ids; numeric string ids for location/run/post/page; caps generation references; safe media filenames. |
| Exactly one new user message | Agents `ChatRequest` + `incremental_user_message`   | Prevents clients from rewriting full history each turn; checkpoint owns prior turns.                                                                                  |
| Pydantic content blocks      | `routers/chat.py`                                   | Roles limited; non-empty text or multimodal blocks; `story_asset_action` name must be a safe photo filename.                                                          |
| Multimodal URL shape         | `graph._normalize_user_content`                     | Only `data:image/…` or `https://` image URLs (rejects `ftp://`, etc.).                                                                                                |
| Model allowlist              | `allowed_models.py` + `resolved_chat_gateway_model` | Unknown gateway model ids → HTTP 400. Synced with web `CHAT_GATEWAY_MODEL_IDS`.                                                                                       |
| Vision model allowlist       | `VISION_GATEWAY_MODEL_ALLOWLIST`                    | Separate allowlist for vision/style flows.                                                                                                                            |

### D. Confused-deputy / tool identity (critical LLM guardrail)

| Guardrail                                      | Where                                         | What it does                                                                                                                                                                          |
| ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Injected tool config                           | `tools.py`, inventar, generate tools          | `user_id` / `location_id` / `analytics_run_id` via `InjectedToolArg` / `RunnableConfig` — **model cannot pass another user’s id as a tool argument**.                                 |
| Chart id enum                                  | `get_chart_data` `Literal[…]` + `is_chart_id` | Model can only request catalog chart ids.                                                                                                                                             |
| Location / chart tools omitted without context | `tools_registry.chat_tools_list_from_config`  | No `location_id` → no location tool; no `analytics_run_id` → no chart tool.                                                                                                           |
| Mode-scoped tool binding                       | `tools_registry`                              | `image_assistant`: media + scratchpad + confirm + generate only. `inventar`: refill forecast (+ location if set). `general`: media, knowledge, optional location/charts/web/generate. |
| Knowledge search limit clamp                   | `search_knowledge`                            | `limit` forced into `[1, 20]`.                                                                                                                                                        |
| Safe photo filenames on scratchpad             | `story_assets.is_safe_photo_filename`         | Save/clear / generation refs reject path-traversal-style names.                                                                                                                       |
| Leonardo setting allowlists                    | `generate_instagram_post_image`               | Model / format / quality must be in fixed frozensets; invalid values dropped so BFF defaults apply.                                                                                   |
| Generate prompt length                         | `generate_instagram_post_image`               | Non-empty; max **3000** characters.                                                                                                                                                   |
| Image assistant format preference              | same                                          | UI `image_format` preferred over model tool arg in image_assistant mode.                                                                                                              |

### E. Side-effect / confirmation gate

| Guardrail                 | Where                                                              | What it does                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-signaling confirm tool | `request_story_generate_confirmation`                              | Emits `{ action: "request_confirmation" }` for ChatKit / UI Generate button.                                                                                                                                            |
| Code-level generate block | `generate_confirmation_gate.image_assistant_generate_block_reason` | In **image_assistant** mode, `generate_instagram_post_image` refuses until confirm tool ran and a confirm human message (or prior successful generate / result scratchpad asset). **Not** LangGraph `interrupt()` HITL. |
| Web confirm copy sync     | `apps/web/lib/chat/story-generate-confirmation.ts`                 | Kept in sync with agents confirm phrase constants.                                                                                                                                                                      |

### F. Input / media / payload hygiene (web)

| Guardrail                               | Where                                                                     | What it does                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Max images / bytes                      | `chat-image-limits.ts` (`CHAT_MAX_IMAGES=4`, `CHAT_MAX_IMAGE_BYTES=4MiB`) | Enforced in `build-python-user-message.ts`.                                                         |
| Sharp re-encode / resize                | `build-python-user-message.ts`                                            | Caps edge length; re-encodes avif/tiff; validates MIME allowlist.                                   |
| Workspace media access                  | `requireWorkspaceMediaAccess` + safe filename → S3 key                    | Referenced library / post media loaded only for the authenticated user’s workspace.                 |
| Server-side viz load                    | `referenced-visualization-for-chat.ts`                                    | `@` chart data fetched with `userId` + location; enum viz ids only — not raw client analytics JSON. |
| Strip LLM-only sections from UI hydrate | `strip-llm-only-chat-sections.ts`                                         | Keeps viz dumps out of what the UI re-shows as user-visible history where applicable.               |
| Stream timeout budget                   | `route.ts` `maxDuration = 180`                                            | Bounds how long a single BFF chat invocation may run (platform-dependent).                          |

### G. Agent loop / cost-adjacent limits

| Guardrail                           | Where                                        | What it does                                                                                                       |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ReAct recursion limit               | `limits.CHAT_RECURSION_LIMIT = 20`           | Applied on every chat `RunnableConfig`.                                                                            |
| History trim before model           | `middleware.trim_chat_messages`              | Approx token budget `CHAT_HISTORY_MAX_TOKENS = 60_000`; logs when message count ≥ 80.                              |
| Tavily optional + bounded           | `tavily_search_tool.make_search_web_tool`    | Tool absent without `TAVILY_API_KEY`; `max_results=5`, `search_depth=basic`, no raw page content / no answer blob. |
| AI usage recording                  | `middleware.record_chat_llm_usage` → GraphQL | Best-effort metering after successful model calls (observability; **not** a hard quota enforcer).                  |
| LLM retry only for transient errors | `retry_chat_model_call`                      | Caps retry attempts; avoids blind infinite retry.                                                                  |
| Tool errors become ToolMessages     | `handle_tool_errors`                         | Keeps ReAct alive; returns error text to the model (see gaps: leakage / injection via errors).                     |

### H. Prompt-level behavioral rules (soft — not enforcement)

These live in system prompts (`prompts/general.py`, `blocks.py`, `image_assistant.py`, inventar). They guide the model but **can be overridden by injection**; do not treat as hard security controls.

- Do not invent venue sales numbers; charts / attached viz are the quantitative source of truth.
- Prefer location / chart / media tools before web search; use catalog chart ids only.
- Do not dump full chart payloads into the user reply.
- Image flows: do not paste image URLs / markdown images in final text (UI shows thumbnails).
- Image assistant phases: gather → confirm tool → generate (reinforced by code gate above).
- Attached media section text tells the model to use **exact** filenames only (`format-attached-media-for-chat.ts`).

### I. Tests that lock some of the above

Examples (not exhaustive): `test_internal_api_key.py`, `test_startup_security.py`, `test_chat_multimodal.py` (bad image URL rejected), `test_chat_tools_list.py` (mode gating), confirmation / generate Instagram tests, agents headers / chat schema tests on the web side.

---

## What is good (aligned with industry practice)

These map the inventory above to industry expectations: **never let the model choose identity**, **least-privilege tools**, **validate at the edge**, **isolate conversation state by tenant**.

1. **BFF owns identity** — Clerk → headers; no client-spoofed user id on the normal path.
2. **Agents as internal service** — inbound key + production fail-fast.
3. **Thread isolation** — `{user_id}:agent:…` checkpoints.
4. **Injected tool identity / venue context** — blocks classic tool-arg IDOR via the model.
5. **Mode-scoped least privilege** — inventar / image_assistant / general bind different tools.
6. **Input hygiene** — Zod/Pydantic, safe filenames, image size/MIME, server-side viz load.
7. **Bounded loops & allowlists** — recursion, history trim, chat/Leonardo/Tavily bounds.
8. **Partial side-effect gate** — code-level image_assistant confirm (soft phrases, but deterministic refuse).
9. **Operator-seeded knowledge** — ingest under `apps/graphql/knowledge/` (not end-user writable RAG).
10. **Server-side visualization attach** — BFF loads analytics with the authenticated user.

---

## What needs to be addressed (gaps vs best practice)

Prioritized for remediation planning. Items are findings, not committed tasks — split into Backlog tasks when scheduling work.

### P0 / high leverage

#### A. Prompt injection defenses are largely missing (OWASP LLM01)

**Gap:** No durable untrusted-content labeling; no pre-tool policy check beyond existing allowlists; no output/canary for system-prompt leak. Soft prompt rules (section H) are not enough.

**Industry practice:** Assume the model can be steered. Put policy in **code**; label untrusted context; red-team continuously.

**Direction:** Delimit `@` viz / knowledge / Tavily as data-only; short system-policy block; golden jailbreak → tool-escalation suite.

#### B. Shared secret = full impersonation if leaked

**Gap:** Key + network reachability to agents ⇒ any `X-Menuyukti-User-Id`.

**Direction:** Private network; rotate keys; prefer short-lived BFF→agents tokens binding `sub=userId`.

#### C. No hard abuse / spend limits on chat

**Gap:** Usage is recorded (`record_chat_llm_usage`); plan check removed from `requireProPlanApi`. Recursion/trim/Tavily bounds help but are not per-user budgets.

**Direction:** Enforce daily token + image caps before streaming.

### P1

#### D. Soft confirmation ≠ real HITL

**Gap:** Phrase matching (`"generate"`, etc.); **general** mode can call generate without the image_assistant gate.

**Direction:** LangGraph `interrupt()` or signed one-time approve tokens for Leonardo / future writes.

#### E. Authorization deferred entirely to GraphQL

**Gap:** Client `locationId` / `analyticsRunId` / `postId` are intent under the real user — safe only if GraphQL always enforces ownership.

**Direction:** FOCUSED GraphQL audit on chat-touched operations.

#### F. Indirect injection via web / tool errors / attached context

**Gap:** Tavily JSON, knowledge chunks, tool exception strings, and viz markdown share undifferentiated model context; web search can be an exfil channel.

**Direction:** Quarantine retrieval; sanitize tool errors; optional “web only when user asked”.

#### G. Agents still allow `https://` image URLs

**Gap:** BFF usually sends `data:`; agents accept `https://` if called directly (provider fetch / SSRF-ish risk).

**Direction:** Prefer `data:image/` only at the agents multimodal boundary.

### P2

#### H. Limited advisor prompt-injection / confused-deputy tests

#### I. No output / DLP filter

#### J. Little alerting on anomalous tool sequences

---

## Industry best practice cheat sheet (mapped to Menuyukti)

| Practice                                   | Why it matters                                    | Current fit                                                             |
| ------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Assume the model is compromised            | Prompt injection is not fully solvable in prompts | Injected identity + allowlists (good); untrusted labeling / policy weak |
| Separate trusted vs untrusted context      | User / RAG / web / viz are hostile                | Not labeled                                                             |
| Least-privilege tools                      | Shrink blast radius                               | Mode gates **implemented**                                              |
| Human approval for side effects            | Cost, brand, irreversible writes                  | Soft code gate in image_assistant only                                  |
| Hard quotas                                | LLM + image burn                                  | Soft limits only (recursion/trim/Tavily); no user budget                |
| Strong service auth                        | Shared key is a single point of failure           | Key middleware + prod fail-fast **implemented**                         |
| Never put secrets in prompts / tool errors | Models and SSE leak                               | Review error shaping                                                    |
| Authz at every data plane                  | Agent is a confused deputy                        | Injected ids **implemented**; GraphQL ownership must hold               |
| Continuous red team                        | Prompts and tools drift                           | Partial unit tests; no injection suite                                  |

---

## Tracked work (Backlog)

Parent: **TASK-8** — Harden chat advisor security

**Scope (2026-10-28):** `chatImageAssistant` is MVP-off. Active security work targets **general** advisor only. Leonardo / Image Assistant HITL is deferred (**TASK-8.4**).

| Step | Task         | Priority | Focus                                                                      |
| ---- | ------------ | -------- | -------------------------------------------------------------------------- |
| 1    | **TASK-8.1** | High     | Agents service trust / key hygiene (ops + docs)                            |
| 2    | **TASK-8.2** | High     | Untrusted-context labeling + system security policy                        |
| 3    | **TASK-8.3** | High     | Per-user **chat LLM** spend / rate limits (no Leonardo quotas)             |
| 3b   | **TASK-8.8** | High     | Unbind Leonardo generate from general advisor while Image Assistant is off |
| 4    | **TASK-8.4** | Low      | **Deferred:** real HITL for advisor Leonardo / Image Assistant             |
| 5    | **TASK-8.5** | Medium   | FOCUSED GraphQL authz (general tools only; no post-generate)               |
| 6    | **TASK-8.6** | Medium   | Multimodal **input** URL allowlist + sanitize tool errors                  |
| 7    | **TASK-8.7** | Low      | Red-team / observability for general advisor (depends on 8.2, 8.6)         |

Preferred order: **8.1–8.3** and **8.8** can proceed in parallel. **8.7** waits on 8.2 and 8.6. Resume **8.4** only when re-enabling `chatImageAssistant`.

## Suggested remediation order

1. **Network + key hygiene** — agents private; rotate internal key; document who can call agents.
2. **Untrusted-context labeling + policy line in system prompt** — cheap complement to existing tool gates.
3. **Enforce spend/rate limits** on `/api/chat` (and generate) — usage recording already exists as a hook.
4. **Real HITL** for image generate (and future writes) — upgrade today’s confirmation gate.
5. **FOCUSED GraphQL authz** on chat tool operations.
6. **Tighten multimodal URL allowlist** and sanitize tool errors.
7. **Red-team suite + monitoring**.

---

## Out of scope / follow-ups

- Full GraphQL security scorecard → use `menuyukti-graphql-security-audit` (FULL / FOCUSED).
- Germany POS / fiscal readiness → separate audit track.
- Customer PWA / public menu surfaces — not this doc unless they gain agent tools.

When scheduling work, create Backlog **tasks** from the P0/P1 items above rather than treating this guide as executable work. Keep this doc updated when new guardrails ship.
