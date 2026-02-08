from typing import Dict, List, Tuple

from app.intelligence.models.matrix_item import MatrixItem
from app.intelligence.models.heatmap import MenuHeatmap
from app.intelligence.models.matrix_distribution import MatrixDistribution

from app.intelligence.primitives.engine.economic_engine import compute_economic_primitives
from app.intelligence.primitives.engine.behavioral_engine import (
    compute_behavioral_primitives,
)
from app.intelligence.primitives.engine.structural_engine import (
    compute_structural_primitives,
)

from app.intelligence.enrichment.enriched_menu_item import EnrichedMenuItem
from app.intelligence.enrichment.enriched_portfolio import EnrichedPortfolio

from app.intelligence.roles.role_engine import assign_roles
from app.intelligence.signals.signal_engine import detect_signals
from app.intelligence.decisions.promotion_engine import promotion_decision
from app.intelligence.decisions.promotion_candidate import PromotionCandidate


def _index_heatmaps_by_menu(
    heatmaps: List[MenuHeatmap],
) -> Dict[str, MenuHeatmap]:
    return {h.menu: h for h in heatmaps}


def build_enriched_portfolio(
    distribution: MatrixDistribution,
) -> EnrichedPortfolio:
    structural = compute_structural_primitives(distribution)
    return EnrichedPortfolio(
        distribution=distribution,
        structural=structural,
    )


def build_promotion_candidates(
    matrix_items: List[MatrixItem],
    heatmaps: List[MenuHeatmap],
    distribution: MatrixDistribution,
) -> Tuple[EnrichedPortfolio, List[PromotionCandidate]]:

    heatmap_by_menu = _index_heatmaps_by_menu(heatmaps)
    portfolio = build_enriched_portfolio(distribution)

    candidates: List[PromotionCandidate] = []

    for item in matrix_items:
        hm = heatmap_by_menu.get(item.menu)
        if not hm:
            # Behavioral intelligence is required for promotion decisions
            continue

        econ = compute_economic_primitives(item, matrix_items)
        beh = compute_behavioral_primitives(hm)

        enriched = EnrichedMenuItem(
            matrix=item,
            heatmap=hm,
            economic=econ,
            behavioral=beh,
        )

        roles = assign_roles(enriched)
        signals = detect_signals(enriched, roles)
        decision = promotion_decision(enriched, roles, signals)

        candidate = PromotionCandidate.from_intelligence(
            enriched=enriched,
            roles=roles,
            signals=signals,
            decision=decision,
        )

        candidates.append(candidate)

    # -----------------------------------------------------
    # Sort candidates for human / notebook consumption
    # -----------------------------------------------------
    # Priority:
    #   1. Decision (PROMOTE first)
    #   2. Promotion priority (CRITICAL → LOW)
    #   3. Economic impact
    # -----------------------------------------------------

    candidates.sort(
        key=lambda c: (
            c.decision_rank,
            c.priority.value,
            -c.economic_weight,
        )
    )

    return portfolio, candidates
