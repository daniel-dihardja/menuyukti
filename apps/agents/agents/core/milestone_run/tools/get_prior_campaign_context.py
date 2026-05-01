"""LangChain tool: extract dates and brand-brief context from prior milestone data."""

from __future__ import annotations

import json
import re
from typing import Any

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
        venue_snapshot_pat = re.compile(
            r"(?ims)^##\s*Venue\s*snapshot\s*\n+(.*?)(?=^##\s|\Z)"
        )
        venue_match = venue_snapshot_pat.search(markdown)
        if venue_match:
            return venue_match.group(0).strip()
        return ""
    return m.group(1).strip()


def _is_brand_brief_dict(data: dict[str, Any]) -> bool:
    vs = data.get("venueSnapshot")
    return bool(
        isinstance(vs, dict)
        and isinstance(data.get("contentPillars"), list)
        and isinstance(data.get("audienceHypotheses"), list)
        and isinstance(data.get("proofOrientedAngles"), list)
        and isinstance(data.get("toneGuardrails"), list)
    )


def is_brand_brief_milestone_data(data: dict[str, Any]) -> bool:
    """True if ``data`` matches saved ``restaurant_brand_brief`` milestonedata shape."""
    return _is_brand_brief_dict(data)


def _brand_brief_excerpt_from_dict(data: dict[str, Any]) -> str:
    try:
        return json.dumps(data, ensure_ascii=False, indent=2)
    except (TypeError, ValueError):
        return ""


def _extract_from_prior_json_rows(rows: list[Any]) -> tuple[str | None, str | None, str]:
    """Return (start_date, end_date, brand_brief_excerpt) from prior payload rows."""
    start_date: str | None = None
    end_date: str | None = None
    brand_excerpt = ""

    for row in rows:
        if not isinstance(row, dict):
            continue
        data = row.get("data")
        if isinstance(data, dict):
            sd = data.get("startDate")
            ed = data.get("endDate")
            ph = data.get("publicHolidays")
            if (
                start_date is None
                and isinstance(sd, str)
                and sd.strip()
                and isinstance(ed, str)
                and ed.strip()
                and isinstance(ph, list)
            ):
                start_date = sd.strip()
                end_date = ed.strip()
            if _is_brand_brief_dict(data):
                excerpt = _brand_brief_excerpt_from_dict(data)
                if excerpt and (not brand_excerpt or len(excerpt) > len(brand_excerpt)):
                    brand_excerpt = excerpt
        elif isinstance(data, str) and data.strip():
            blob = data
            sd = _extract_first_date(blob)
            if sd and start_date is None:
                start_date = sd
            all_dates: list[str] = []
            for pattern in (_ISO_DATE_RE, _DMY_DOT_RE, _DMY_SLASH_RE):
                all_dates.extend(m.group(0) for m in pattern.finditer(blob))
            if len(all_dates) > 1 and end_date is None:
                end_date = all_dates[1]
            elif len(all_dates) == 1 and start_date == all_dates[0] and end_date is None:
                end_date = None
            bb = _extract_brand_brief_block(blob)
            if bb and not brand_excerpt:
                brand_excerpt = bb

    return start_date, end_date, brand_excerpt


def _context_from_legacy_markdown(raw: str) -> tuple[str | None, str | None, str]:
    start_block = _extract_heading_block(raw, "Start date")
    end_block = _extract_heading_block(raw, "End date")
    start_date = _extract_first_date(start_block) if start_block else None
    end_date = _extract_first_date(end_block) if end_block else None

    if start_date is None:
        start_date = _extract_first_date(raw)
    if end_date is None:
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

    return start_date, end_date, brand_brief


def make_get_prior_campaign_context_tool() -> BaseTool:
    @tool
    def get_prior_campaign_context(prior_milestones_json: str) -> str:
        """Extract start/end date and brand-brief clues from prior milestones' data (JSON).

        Pass the exact string returned by ``read_prior_milestones_data`` (a JSON array of
        ``{\"title\", \"data\"}`` objects). Returns a short markdown summary plus a JSON block
        with ``campaign_window_found``, ``start_date``, ``end_date``, ``brand_brief_found``, and
        optional ``brand_brief_excerpt``.
        """
        raw = prior_milestones_json
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

        start_date: str | None = None
        end_date: str | None = None
        brand_brief = ""

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = None

        if isinstance(parsed, list):
            start_date, end_date, brand_brief = _extract_from_prior_json_rows(parsed)
        if start_date is None and end_date is None and not brand_brief:
            start_date, end_date, brand_brief = _context_from_legacy_markdown(raw)

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
