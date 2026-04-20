"""Compose promotion-candidate signals from promotion rows and Instagram signals."""

from __future__ import annotations

from typing import TypedDict

# Cap outputs so API/LLM payloads stay bounded.
_MAX_PROMOTION_SLICE = 8
_MAX_PUZZLE_SELECTED = 8


class PromotionMenuItemForCandidates(TypedDict):
    """Per-menu row used to rank promotion candidates."""

    menu: str
    quantity: int
    total_revenue: float
    menu_category: str | None
    menu_category_detail: str | None
    category: str | None
    action: str | None
    peak_day: str | None
    peak_hour: int | None
    contribution_margin_percentage: float | None


class InstagramSignalMenuItem(TypedDict):
    """Instagram signal item carrying a menu identifier."""

    menu: str


class BestPostingWindowInput(TypedDict):
    """Venue posting window hints from Instagram signals."""

    peak_day: str | None
    peak_hour: int | None
    primary_meal_period: str | None


class PromotionRankedCandidate(TypedDict):
    """Minimal ranked candidate shape for API and milestone persistence."""

    menu: str
    recommendation: str
    score: float
    quantity: int
    total_revenue: float
    signal_reasons: list[str]


class PuzzleSelectedCandidate(TypedDict):
    """Selected puzzle item with rationale and Instagram guidance."""

    menu: str
    recommendation: str
    score: float
    quantity: int
    total_revenue: float
    menu_category: str | None
    menu_category_detail: str | None
    peak_day: str | None
    peak_hour: int | None
    matrix_category: str | None
    matrix_action: str | None
    contribution_margin_pct: float | None
    signal_reasons: list[str]
    puzzle_opportunity_score: float
    why_selected: list[str]
    how_to_promote_on_instagram: list[str]


class PuzzleOpportunityPool(TypedDict):
    """Puzzle candidate pool summary and selected rows."""

    puzzle_items_found: int
    threshold: float
    selected_count: int
    selected: list[PuzzleSelectedCandidate]


class PromotionCandidatesResult(TypedDict):
    """Composed promotion candidate payload for agents and API consumers."""

    top_promote: list[PromotionRankedCandidate]
    top_avoid: list[PromotionRankedCandidate]
    puzzle_opportunity_pool: PuzzleOpportunityPool
    ranked_candidates: list[PromotionRankedCandidate]
    ranked_candidates_total_count: int
    best_posting_window: BestPostingWindowInput | None
    best_posting_window_summary: str


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    if n % 2 == 1:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / 2.0


def _score_promotion_item(
    item: PromotionMenuItemForCandidates,
    *,
    hero_menus: set[str],
    trending_menus: set[str],
    avoid_menus: set[str],
    max_quantity: int,
    max_revenue: float,
) -> tuple[float, list[str], str]:
    menu = item["menu"]
    quantity = int(item.get("quantity") or 0)
    total_revenue = float(item.get("total_revenue") or 0.0)
    matrix_category = str(item.get("category") or "").strip().lower()
    matrix_action = str(item.get("action") or "").strip().lower()

    score = 0.0
    reasons: list[str] = []

    if max_quantity > 0:
        score += (quantity / max_quantity) * 30.0
    if max_revenue > 0:
        score += (total_revenue / max_revenue) * 35.0

    if menu in hero_menus:
        score += 15.0
        reasons.append("Tagged as content hero in Instagram signals")
    if menu in trending_menus:
        score += 12.0
        reasons.append("Tagged as rising trend in Instagram signals")

    if matrix_category == "star":
        score += 10.0
        reasons.append("Menu engineering category is star")
    elif matrix_category == "puzzle":
        score += 5.0
        reasons.append("Menu engineering category is puzzle")
    elif matrix_category == "plow_horse":
        score += 3.0
        reasons.append("Menu engineering category is plow_horse")

    if matrix_action == "promote":
        score += 8.0
        reasons.append("Menu engineering action recommends promote")
    elif matrix_action == "remove":
        score -= 20.0
        reasons.append("Menu engineering action recommends remove")

    if menu in avoid_menus or matrix_category == "low_end":
        score -= 25.0
        reasons.append("Flagged as avoid or low_end")

    if score >= 55:
        recommendation = "promote"
    elif score >= 35:
        recommendation = "test"
    else:
        recommendation = "avoid"

    if not reasons:
        reasons.append("Included for full-menu coverage; no strong signal flags found")

    return round(score, 2), reasons, recommendation


def _puzzle_why(row: dict[str, object]) -> list[str]:
    bullets: list[str] = []
    qty = int(row.get("quantity") or 0)
    revenue = float(row.get("total_revenue") or 0.0)
    margin = row.get("contribution_margin_pct")
    if margin is not None:
        bullets.append(
            f"Balanced potential: qty {qty}, revenue {revenue:.2f}, margin signal {float(margin) * 100:.1f}%."
        )
    else:
        bullets.append(f"Balanced potential: qty {qty}, revenue {revenue:.2f}.")
    for reason in (row.get("signal_reasons") or [])[:2]:
        bullets.append(str(reason))
    return bullets[:3]


