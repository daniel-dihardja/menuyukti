"""LangChain tool: extract dates and brand-brief context from prior milestones markdown."""

from __future__ import annotations

import json
import re
from langchain_core.tools import BaseTool, tool

_ISO_DATE_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
_DMY_DOT_RE = re.compile(r"\b\d{2}\.\d{2}\.\d{4}\b")
_DMY_SLASH_RE = re.compile(r"\b\d{2}/\d{2}/\d{4}\b")


def _extract_heading_block(markdown: str, heading: str) -> str:
    pat = re.compile(rf"(?ims)^##\s*{re.escape(heading)}\s*\n+(.*?)(?=^##\s|\Z)")
    m = pat.search(markdown)
    return m.group(1).strip() if m else ""


def _extract_first_date(text: str) -> str | None:
    for pattern in (_ISO_DATE_RE, _DMY_DOT_RE, _DMY_SLASH_RE):
        m = pattern.search(text)
        if m:
            return m.group(0)
    return None


def _extract_brand_brief_block(markdown: str) -> str:
    pat = re.compile(r"(?ims)^##\s*Brand\s*brief\s*\n+(.*?)(?=^##\s|\Z)")
    m = pat.search(markdown)
    if not m:
        return ""
    return m.group(1).strip()


def make_get_prior_campaign_context_tool() -> BaseTool:
    @tool
    def get_prior_campaign_context(prior_milestones_markdown: str) -> str:
        """Extract start/end date and brand-brief clues from prior milestone Data tabs.

        Provide the exact markdown returned by `read_prior_milestones_data`.
        Returns a compact markdown + JSON summary with detected campaign window and
        brand-brief presence.
        """
        raw = prior_milestones_markdown
        if not isinstance(raw, str) or not raw.strip():
            return (
                "No prior milestone data available.\n\n"
                "```json\n"
                + json.dumps(
                    {
                        "campaign_window_found": False,
                        "start_date": None,
                        "end_date": None,
                        "brand_brief_found": False,
                    },
                    ensure_ascii=True,
                    indent=2,
                )
                + "\n```"
            )

        start_block = _extract_heading_block(raw, "Start date")
        end_block = _extract_heading_block(raw, "End date")
        start_date = _extract_first_date(start_block) if start_block else None
        end_date = _extract_first_date(end_block) if end_block else None

        if start_date is None:
            start_date = _extract_first_date(raw)
        if end_date is None:
            # Try finding a second date as likely end date.
            all_dates: list[str] = []
            for pattern in (_ISO_DATE_RE, _DMY_DOT_RE, _DMY_SLASH_RE):
                all_dates.extend(m.group(0) for m in pattern.finditer(raw))
            if all_dates:
                start_date = start_date or all_dates[0]
                if len(all_dates) > 1:
                    end_date = all_dates[1]

        brand_brief = _extract_brand_brief_block(raw)
        if not brand_brief:
            fallback = re.search(r"(?ims)^##\s*Brand\b.*?$", raw)
            if fallback:
                brand_brief = "Brand-related milestone section exists in prior data."

        payload = {
            "campaign_window_found": bool(start_date and end_date),
            "start_date": start_date,
            "end_date": end_date,
            "brand_brief_found": bool(brand_brief),
            "brand_brief_excerpt": brand_brief[:700] if brand_brief else None,
        }

        lines = [
            "## Prior campaign context",
            f"- Start date: {start_date or 'not found'}",
            f"- End date: {end_date or 'not found'}",
            f"- Brand brief found: {'yes' if brand_brief else 'no'}",
            "",
            "```json",
            json.dumps(payload, ensure_ascii=True, indent=2),
            "```",
        ]
        return "\n".join(lines)

    return get_prior_campaign_context
