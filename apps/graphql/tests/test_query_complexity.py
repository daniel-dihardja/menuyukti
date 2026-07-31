"""Tests for query complexity and depth validation rules."""

from graphql.language import parse
from graphql.schema import schema
from graphql.schema.query_complexity import create_query_complexity_rule
from graphql.validation import validate


def test_complexity_rule_rejects_when_over_budget():
    rule = create_query_complexity_rule(maximum_complexity=5)
    document = parse(
        """
        query {
          analyticsBundle(analyticsRunId: "1") { analyticsRunId }
          menuHeatmaps(analyticsRunId: "1") { menu }
          menuCombos(analyticsRunId: "1") { analyticsRunId }
        }
        """
    )
    errors = validate(schema._schema, document, [rule])
    assert errors
    assert "exceeds maximum" in errors[0].message


def test_complexity_rule_allows_cheap_query():
    rule = create_query_complexity_rule(maximum_complexity=100)
    document = parse(
        """
        query {
          styles(first: 10) { id name }
        }
        """
    )
    errors = validate(schema._schema, document, [rule])
    assert errors == []


def test_complexity_nested_siblings_not_treated_as_root():
    """Nested fields must not re-apply heavy root weights (depth stack)."""
    rule = create_query_complexity_rule(maximum_complexity=50)
    # locations costs 1 * multiplier; nested scalars cost 1 each — must stay under 50.
    document = parse(
        """
        query {
          locations(first: 10) {
            id
            name
            manualBriefInput { locationId }
          }
        }
        """
    )
    errors = validate(schema._schema, document, [rule])
    assert errors == []
