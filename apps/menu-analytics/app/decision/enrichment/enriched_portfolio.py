from pydantic import BaseModel, ConfigDict
from app.decision.models.matrix_distribution import MatrixDistribution
from app.decision.primitives.structural_primitives import StructuralPrimitives


class EnrichedPortfolio(BaseModel):
    model_config = ConfigDict(frozen=True)
    """
    Structural economic snapshot of the restaurant.

    Enables agents to reason about:

        - profit concentration
        - diversification
        - dependency risk
    """

    distribution: MatrixDistribution
    structural: StructuralPrimitives
