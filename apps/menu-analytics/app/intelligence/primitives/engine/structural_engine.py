from app.intelligence.models.matrix_distribution import MatrixDistribution
from app.intelligence.primitives.structural_primitives import StructuralPrimitives


def compute_structural_primitives(
    distribution: MatrixDistribution,
) -> StructuralPrimitives:
    """
    Converts matrix distribution into portfolio-level intelligence.

    Structural primitives describe the ECONOMIC SHAPE
    of the restaurant — not individual items.

    This layer is critical for:
        - executive insights
        - risk detection
        - portfolio strategy
        - future AI agents
    """

    # -------------------------------------------------
    # Extract category shares safely
    # -------------------------------------------------

    categories = {c.category: c for c in distribution.categories}

    star_margin = categories.get("star", None)
    low = categories.get("low_end", None)
    puzzle = categories.get("puzzle", None)
    plow = categories.get("plow_horse", None)

    star_margin_share = star_margin.margin_share if star_margin else 0.0
    low_end_share = low.item_share if low else 0.0
    puzzle_profit_share = puzzle.margin_share if puzzle else 0.0
    plow_profit_share = plow.margin_share if plow else 0.0

    # -------------------------------------------------
    # Profit Concentration
    # -------------------------------------------------
    # Higher means more fragile business.
    #
    # Example:
    # 70% profit from stars → VERY risky
    # -------------------------------------------------

    profit_concentration = star_margin_share

    # -------------------------------------------------
    # Diversification Score
    # -------------------------------------------------
    # Inverse of concentration.
    #
    # Simple and extremely explainable.
    # -------------------------------------------------

    diversification_score = max(0.0, 1.0 - profit_concentration)

    # -------------------------------------------------
    # Structural Health
    # -------------------------------------------------
    # Composite snapshot.
    #
    # Intuition:
    # - diversified profit is good
    # - puzzle margin is latent upside
    # - excessive low-end is bad
    # -------------------------------------------------

    structural_health = (
        diversification_score * 0.5
        + puzzle_profit_share * 0.3
        + (1 - low_end_share) * 0.2
    )

    structural_health = max(0.0, min(structural_health, 1.0))

    return StructuralPrimitives(
        profit_concentration=profit_concentration,
        diversification_score=diversification_score,
        star_margin_share=star_margin_share,
        low_end_share=low_end_share,
        puzzle_profit_share=puzzle_profit_share,
        structural_health=structural_health,
    )
