"""Cap total field selections per operation (complements depth and token limits)."""

from __future__ import annotations

from graphql import GraphQLError
from graphql.language.ast import FieldNode
from graphql.validation.rules import ValidationRule
from graphql.validation.validation_context import ValidationContext


def create_max_field_selections_rule(max_selections: int) -> type[ValidationRule]:
    """Return a ValidationRule class that rejects documents with too many Field selections."""

    class MaxFieldSelectionsRule(ValidationRule):
        def __init__(self, context: ValidationContext) -> None:
            super().__init__(context)
            self._count = 0

        def enter_field(self, node: FieldNode, *_args: object) -> None:
            if node.name.value.startswith("__"):
                return None
            self._count += 1
            if self._count > max_selections:
                self.context.report_error(
                    GraphQLError(
                        f"Query exceeds maximum of {max_selections} field selections",
                        [node],
                    )
                )
            return None

    return MaxFieldSelectionsRule
