"""LangChain tool: fetch composed promotion candidate signals."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import fetch_location_operating_signals
from langchain_core.tools import BaseTool, tool

_MAX_RANKED_CANDIDATES_IN_TOOL = 30
_MAX_SIGNAL_REASONS_PER_ROW = 3
_MAX_SIGNAL_REASON_CHARS = 96
_JSON_SEPARATORS = (",", ":")


def _slim_signal_reasons(reasons: Any) -> list[str]:
    if not isinstance(reasons, list):
        return []
    out: list[str] = []
    for raw in reasons[:_MAX_SIGNAL_REASONS_PER_ROW]:
        s = str(raw).strip()
        if not s:
            continue
        if len(s) > _MAX_SIGNAL_REASON_CHARS:
            s = s[: _MAX_SIGNAL_REASON_CHARS - 1] + "…"
        out.append(s)
    return out


def _slim_ranked_export_row(row: dict[str, Any]) -> dict[str, Any]:
    """Minimal row shape aligned with web promotionRankedCandidateSchema."""
    return {
        "menu": str(row.get("menu") or ""),
        "recommendation": str(row.get("recommendation") or ""),
        "score": float(row.get("score") or 0.0),
        "quantity": int(row.get("quantity") or 0),
        "totalRevenue": float(row.get("totalRevenue") or 0.0),
        "signalReasons": _slim_signal_reasons(row.get("signalReasons")),
    }


def _slim_selected_puzzle(row: dict[str, Any]) -> dict[str, Any]:
    compact = dict(row)
    compact["signalReasons"] = _slim_signal_reasons(row.get("signalReasons"))
    return compact


def make_get_promotion_candidates_tool(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> BaseTool:
    @tool
    async def get_promotion_candidates() -> str:
        """Return ranked promotion signals from the latest analytics run as JSON text.

        Uses GraphQL promotionCandidatesSignals (computed in shared analytics package).
        The payload includes reporting period, posting window hints, top promote/avoid
        slices, puzzle pool selections, and ranked candidates.
        """
        signals = await fetch_location_operating_signals(location_id, user_id, client=client)
        run = signals.get("analytics_run")
        composed = signals.get("promotion_candidates_signals")
        promotion = signals.get("promotion_menu_items")

        if run is None:
            return "No analytics run found for this location. Promotion candidate signals are unavailable."
        if not isinstance(composed, dict):
            return "Promotion candidates are unavailable for the latest analytics run."

        period_start = promotion.get("periodStart") if isinstance(promotion, dict) else None
        period_end = promotion.get("periodEnd") if isinstance(promotion, dict) else None
        if not isinstance(period_start, str):
            period_start = None
        if not isinstance(period_end, str):
            period_end = None

        ranked_raw = composed.get("rankedCandidates")
        if not isinstance(ranked_raw, list):
            return "Promotion candidates are unavailable for the latest analytics run."
        ranked_clean = [row for row in ranked_raw if isinstance(row, dict)]

        total_ranked_raw = composed.get("rankedCandidatesTotalCount")
        total_ranked = (
            int(total_ranked_raw) if isinstance(total_ranked_raw, int) else len(ranked_clean)
        )
        ranked_slice = (
            ranked_clean
            if len(ranked_clean) <= _MAX_RANKED_CANDIDATES_IN_TOOL
            else ranked_clean[:_MAX_RANKED_CANDIDATES_IN_TOOL]
        )
        ranked_export = [_slim_ranked_export_row(r) for r in ranked_slice]

        top_promote_raw = composed.get("topPromote")
        top_avoid_raw = composed.get("topAvoid")
        top_promote = (
            [_slim_ranked_export_row(x) for x in top_promote_raw if isinstance(x, dict)]
            if isinstance(top_promote_raw, list)
            else []
        )
        top_avoid = (
            [_slim_ranked_export_row(x) for x in top_avoid_raw if isinstance(x, dict)]
            if isinstance(top_avoid_raw, list)
            else []
        )

        pool_raw = composed.get("puzzleOpportunityPool")
        if isinstance(pool_raw, dict):
            selected = pool_raw.get("selected")
            selected_payload = (
                [_slim_selected_puzzle(x) for x in selected if isinstance(x, dict)]
                if isinstance(selected, list)
                else []
            )
            puzzle_pool: dict[str, Any] = {
                "puzzleItemsFound": int(pool_raw.get("puzzleItemsFound") or 0),
                "threshold": float(pool_raw.get("threshold") or 0.0),
                "selectedCount": int(pool_raw.get("selectedCount") or len(selected_payload)),
                "selected": selected_payload,
            }
        else:
            puzzle_pool = {
                "puzzleItemsFound": 0,
                "threshold": 0.0,
                "selectedCount": 0,
                "selected": [],
            }

        posting = composed.get("bestPostingWindow")
        payload: dict[str, Any] = {
            "analyticsRun": {"id": run.get("id"), "name": run.get("name")},
            "reportingPeriod": {"start": period_start, "end": period_end},
            "bestPostingWindow": posting if isinstance(posting, dict) else None,
            "bestPostingWindowSummary": str(
                composed.get("bestPostingWindowSummary") or "not available"
            ),
            "totals": {"menuItemsEvaluated": int(composed.get("itemsTotalCount") or total_ranked)},
            "topPromote": top_promote,
            "topAvoid": top_avoid,
            "puzzleOpportunityPool": puzzle_pool,
            "rankedCandidates": ranked_export,
            "rankedCandidatesTotalCount": total_ranked,
            "rankedCandidatesTruncated": total_ranked > len(ranked_export)
            or bool(composed.get("itemsTruncated")),
        }
        return json.dumps(payload, ensure_ascii=False, separators=_JSON_SEPARATORS)

    return get_promotion_candidates