def _puzzle_how_to_promote(row: dict[str, object]) -> list[str]:
    menu = str(row.get("menu") or "this item")
    category = row.get("menu_category") or row.get("menu_category_detail") or "menu"
    peak_day = row.get("peak_day")
    peak_hour = row.get("peak_hour")
    timing = "near venue peak time"
    if peak_day and peak_hour is not None:
        timing = f"around {peak_day} {int(peak_hour):02d}:00"
    elif peak_day:
        timing = f"on {peak_day}"
    elif peak_hour is not None:
        timing = f"around {int(peak_hour):02d}:00"

    cta = "Try it this week and save this post for your next order."
    action = str(row.get("matrix_action") or "").lower()
    if action == "promote":
        cta = "Order now while this featured item is highlighted."
    elif action == "remove":
        cta = "Limited-time spotlight: try it before the menu refresh."

    return [
        f"Angle: position {menu} as a high-value {category} choice with clear sensory and value cues.",
        "Format: use a short Reel (prep + close-up) plus one carousel slide for price/value framing.",
        f"Timing & CTA: post {timing}; CTA: {cta}",
    ]


def _build_puzzle_pool(scored: list[dict[str, object]]) -> tuple[list[dict[str, object]], float]:
    puzzle_items = [x for x in scored if str(x.get("matrix_category") or "").lower() == "puzzle"]
    if not puzzle_items:
        return [], 0.0

    max_qty = max(int(x.get("quantity") or 0) for x in puzzle_items) or 1
    max_rev = max(float(x.get("total_revenue") or 0.0) for x in puzzle_items) or 1.0
    max_margin = max(float(x.get("contribution_margin_pct") or 0.0) for x in puzzle_items) or 1.0

    for row in puzzle_items:
        qty_norm = float(row.get("quantity") or 0) / max_qty
        rev_norm = float(row.get("total_revenue") or 0.0) / max_rev
        margin_norm = float(row.get("contribution_margin_pct") or 0.0) / max_margin

        modifier = 0.0
        reasons = row.get("signal_reasons") or []
        if any("rising trend" in str(r).lower() for r in reasons):
            modifier += 0.08
        if any("content hero" in str(r).lower() for r in reasons):
            modifier += 0.05
        if str(row.get("matrix_action") or "").lower() == "promote":
            modifier += 0.08
        if str(row.get("matrix_action") or "").lower() == "remove":
            modifier -= 0.20
        if str(row.get("recommendation") or "").lower() == "avoid":
            modifier -= 0.12

        puzzle_score = ((qty_norm * 0.35) + (rev_norm * 0.35) + (margin_norm * 0.20) + modifier) * 100
        row["puzzle_opportunity_score"] = round(puzzle_score, 2)

    scores = [float(x["puzzle_opportunity_score"]) for x in puzzle_items]
    threshold = _median(scores)
    selected = [x for x in puzzle_items if float(x["puzzle_opportunity_score"]) >= threshold]

    if not selected:
        selected = sorted(
            puzzle_items,
            key=lambda x: float(x["puzzle_opportunity_score"]),
            reverse=True,
        )[:1]

    if len(selected) > _MAX_PUZZLE_SELECTED:
        raised_threshold = threshold + 5.0
        raised = [x for x in selected if float(x["puzzle_opportunity_score"]) >= raised_threshold]
        selected = raised if raised else selected
        if len(selected) > _MAX_PUZZLE_SELECTED:
            selected = sorted(
                selected,
                key=lambda x: float(x["puzzle_opportunity_score"]),
                reverse=True,
            )[:_MAX_PUZZLE_SELECTED]

    selected.sort(
        key=lambda x: (
            -float(x["puzzle_opportunity_score"]),
            -int(x.get("quantity") or 0),
            str(x["menu"]),
        )
    )
    return selected, round(threshold, 2)


def _posting_window_summary(posting: BestPostingWindowInput | None) -> str:
    if posting is None:
        return "not available"
    parts: list[str] = []
    if posting.get("peak_day"):
        parts.append(f"peak day: {posting.get('peak_day')}")
    if posting.get("peak_hour") is not None:
        parts.append(f"peak hour: {posting.get('peak_hour')}:00")
    if posting.get("primary_meal_period"):
        parts.append(f"primary meal period: {posting.get('primary_meal_period')}")
    return ", ".join(parts) if parts else "not available"


def _ranked_minimal(row: dict[str, object]) -> PromotionRankedCandidate:
    return PromotionRankedCandidate(
        menu=str(row.get("menu") or ""),
        recommendation=str(row.get("recommendation") or ""),
        score=float(row.get("score") or 0.0),
        quantity=int(row.get("quantity") or 0),
        total_revenue=float(row.get("total_revenue") or 0.0),
        signal_reasons=[str(r) for r in (row.get("signal_reasons") or [])],
    )


