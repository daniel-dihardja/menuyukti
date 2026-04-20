"""GraphQL types and resolver for promotionCandidatesSignals."""

from datetime import date

import strawberry

from graphql.data_sources import SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.promotion_candidates import build_promotion_candidates_signals


@strawberry.type
class PromotionRankedCandidateType:
    menu: str
    recommendation: str
    score: float
    quantity: int
    total_revenue: float
    signal_reasons: list[str]


@strawberry.type
class PromotionPuzzleSelectedType:
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


@strawberry.type
class PromotionPuzzleOpportunityPoolType:
    puzzle_items_found: int
    threshold: float
    selected_count: int
    selected: list[PromotionPuzzleSelectedType]


@strawberry.type
class PromotionBestPostingWindowType:
    peak_day: str | None
    peak_hour: int | None
    primary_meal_period: str | None


@strawberry.type
class PromotionCandidatesSignalsType:
    analytics_run_id: strawberry.ID
    period_start: date | None
    period_end: date | None
    items_total_count: int
    items_truncated: bool
    top_promote: list[PromotionRankedCandidateType]
    top_avoid: list[PromotionRankedCandidateType]
    puzzle_opportunity_pool: PromotionPuzzleOpportunityPoolType
    ranked_candidates: list[PromotionRankedCandidateType]
    ranked_candidates_total_count: int
    best_posting_window: PromotionBestPostingWindowType | None
    best_posting_window_summary: str


def _ranked_candidate(row: dict) -> PromotionRankedCandidateType:
    return PromotionRankedCandidateType(
        menu=str(row["menu"]),
        recommendation=str(row["recommendation"]),
        score=float(row["score"]),
        quantity=int(row["quantity"]),
        total_revenue=float(row["total_revenue"]),
        signal_reasons=[str(x) for x in row.get("signal_reasons", [])],
    )


def _selected_puzzle(row: dict) -> PromotionPuzzleSelectedType:
    return PromotionPuzzleSelectedType(
        menu=str(row["menu"]),
        recommendation=str(row["recommendation"]),
        score=float(row["score"]),
        quantity=int(row["quantity"]),
        total_revenue=float(row["total_revenue"]),
        menu_category=row.get("menu_category") if isinstance(row.get("menu_category"), str) else None,
        menu_category_detail=(
            row.get("menu_category_detail") if isinstance(row.get("menu_category_detail"), str) else None
        ),
        peak_day=row.get("peak_day") if isinstance(row.get("peak_day"), str) else None,
        peak_hour=row.get("peak_hour") if isinstance(row.get("peak_hour"), int) else None,
        matrix_category=(
            row.get("matrix_category") if isinstance(row.get("matrix_category"), str) else None
        ),
        matrix_action=row.get("matrix_action") if isinstance(row.get("matrix_action"), str) else None,
        contribution_margin_pct=(
            float(row["contribution_margin_pct"])
            if isinstance(row.get("contribution_margin_pct"), (int, float))
            else None
        ),
        signal_reasons=[str(x) for x in row.get("signal_reasons", [])],
        puzzle_opportunity_score=float(row["puzzle_opportunity_score"]),
        why_selected=[str(x) for x in row.get("why_selected", [])],
        how_to_promote_on_instagram=[str(x) for x in row.get("how_to_promote_on_instagram", [])],
    )


@strawberry.type
class PromotionCandidatesSignalsQuery:
    @strawberry.field(
        description=(
            "Promotion-candidate signals composed from promotion menu items and Instagram signals. "
            "Returns ranked recommendations plus puzzle opportunity pool for campaign drafting."
        )
    )
    def promotion_candidates_signals(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
    ) -> PromotionCandidatesSignalsType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None

            raw = build_promotion_candidates_signals(session, run)
            if raw is None:
                return None

            posting = raw.get("best_posting_window")
            posting_window = None
            if isinstance(posting, dict):
                posting_window = PromotionBestPostingWindowType(
                    peak_day=posting.get("peak_day") if isinstance(posting.get("peak_day"), str) else None,
                    peak_hour=(
                        posting.get("peak_hour") if isinstance(posting.get("peak_hour"), int) else None
                    ),
                    primary_meal_period=(
                        posting.get("primary_meal_period")
                        if isinstance(posting.get("primary_meal_period"), str)
                        else None
                    ),
                )

            pool = raw["puzzle_opportunity_pool"]
            return PromotionCandidatesSignalsType(
                analytics_run_id=strawberry.ID(str(run.id)),
                period_start=run.period_start,
                period_end=run.period_end,
                items_total_count=int(raw.get("items_total_count") or 0),
                items_truncated=bool(raw.get("items_truncated") or False),
                top_promote=[_ranked_candidate(x) for x in raw.get("top_promote", [])],
                top_avoid=[_ranked_candidate(x) for x in raw.get("top_avoid", [])],
                puzzle_opportunity_pool=PromotionPuzzleOpportunityPoolType(
                    puzzle_items_found=int(pool.get("puzzle_items_found") or 0),
                    threshold=float(pool.get("threshold") or 0.0),
                    selected_count=int(pool.get("selected_count") or 0),
                    selected=[_selected_puzzle(x) for x in pool.get("selected", [])],
                ),
                ranked_candidates=[_ranked_candidate(x) for x in raw.get("ranked_candidates", [])],
                ranked_candidates_total_count=int(raw.get("ranked_candidates_total_count") or 0),
                best_posting_window=posting_window,
                best_posting_window_summary=str(raw.get("best_posting_window_summary") or "not available"),
            )

