"""System prompts for the Menuyukti personal assistant chat.

The complete general prompt structure lives in ``SYSTEM_PROMPT_TEMPLATE`` so reviewers
can read one constant and see every section (including optional blocks as placeholders).
``build_system_prompt`` only fills those placeholders—it does not add narrative
outside the template.
"""

from __future__ import annotations

from agents_app.agents.core.chat.prompts.blocks import (
    CHART_ANALYTICS_SECTION,
    CHART_CATALOG_BLOCK,
    IG_STUDIO_BLOCK,
    LEONARDO_IMAGE_BLOCK,
    MEDIA_LIBRARY_BLOCK,
    NO_SALES_REPORT_SECTION,
)
from agents_app.agents.core.chat.prompts.general import SYSTEM_PROMPT_TEMPLATE
from agents_app.agents.core.chat.prompts.image_assistant import (
    DEFAULT_IMAGE_FORMAT,
    IMAGE_ASSISTANT_PROMPT_TEMPLATE,
    IMAGE_FORMAT_SPECS,
)
from agents_app.agents.core.chat.prompts.inventar import INVENTAR_ASSISTANT_PROMPT

__all__ = [
    "CHART_ANALYTICS_SECTION",
    "CHART_CATALOG_BLOCK",
    "IG_STUDIO_BLOCK",
    "IMAGE_ASSISTANT_PROMPT_TEMPLATE",
    "INVENTAR_ASSISTANT_PROMPT",
    "LEONARDO_IMAGE_BLOCK",
    "MEDIA_LIBRARY_BLOCK",
    "NO_SALES_REPORT_SECTION",
    "STORY_IMAGE_ASSISTANT_PROMPT",
    "SYSTEM_PROMPT_TEMPLATE",
    "build_system_prompt",
]


def _normalize_chat_mode(chat_mode: str | None) -> str | None:
    if chat_mode == "story_image_assistant":
        return "image_assistant"
    return chat_mode


def _image_format_prompt_fields(image_format: str | None) -> dict[str, str | int]:
    key = (image_format or "").strip().lower()
    if key not in IMAGE_FORMAT_SPECS:
        key = DEFAULT_IMAGE_FORMAT
    name, ratio, width, height = IMAGE_FORMAT_SPECS[key]
    return {
        "format_id": key,
        "format_name": name,
        "ratio_label": ratio,
        "width": width,
        "height": height,
    }


def build_system_prompt(
    *,
    ig_studio_post_image: bool = False,
    leonardo_image_generation: bool = False,
    include_chart_catalog: bool = False,
    chat_mode: str | None = None,
    image_format: str | None = None,
) -> str:
    """Return the system prompt for the chat graph, filling template placeholders only."""
    mode = _normalize_chat_mode(chat_mode)
    if mode == "image_assistant":
        fields = _image_format_prompt_fields(image_format)
        return IMAGE_ASSISTANT_PROMPT_TEMPLATE.format(**fields).rstrip() + "\n"
    if mode == "inventar":
        return INVENTAR_ASSISTANT_PROMPT.rstrip() + "\n"

    if include_chart_catalog:
        chart_section = f"{CHART_ANALYTICS_SECTION.strip()}\n\n"
        chart_catalog_block = f"{CHART_CATALOG_BLOCK.strip()}\n\n"
    else:
        chart_section = f"{NO_SALES_REPORT_SECTION.strip()}\n\n"
        chart_catalog_block = ""
    leonardo_image_block = (
        f"{LEONARDO_IMAGE_BLOCK.strip()}\n\n" if leonardo_image_generation else ""
    )
    ig_studio_block = f"{IG_STUDIO_BLOCK.strip()}\n" if ig_studio_post_image else ""
    media_library_block = f"{MEDIA_LIBRARY_BLOCK.strip()}\n\n"
    return (
        SYSTEM_PROMPT_TEMPLATE.format(
            chart_section=chart_section,
            chart_catalog_block=chart_catalog_block,
            media_library_block=media_library_block,
            leonardo_image_block=leonardo_image_block,
            ig_studio_block=ig_studio_block,
        ).rstrip()
        + "\n"
    )


# Back-compat alias for imports/tests that still reference the old name.
STORY_IMAGE_ASSISTANT_PROMPT = IMAGE_ASSISTANT_PROMPT_TEMPLATE.format(
    **_image_format_prompt_fields(DEFAULT_IMAGE_FORMAT)
)
