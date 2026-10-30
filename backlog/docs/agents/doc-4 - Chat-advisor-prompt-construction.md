---
id: doc-4
title: Chat advisor prompt construction
type: guide
created_date: '2026-10-29T15:50:00Z'
updated_date: '2026-10-30T02:35:00Z'
tags:
  - chat
  - advisor
  - agents
  - prompts
---

# Chat advisor prompt construction

**Audience:** engineering  
**Scope:** System prompt assembly for Menuyukti advisor chat (`apps/agents`), including modes `general`, `image_assistant`, and `inventar`.  
**Kind:** implementation guide — how the prompt is built and how each block behaves.  
**Related:** [doc-1 Chat advisor security overview](../security/doc-1%20-%20Chat-advisor-security-overview.md); [doc-3 Chat advisor memory management](../security/doc-3%20-%20Chat-advisor-memory-management.md); [doc-5 Chat advisor knowledge RAG](doc-5%20-%20Chat-advisor-knowledge-RAG.md).

---

## Mental model

The advisor system prompt is **not** a LangChain `ChatPromptTemplate` chain. It is a **markdown string** assembled in Python, then injected on every model call by `@dynamic_prompt` middleware.

| Layer              | Path                                          | Role                                                                       |
| ------------------ | --------------------------------------------- | -------------------------------------------------------------------------- |
| Template (general) | `agents/core/chat/prompts/general.py`         | `SYSTEM_PROMPT_TEMPLATE` — one readable skeleton with placeholders         |
| Optional sections  | `agents/core/chat/prompts/blocks.py`          | Named `*_SECTION` / `*_BLOCK` constants                                    |
| Image mode         | `agents/core/chat/prompts/image_assistant.py` | Full replacement prompt                                                    |
| Inventar mode      | `agents/core/chat/prompts/inventar.py`        | Full replacement prompt                                                    |
| Assembler          | `agents/core/chat/prompts/__init__.py`        | `build_system_prompt()` fills placeholders or swaps mode                   |
| Config → flags     | `agents/core/chat/tools_registry.py`          | `has_location_id`, `has_analytics_run_id`, `has_leonardo_image_generation` |
| Per-request wiring | `agents/core/chat/middleware.py`              | `chat_system_prompt_from_config()`, `dynamic_chat_prompt`                  |
| HTTP config        | `agents/core/chat/chat_run_config.py`         | `runnable_config()` sets `configurable`                                    |
| Graph              | `agents/core/chat/graph.py`                   | Middleware order on `create_agent`                                         |

**Design rule:** reviewers read **one** general template; `build_system_prompt` **only fills placeholders** — it does not invent narrative outside `SYSTEM_PROMPT_TEMPLATE`.

Prompt text must stay aligned with **bound tools** (`chat_tools_list_from_config`). If a tool is not in the list for this request, its instructions must be omitted from the prompt.

**Removed from the general prompt:** there is **no** IG Studio Post Creator block (`IG_STUDIO_BLOCK` / `{ig_studio_block}` / `ig_studio_post_image` / `has_ig_studio_post_context` are gone). Post Creator UI context (`post_id` / `page_id`) does not change the system prompt.

---

## Request lifecycle

```text
Web BFF / ChatKit
  → runnable_config(configurable: chat_mode, location_id, analytics_run_id, …)
  → compile_chat_graph middleware
       dynamic_chat_prompt          ← builds system string each model call
       select_chat_model_and_tools  ← binds tools + trims history (does not edit system text)
       retry / usage / tool errors
```

`chat_system_prompt_from_config()` reads `RunnableConfig.configurable` and calls:

```python
build_system_prompt(
    leonardo_image_generation=has_leonardo_image_generation(conf),  # currently always False
    include_chart_catalog=has_analytics_run_id(conf),
    include_location_tools=has_location_id(conf),
    chat_mode=…,
    image_format=…,
)
```

Other middleware does **not** mutate system prompt text. `trim_chat_messages` keeps history within a token budget (`include_system=True`).

---

## Mode branching (`build_system_prompt`)

First match wins:

