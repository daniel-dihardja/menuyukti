"""Weight expensive root fields higher than scalar selections."""

from __future__ import annotations

from graphql import GraphQLError
from graphql.language.ast import ArgumentNode, FieldNode, IntValueNode, VariableNode
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.validation.rules import ValidationRule
from graphql.validation.validation_context import ValidationContext

# Root fields that trigger full OrderFact loads or heavy compute.
_HEAVY_ROOT_FIELDS: dict[str, int] = {
    "analyticsBundle": 40,
    "instagramSignals": 35,
    "menuHeatmaps": 25,
    "menuEngineeringMatrix": 25,
    "menuCombos": 25,
    "orderMetrics": 20,
    "categoryMix": 20,
    "revenueTrends": 20,
    "operatingProfile": 20,
    "promotionMenuItems": 20,
}

_DEFAULT_FIELD_COST = 1
_LIST_ROOT_FIELDS = frozenset(
    {
        "locations",
        "posts",
        "styles",
        "crmApps",
        "crmCustomers",
        "mediaCollections",
        "mediaAssets",
        "analyticsRuns",
        "workspaceMembers",
    }
)


def _argument_int(node: FieldNode, name: str) -> int | None:
    for arg in node.arguments or ():
        if not isinstance(arg, ArgumentNode) or arg.name.value != name:
            continue
        value = arg.value
        if isinstance(value, IntValueNode):
            try:
                return int(value.value)
            except ValueError:
                return None
        if isinstance(value, VariableNode):
            # Variables are unknown at validation time; use default list size.
            return DEFAULT_LIST_FIRST
    return None


def create_query_complexity_rule(maximum_complexity: int) -> type[ValidationRule]:
    """Return a ValidationRule that sums weighted field costs per operation."""

    class QueryComplexityRule(ValidationRule):
        def __init__(self, context: ValidationContext) -> None:
            super().__init__(context)
            self._cost = 0
            self._depth = 0

        def enter_field(self, node: FieldNode, *_args: object) -> None:
            if node.name.value.startswith("__"):
                return None
            name = node.name.value
            if self._depth == 0:
                base = _HEAVY_ROOT_FIELDS.get(name, _DEFAULT_FIELD_COST)
                if name in _LIST_ROOT_FIELDS:
                    first = _argument_int(node, "first")
                    page = clamp_page_size(
                        first, default=DEFAULT_LIST_FIRST, maximum=MAX_LIST_FIRST
                    )
                    # Cap multiplier so large pages don't explode cost unexpectedly.
                    multiplier = max(1, min(page // 25, 12))
                    self._cost += base * multiplier
                else:
                    self._cost += base
            else:
                self._cost += _DEFAULT_FIELD_COST
            self._depth += 1
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
                self._depth = max(0, self._depth - 1)
            return None

    return QueryComplexityRule