def calculate_promotion_candidates(
    *,
    promotion_menu_items: list[PromotionMenuItemForCandidates],
    content_heroes: list[InstagramSignalMenuItem],
    trending_items: list[InstagramSignalMenuItem],
    avoid_items: list[InstagramSignalMenuItem],
    best_posting_window: BestPostingWindowInput | None,
) -> PromotionCandidatesResult:
    """Rank promotion candidates and build puzzle opportunity signals."""
    valid_items = [x for x in promotion_menu_items if isinstance(x.get("menu"), str) and x.get("menu")]
    if not valid_items:
        return PromotionCandidatesResult(
            top_promote=[],
            top_avoid=[],
            puzzle_opportunity_pool=PuzzleOpportunityPool(
                puzzle_items_found=0,
                threshold=0.0,
                selected_count=0,
                selected=[],
            ),
            ranked_candidates=[],
            ranked_candidates_total_count=0,
            best_posting_window=best_posting_window,
            best_posting_window_summary=_posting_window_summary(best_posting_window),
        )

    hero_menus = {str(x["menu"]) for x in content_heroes if isinstance(x.get("menu"), str) and x.get("menu")}
    trending_menus = {
        str(x["menu"]) for x in trending_items if isinstance(x.get("menu"), str) and x.get("menu")
    }
    avoid_menus = {str(x["menu"]) for x in avoid_items if isinstance(x.get("menu"), str) and x.get("menu")}

    max_quantity = max(int(x.get("quantity") or 0) for x in valid_items)
    max_revenue = max(float(x.get("total_revenue") or 0.0) for x in valid_items)

    scored: list[dict[str, object]] = []
    for item in valid_items:
        score, reasons, recommendation = _score_promotion_item(
            item,
            hero_menus=hero_menus,
            trending_menus=trending_menus,
            avoid_menus=avoid_menus,
            max_quantity=max_quantity,
            max_revenue=max_revenue,
        )
        scored.append(
            {
                "menu": item["menu"],
                "recommendation": recommendation,
                "score": score,
                "quantity": int(item.get("quantity") or 0),
                "total_revenue": float(item.get("total_revenue") or 0.0),
                "menu_category": item.get("menu_category"),
                "menu_category_detail": item.get("menu_category_detail"),
                "peak_day": item.get("peak_day"),
                "peak_hour": item.get("peak_hour"),
                "matrix_category": item.get("category"),
                "matrix_action": item.get("action"),
                "contribution_margin_pct": item.get("contribution_margin_percentage"),
                "signal_reasons": reasons,
            }
        )

    scored.sort(key=lambda row: (-float(row["score"]), -int(row["quantity"]), str(row["menu"])))

    top_promote = [_ranked_minimal(x) for x in scored if x["recommendation"] == "promote"][:_MAX_PROMOTION_SLICE]
    top_avoid = [_ranked_minimal(x) for x in scored if x["recommendation"] == "avoid"][:_MAX_PROMOTION_SLICE]
    ranked_candidates = [_ranked_minimal(x) for x in scored]

    selected_puzzles, puzzle_threshold = _build_puzzle_pool(scored)
    selected_payload: list[PuzzleSelectedCandidate] = []
    for row in selected_puzzles:
        selected_payload.append(
            PuzzleSelectedCandidate(
                menu=str(row.get("menu") or ""),
                recommendation=str(row.get("recommendation") or ""),
                score=float(row.get("score") or 0.0),
                quantity=int(row.get("quantity") or 0),
                total_revenue=float(row.get("total_revenue") or 0.0),
                menu_category=(row.get("menu_category") if isinstance(row.get("menu_category"), str) else None),
                menu_category_detail=(
                    row.get("menu_category_detail")
                    if isinstance(row.get("menu_category_detail"), str)
                    else None
                ),
                peak_day=(row.get("peak_day") if isinstance(row.get("peak_day"), str) else None),
                peak_hour=(row.get("peak_hour") if isinstance(row.get("peak_hour"), int) else None),
                matrix_category=(
                    row.get("matrix_category") if isinstance(row.get("matrix_category"), str) else None
                ),
                matrix_action=(row.get("matrix_action") if isinstance(row.get("matrix_action"), str) else None),
                contribution_margin_pct=(
                    float(row["contribution_margin_pct"])
                    if isinstance(row.get("contribution_margin_pct"), (int, float))
                    else None
                ),
                signal_reasons=[str(r) for r in (row.get("signal_reasons") or [])],
                puzzle_opportunity_score=float(row.get("puzzle_opportunity_score") or 0.0),
                why_selected=_puzzle_why(row),
                how_to_promote_on_instagram=_puzzle_how_to_promote(row),
            )
        )

    puzzle_items_count = len(
        [x for x in scored if str(x.get("matrix_category") or "").lower() == "puzzle"]
    )
    return PromotionCandidatesResult(
        top_promote=top_promote,
        top_avoid=top_avoid,
        puzzle_opportunity_pool=PuzzleOpportunityPool(
            puzzle_items_found=puzzle_items_count,
            threshold=puzzle_threshold,
            selected_count=len(selected_payload),
            selected=selected_payload,
        ),
        ranked_candidates=ranked_candidates,
        ranked_candidates_total_count=len(ranked_candidates),
        best_posting_window=best_posting_window,
        best_posting_window_summary=_posting_window_summary(best_posting_window),
    )