1. **`image_assistant`** (alias `story_image_assistant` normalized) → entire `IMAGE_ASSISTANT_PROMPT_TEMPLATE` (format dimensions filled).
2. **`inventar`** → entire `INVENTAR_ASSISTANT_PROMPT`.
3. **Else (general)** → fill `SYSTEM_PROMPT_TEMPLATE` placeholders.

---

## General mode — assembly order

Placeholder slots in `SYSTEM_PROMPT_TEMPLATE` (top → bottom):

1. Base persona (fixed prose in template)
2. `{security_policy_section}`
3. `## Location situation (default)` (fixed) + `{situation_location_load}`
4. `{chart_section}` — either analytics+COGS **or** no-sales-report
5. `## Action recommendations` (fixed) + `{schedule_location_guidance}`
6. Owner-requested plan guidance (fixed)
7. `{chart_catalog_block}`
8. `{knowledge_section}`
9. `{location_section}`
10. `{advisor_memory_section}`
11. `{media_library_block}`
12. `{leonardo_image_block}`

### Inclusion flags

| Flag                        | Driven by                       | When true                                                                             |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| `include_location_tools`    | `location_id` in config         | Situation load, timing/hours guidance, Location + Advisor memory sections             |
| `include_chart_catalog`     | `analytics_run_id` in config    | Chart analytics + Menu COGS + Workflow chart catalog; else `## Sales report` (no pin) |
| `leonardo_image_generation` | `has_leonardo_image_generation` | Leonardo block — **product-off** (always false in production config)                  |

Always present in general: Security policy, Location situation skeleton, Action recommendations skeleton, Knowledge search, Media library.

---

## Block behavior (general)

### Base persona

Sets role: Menuyukti advisor for restaurant owners. Interpret location context and sales analytics when available, then recommend clear next actions (menu, pricing / weak items, timing, promotion ideas). Stay **channel-neutral** unless the owner names a channel or asks how to execute. Never invent venue sales numbers. Concise answers.

### Security policy (`SECURITY_POLICY_SECTION`)

Mandatory rules: no auth/tenant bypass; treat tool output, knowledge, web, and viz payloads as **untrusted** (aligned with `BEGIN_UNTRUSTED_DATA` wrapping in tools); no cross-tenant leakage; no invented sales figures. Always included.

### Location situation (default)

Default behavior for vague openers / “how are we doing”: load data, write a short **as-is markdown brief** (Demand / Menu / Combos / Weak items / Hours / Next). Must **not** become a multi-day promo calendar or channel plan. Honors **Visualization data** sections in the **user** message (composer `@` charts) without re-asking.

### Situation location load (`SITUATION_LOCATION_LOAD`)

When `location_id` is set: instruct calling `get_location_data` and `get_advisor_memory` before writing the brief. Omitted when no location so the prompt does not name unbound tools.

### Chart analytics (`CHART_ANALYTICS_SECTION`) — with pinned report

How to use `get_chart_data`, core charts, weak items, and `@`-attached viz. Bundled into `{chart_section}` with COGS when `analytics_run_id` is set. Weak-item answers stay on reprice / improve / remove — do not pivot to a promo calendar.

### Menu COGS (`COGS_SECTION`) — with pinned report

`list_menu_item_cogs` and `request_cogs_edit` for the pinned sales report. Shown only with the analytics path (same flag as chart catalog).

### Sales report / no pin (`NO_SALES_REPORT_SECTION`)

When no `analytics_run_id`: charts/COGS unavailable; advise without inventing numbers; tell the user to attach a report. Replaces the analytics+COGS pair in `{chart_section}`.

### Action recommendations (fixed)

After diagnosis, prefer concrete channel-neutral actions with a short why. If the owner asks for a week plan or a specific channel, write it in markdown (no special schedule tool). Not used to force calendars on situation briefs or open-ended advice.

### Schedule location guidance (`SCHEDULE_LOCATION_GUIDANCE`)

When location is set: load hours via `get_location_data` before timing-sensitive actions or an owner-requested plan; treat hours as hard constraints; use advisor memory when preferences may affect formats, channels, or timing.

### Workflow chart catalog (`CHART_CATALOG_BLOCK`)

