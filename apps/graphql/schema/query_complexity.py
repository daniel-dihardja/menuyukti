"""Weight expensive root fields higher than scalar selections."""

from __future__ import annotations

from graphql import GraphQLError
from graphql.language.ast import FieldNode
from graphql.validation.rules import ValidationRule
from graphql.validation.validation_context import ValidationContext

# Root fields that trigger full OrderFact loads or heavy compute.
_HEAVY_ROOT_FIELDS: dict[str, int] = {
    "analyticsBundle": 40,
    "instagramSignals": 35,
    "latestAnalyticsRunWithSignals": 35,
    "menuHeatmaps": 25,
    "menuEngineeringMatrix": 25,
    "menuCombos": 25,
    "orderMetrics": 20,
    "categoryMix": 20,
    "revenueTrends": 20,
    "operatingProfile": 20,
    "promotionMenuItems": 20,
    "promotionEngineeringCandidates": 20,
    "slotMenuCandidates": 30,
    "weeklyDemandPattern": 15,
    "workflowCampaignTree": 15,
}

_DEFAULT_FIELD_COST = 1


def create_query_complexity_rule(maximum_complexity: int) -> type[ValidationRule]:
    """Return a ValidationRule that sums weighted field costs per operation."""

    class QueryComplexityRule(ValidationRule):
        def __init__(self, context: ValidationContext) -> None:
            super().__init__(context)
            self._cost = 0
            self._in_root = True

        def enter_field(self, node: FieldNode, *_args: object) -> None:
            if node.name.value.startswith("__"):
                return None
            name = node.name.value
            if self._in_root:
                self._cost += _HEAVY_ROOT_FIELDS.get(name, _DEFAULT_FIELD_COST)
                self._in_root = False
            else:
                self._cost += _DEFAULT_FIELD_COST
            if self._cost > maximum_complexity:
                self.context.report_error(
                    GraphQLError(
                        f"Query complexity {self._cost} exceeds maximum {maximum_complexity}",
                        [node],
                    )
                )
            return None

        def leave_field(self, node: FieldNode, *_args: object) -> None:
            if not node.name.value.startswith("__"):
                self._in_root = True
            return None

    return QueryComplexityRule
