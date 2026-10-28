---
id: doc-2
title: Square POS analytics integration spike
type: specification
created_date: '2026-10-28T16:01:00Z'
updated_date: '2026-10-28T16:01:00Z'
tags:
  - square
  - pos
  - analytics
  - oauth
---

# Square POS analytics integration spike

**Audience:** engineering  
**Scope:** MenuYukti Square App Marketplace path — OAuth + Orders/Locations sync into existing analytics (`OrderFact` / advisor KPIs).  
**Related:** TASK-9 (epic), TASK-9.8 (SDK install), TASK-9.2+ (OAuth/sync).  
**Date:** 2026-10-28

This spike locks decisions for implementation. It does not ship OAuth UI or sync code.

---

## 1. Sandbox application (local / dev)

- Square Developer Console: create/use a **Sandbox** application for MenuYukti.
- Configure credentials in **repo-root** `.env` (see `/.env.example`):

| Env var                       | Purpose                                                              |
| ----------------------------- | -------------------------------------------------------------------- |
| `SQUARE_ENVIRONMENT`          | `sandbox` (local) or `production`                                    |
| `SQUARE_APPLICATION_ID`       | OAuth client id / authorize URL                                      |
| `SQUARE_APPLICATION_SECRET`   | OAuth code exchange (server only)                                    |
| `SQUARE_OAUTH_REDIRECT_URL`   | Exact HTTPS callback registered on the Square app (TASK-9.2)         |
| `SQUARE_TOKEN_ENCRYPTION_KEY` | AES key for per-workspace tokens at rest (TASK-9.2)                  |
| `SQUARE_ACCESS_TOKEN`         | Optional **sandbox-only** spike token for smoke scripts before OAuth |

- Never commit secrets. Production credentials live in deploy secrets only.
- Product sellers must use **OAuth**, not personal access tokens.

---

## 2. OAuth scopes (least privilege)

| Scope                   | Why                                            |
| ----------------------- | ---------------------------------------------- |
| `ORDERS_READ`           | `SearchOrders` / retrieve orders for analytics |
| `MERCHANT_PROFILE_READ` | `ListLocations` / location mapping             |

Defer until needed:

| Scope                | When                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| `PAYMENTS_READ`      | Refund netting in TASK-9.4                                                    |
| Catalog / items read | Better categories (optional follow-on)                                        |
| `REPORTING_READ`     | Deferred — line-level Orders feed heatmaps; Reporting API not required for v1 |

No write scopes for the analytics marketplace path.

---

## 3. APIs (v1)

- **Locations** `ListLocations` — map Square venues to MenuYukti locations.
- **Orders** `SearchOrders` — primary sales pull (`COMPLETED`, date range, `location_ids`, pagination).
- **Refunds** — via Payments/Refunds APIs when implementing sync (with `PAYMENTS_READ`).
- **Reporting API** — deferred.

---

## 4. Square order → MenuYukti `OrderFact`

Target model: `apps/graphql/data_sources/models/analytics.py` (`OrderFact`). Location scope remains on `AnalyticsRun.location_id` (or equivalent mapped location), not on each line.

| `OrderFact` / contract field | Square source                                              |
| ---------------------------- | ---------------------------------------------------------- |
| `bill_number`                | Order `id`                                                 |
| `menu`                       | Line item name                                             |
| `qty`                        | Line quantity                                              |
| `price`                      | Line unit price (major units / converted from money)       |
| `total_after_bill_discount`  | Line total after discounts; **skip** rows with revenue ≤ 0 |
| `order_time`                 | Prefer order `closed_at`, else `created_at`                |
| `menu_category`              | `"uncategorized"` until Catalog enrichment                 |
| `menu_category_detail`       | `"uncategorized"` until Catalog enrichment                 |
| `pos_system`                 | `"square"`                                                 |

Modifiers: flatten or skip with a stable rule in TASK-9.4 (do not invent per-heatmap names).  
COGS: remain **manual** (`MenuItemCogs`) — Square orders do not supply food cost.

Heatmaps need only `menu`, `qty`, `order_time` once rows exist.

---

## 5. Client / library decision (for TASK-9.8)

- Install the official **Square Python SDK** in **`apps/graphql`** via `uv`.
- Ownership: GraphQL holds OAuth token exchange, encrypted storage, Locations/Orders clients, and sync.
- **`apps/web`:** no Square SDK; only Connect button, authorize redirect, and callback route that hands the code to GraphQL/BFF.
- Do **not** create a separate Square product app or shared `packages/square` until reuse is proven.

---

## 6. Sync defaults

| Question              | Default                                                                              |
| --------------------- | ------------------------------------------------------------------------------------ |
| Multi-location        | Explicit Square location ↔ MenuYukti location mapping (TASK-9.3); never mix unmapped |
| Historical backfill   | **90 days** on first sync                                                            |
| Freshness MVP         | **Poll** after initial sync; webhooks in TASK-9.5                                    |
| Sync freshness target | Within ~15–60 minutes via poll for MVP (tighten later with webhooks)                 |

---

## 7. Out of scope (this spike / epic slice)

- Replacing Square POS / Terminal / fiscalization
- Native MenuYukti cashier for Square sellers
- Cursor Square plugin as product surface