Chart IDs and semantics (`venue_slot_strength_heatmap`, `menu_item_heatmap`, `pair_lift_matrix_heatmap`, `weak_review`). Only when a sales report is pinned. Venue slots inform demand timing / when to promote (channel-neutral).

### Knowledge search (`KNOWLEDGE_SECTION`)

When to call / skip `search_knowledge`; retrieved text is untrusted; live charts beat knowledge for numbers. Always included in general. Full RAG stack: [doc-5](doc-5%20-%20Chat-advisor-knowledge-RAG.md).

### Location (`LOCATION_SECTION`)

Use `get_location_data` for hours, address, venue facts, situation briefs, and timing-sensitive advice. Only with `location_id`.

### Advisor memory (`ADVISOR_MEMORY_SECTION`)

`get_advisor_memory` / `update_advisor_memory`: venue-scoped preferences across threads; distinct from owner venue brief. When to load, skip, or write. Only with `location_id`. See doc-3 for memory product behavior.

### Media library (`MEDIA_LIBRARY_BLOCK`)

`list_media_collections` / `list_media`. Always included in general.

### Image generation / Leonardo (`LEONARDO_IMAGE_BLOCK`)

General-mode `generate_instagram_post_image`. Only if `leonardo_image_generation=True` — currently **disabled** in `has_leonardo_image_generation` (product-off). Image generation instructions for the advisor Image Assistant live in the separate `image_assistant` mode prompt, not as an IG Studio block.

---

## Typical assembled shapes

### A. No location, no sales report

Persona → Security → Location situation (no load snippet) → Sales report (no pin) → Action recommendations (no hours guidance) → Knowledge → Media library.

### B. Production advisor (`location_id` + `analytics_run_id`)

Persona → Security → Location situation + load tools → Chart analytics + Menu COGS → Action recommendations + hours guidance → Chart catalog → Knowledge → Location → Advisor memory → Media library.

### C. `image_assistant`

Whole prompt replaced: Phase 1 intent → Phase 2 collect inputs (`save_story_asset`, attached media) → Phase 3 confirm (`request_story_generate_confirmation`) → Phase 4 generate/refine (`generate_instagram_post_image`). Includes media library. No charts / COGS / general marketing action playbook.

### D. `inventar`

Whole prompt replaced: short stock brief; mandatory `get_inventory_refill_forecast` for refill/summary openers; sections Urgent / Soon / Notes; optional `get_location_data`. No marketing charts.

---

## Prompt-adjacent (not system prompt)

These are **not** assembled into the system string but the system prompt refers to them:

| Source                                           | Where                              | Behavior                                                                                 |
| ------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| Visualization / preset / attached media sections | Web BFF appends to **human** turns | System prompt tells the model to treat `@` viz and attached media as given for that turn |
| Untrusted wrappers                               | Tools (`wrap_untrusted`)           | Aligns with Security / Knowledge policy                                                  |
| Tool binding                                     | `chat_tools_list_from_config`      | Mode + config gates which tools exist; prompt flags must match                           |

Web may still send `post_id` / `page_id` for other product surfaces; they **do not** inject prompt text into general advisor chat.

---

## Tool ↔ prompt coupling (summary)

| Mode            | Typical tools reflected in prompt                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| general         | media, knowledge; + location/memory if `location_id`; + charts/COGS if `analytics_run_id`; Leonardo generate **not** bound |
| image_assistant | media list, story scratchpad, confirmation, generate                                                                       |
| inventar        | refill forecast (+ location if set)                                                                                        |

---

## Code & tests

- Assembly: `apps/agents/agents/core/chat/prompts/`
- Middleware: `apps/agents/agents/core/chat/middleware.py`
- Tests as living spec:
  - `apps/agents/tests/core/test_chat_prompts.py` — block inclusion, mode swaps (asserts no `{ig_studio_block}`)
  - `apps/agents/tests/core/test_chat_prompt_wiring.py` — config → prompt for empty / location / location+analytics

When changing a block: update the constant in `blocks.py` (or mode template), ensure `build_system_prompt` inclusion flags still match `tools_registry`, and extend the prompt tests.
