---
name: menuyukti-web
description: >-
  Next.js web app (apps/web): GraphQL data fetching, Clerk auth, next-intl, workflow/milestone UI including
  Data tab Prepare and dataTask enums, API routes and Zod schemas. Use when changing milestone cards,
  BFF routes, workflow timeline types, or web-side GraphQL usage. For performance, caching, and composition
  refactors, also use nextjs-performance, next-cache-components, and vercel-composition-patterns (see
  Companion skills).
---

# Menuyukti: `apps/web`

**Next.js** user-facing app: chat, campaigns, CRUD. **All product data** goes through **GraphQL** (no direct DB). Auth: **Clerk**. Copy: **next-intl** (no hardcoded user-facing strings).

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

| Concern                | Typical locations                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------- |
| App Router             | [`apps/web/app/`](../../../apps/web/app/)                                               |
| GraphQL client         | Co-located data fetching / server actions per feature (see existing workflows)          |
| Workflow UI            | [`apps/web/app/(protected)/workflows/`](<../../../apps/web/app/(protected)/workflows/>) |
| Shared GraphQL helpers | [`apps/web/lib/graphql/`](../../../apps/web/lib/graphql/)                               |
| API routes             | [`apps/web/app/api/`](../../../apps/web/app/api/)                                       |

Named product features and aliases (e.g. workflow presets): see [`.agents/menuyukti-features.md`](../../menuyukti-features.md).

Commands: [AGENTS.md](../../../AGENTS.md) § Web.

## Milestone **Data** tab: `dataTask` and Prepare

The agents service resolves the runtime skill from **`data_task`** ([`menuyukti-agents`](../menuyukti-agents/SKILL.md)). The web app must expose the same identifiers in the milestone **Data** UI and forward them to the Prepare/BFF flow.

### Checklist: new `dataTask` / prepare flow

1. **Runtime skill** — add `apps/agents/agents/core/milestone_run/skills/<skill_id>/SKILL.md` (preferred; see [`menuyukti-agents`](../menuyukti-agents/SKILL.md)) or legacy `packages/agent-skills/.../skills/<skill_id>/SKILL.md`.
2. **Types & enums** — extend **`dataTask`** in:
   - [`timeline/types.ts`](<../../../apps/web/app/(protected)/workflows/_components/timeline/types.ts>)
   - [`node-schemas.ts`](../../../apps/web/lib/graphql/node-schemas.ts)
   - [`app/api/workflows/[id]/milestones/schema.ts`](../../../apps/web/app/api/workflows/[id]/milestones/schema.ts)
3. **UI** — wire the Select / tabs in [`milestone-item-tabs.tsx`](<../../../apps/web/app/(protected)/workflows/_components/timeline/milestone-item-tabs.tsx>) (and any related components).
4. **next-intl** — add messages for the new option labels/descriptions (no hardcoded copy).
5. **GraphQL export/import** — ensure new values round-trip when workflows are exported/imported ([`menuyukti-graphql`](../menuyukti-graphql/SKILL.md)).

## GraphQL from the web

- Prefer existing patterns in the workflows and protected areas for **authenticated** requests.
- Keep server/client boundaries aligned with Next.js conventions ([`next-best-practices`](../next-best-practices/SKILL.md)).

## Related

| Topic              | Skill                                                                  |
| ------------------ | ---------------------------------------------------------------------- |
| Prepare / prefetch | [`menuyukti-agents`](../menuyukti-agents/SKILL.md)                     |
| Backend schema     | [`menuyukti-graphql`](../menuyukti-graphql/SKILL.md)                   |
| Monorepo map       | [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md) |

## Canonical docs

- [`apps/web/README.md`](../../../apps/web/README.md) (if present)
- [`AGENTS.md`](../../../AGENTS.md)

## Progressive disclosure

Split long route or component maps into `reference.md` in this folder if this file grows.
