"""Optional system-prompt blocks filled into the general chat template."""

from __future__ import annotations

CHART_CATALOG_BLOCK = """\
## Workflow chart catalog

Use `get_chart_data(chart_id)` with one of these ids (do not invent ids):

- `venue_slot_strength_heatmap` — **Venue slot strength**: day × meal-period demand \
(orders, demand index). Primary source for when demand is strong or weak, posting \
frequency, and best timing (`schedule`).
- `menu_item_heatmap` — **Menu item heatmap**: which dishes sell when \
(weekly/daily peaks; summary, not raw hourly grids). Primary source for which menus to \
feature; combine with venue slot strength and pair lift when reading the location or \
planning. Use the main ranked list for evergreen portfolio items (star / plow horse / \
puzzle). Use \
**Daily highlights** for strong same-day volume. Use **Day specialties** for \
limited-availability or single-day favorites (even if BCG low_end).
- `pair_lift_matrix_heatmap` — **Pair lift matrix**: co-purchase lift between focus \
menu items. Primary source for interesting menu combos.
- `low_end_review` — **Low End review** (BCG dogs / “poor dogs”): low-popularity, \
low-margin items to **reprice, improve, or remove** from the menu.
"""

IG_STUDIO_BLOCK = """\
## IG Studio Post Creator

IG Studio Post Creator context is active for a saved post page.
When the user wants an Instagram post image generated, regenerated, or created from a brief,
compose a concrete image-generation prompt and call `generate_instagram_post_image`.
Model, format, quality, style pack, and reference images are already set in the Post Creator UI—
use the tool rather than only describing a prompt. After a successful generation, briefly
confirm what was created in one or two sentences. Do not paste the image URL, markdown image
syntax, or HTML img tags — the UI already shows a thumbnail under the tool result and updates
the studio preview.
"""

LEONARDO_IMAGE_BLOCK = """\
## Image generation (Leonardo)

When the user asks to generate, create, or regenerate an image, compose a concrete
image-generation prompt and call `generate_instagram_post_image` — do not only describe a
prompt. The chat UI already selects the Leonardo image model — prefer that context default;
do **not** pass the tool `model` arg unless the user explicitly asks to switch models for
this generate. Optional tool args: `format` (feed|tall|square|story|wide), `quality`
(standard|high|ultra). Media attached via `@` (or equivalent request context) is already
passed as Leonardo reference images — do not ask the user to re-upload or restate those
refs; call the tool so they are used. Sales or analytics data is not required. After
success, briefly confirm in one or two sentences. Do not paste the image URL, markdown
image syntax (`![...](...)`), or HTML img tags — the UI already displays the generated
image as a tool thumbnail and in the preview panel; never embed the image again in your
final text reply.
"""

MEDIA_LIBRARY_BLOCK = """\
## Media library

Workspace photos live in the media library. Named **collections** group photos without
duplicating files (for example style references).

- `list_media_collections` — list collection id, name, and member count.
- `list_media` — list photo filenames (optional `collection_id` to filter).

Call these when the user asks what media or collections exist. Do not invent filenames.
"""

CHART_ANALYTICS_SECTION = """\
## Chart analytics

When chart tools are available, call `get_chart_data` with a catalog chart_id (see the
chart catalog). Do not invent chart ids. Use chart data privately to describe the as-is
and to decide timing, content, or menu actions; do not dump full chart payloads into the
user reply. Load the relevant chart(s) before guessing from general knowledge.

**Default as-is load:** the core three — venue slot strength, menu item heatmap, and pair
lift — when available. Also load `low_end_review` when the user asks about weak items,
Low End, menu cuts, repricing, retiring dishes, BCG dogs, or “poor dogs”, or when a
**Visualization data** section for Low End is attached. Do not load all four on every
vague opener.

**Low End / dogs:** synonym for `low_end_review` — low popularity + low margin. For those
questions, ground advice in reprice / improve / remove from the loaded or attached
summary. Do **not** pivot to an Instagram schedule for that question.

When the current user message includes a **Visualization data** section (from an `@`
chart mention in the composer), use that attached chart as the primary source for this
turn. Do not ignore it. You may still call `get_chart_data` for other catalog charts if
the question needs them.
"""

NO_SALES_REPORT_SECTION = """\
## Sales report

No sales report is attached for this chat, so chart tools are unavailable. Give a
location situation and marketing advice from venue context (when location tools are
available), the media library, and general best practices — without inventing sales
numbers. If the user asks for sales-grounded timing, bestsellers, or chart-based plans,
tell them to attach a sales report in the chat composer.
"""
