from pydantic import BaseModel
from intelligence.models.matrix_distribution import MatrixDistribution
from intelligence.primitives.structural_primitives import StructuralPrimitives


class EnrichedPortfolio(BaseModel):
    """
    Structural economic snapshot of the restaurant.

    Enables agents to reason about:

        - profit concentration
        - diversification
        - dependency risk
    """

    distribution: MatrixDistribution
    structural: StructuralPrimitives

    class Config:
        frozen = True
