---
name: menuyukti-web
description: >-
  Next.js web app (apps/web): GraphQL data fetching, Clerk auth, next-intl, chat-first UI
  (`/advisor`, agentThreadId, components/chat), API routes and Zod schemas. Use when changing
  chat modes, BFF routes, calendar, IG Studio, or web-side GraphQL usage. For performance,
  caching, and composition refactors, also use nextjs-performance, next-cache-components, and
  vercel-composition-patterns (see Companion skills).
---

# Menuyukti: `apps/web`

**Next.js** user-facing app: **chat-first** home, analytics, media, IG Studio, calendar, CRM. **All product data** goes through **GraphQL** (no direct DB). Auth: **Clerk**. Copy: **next-intl** (no hardcoded user-facing strings).

For monorepo boundaries, see [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md). For UI and i18n rules, see [`.cursor/rules/web-conventions.mdc`](../../../.cursor/rules/web-conventions.mdc).

## Companion skills

When implementing in **`apps/web`**, follow these skills in addition to this doc.

### Feature work (default)

- [`vercel-react-best-practices`](../vercel-react-best-practices/SKILL.md) — React and Next.js performance patterns.
- [`next-best-practices`](../next-best-practices/SKILL.md) — Next.js file conventions, RSC boundaries, data fetching.
- [`shadcn`](../shadcn/SKILL.md) — UI components and styling with the project’s shadcn setup.

For **Clerk** (auth, middleware, Server Actions), use [`clerk-nextjs-patterns`](../clerk-nextjs-patterns/SKILL.md).

### Refactors, performance, and composition

When improving an existing implementation (not only greenfield features), also read:

- [`nextjs-performance`](../nextjs-performance/SKILL.md) — Use when tuning Core Web Vitals, bundle size, LCP/INP, images/fonts, or RSC data performance.
- [`next-cache-components`](../next-cache-components/SKILL.md) — Use when adopting Cache Components, PPR, `use cache`, `cacheLife`, `cacheTag`, or `updateTag`.
- [`vercel-composition-patterns`](../vercel-composition-patterns/SKILL.md) — Use when refactoring boolean-prop sprawl, compound components, render props, or flexible public APIs.

## Layout (high level)

| Concern          | Typical locations                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App Router       | [`apps/web/app/`](../../../apps/web/app/)                                                                                                                                                         |
| Protected shell  | [`apps/web/app/(protected)/`](<../../../apps/web/app/(protected)/>) — `/advisor`, `/analytics`, `/calendar`, `/ig-studio`, `/media`, …                                                            |
| Chat home        | Public URL **`/advisor`** (rewrites to `app/(protected)/agent/`); thread id = **`agentThreadId`**. Shared UI: [`components/chat/`](../../../apps/web/components/chat/)                            |
| Chat modes       | [`lib/chat/chat-modes.ts`](../../../apps/web/lib/chat/chat-modes.ts) — `general` \| `image_assistant`                                                                                             |
| GraphQL client   | [`apps/web/lib/graphql/client.ts`](../../../apps/web/lib/graphql/client.ts), [`queries/`](../../../apps/web/lib/graphql/queries/), [`node-schemas/`](../../../apps/web/lib/graphql/node-schemas/) |
| API routes (BFF) | [`apps/web/app/api/`](../../../apps/web/app/api/) — e.g. `/api/chat`, `/api/calendar-entries`, media, styles                                                                                      |

Named product features: see [`.agents/menuyukti-features.md`](../../menuyukti-features.md).

Commands: [AGENTS.md](../../../AGENTS.md) § Web.

## Chat (`/advisor`)

Default authenticated path is **`/advisor`** (`defaultAuthenticatedPath`). Legacy `/workflow` and `/agent` redirect or rewrite to `/advisor`.

- **Thread identity:** `agentThreadId` only (no workflow container for chat).
- **BFF:** `/api/chat` and `/api/chat/history` forward to agents with `agent_thread_id`.
- **UI:** compose from [`components/chat/`](../../../apps/web/components/chat/) (layout, composer, modes, story artifact, visualizations). Feature pages under `app/(protected)/agent/` host the advisor surface.
- **Do not** restore milestone timeline, preset BFF (`.../milestones/.../run`), or workflow-list CRUD as live product.

## GraphQL from the web

- Use `graphqlQuery` from [`lib/graphql/client.ts`](../../../apps/web/lib/graphql/client.ts) in Server Components and `app/api/` handlers.
- Validate node `data` JSON with Zod via `parseNodeData` / schemas under `lib/graphql/node-schemas/` — avoid casting.
- Keep server/client boundaries aligned with Next.js conventions ([`next-best-practices`](../next-best-practices/SKILL.md)).

## Related

| Topic          | Skill                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Chat agents    | [`menuyukti-agents`](../menuyukti-agents/SKILL.md)                     |
| Backend schema | [`menuyukti-graphql`](../menuyukti-graphql/SKILL.md)                   |
| Monorepo map   | [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md) |

## Canonical docs

- [`apps/web/README.md`](../../../apps/web/README.md)
- [`AGENTS.md`](../../../AGENTS.md)

## Progressive disclosure

Split long route or component maps into `reference.md` in this folder if this file grows.
