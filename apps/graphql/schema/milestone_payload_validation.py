"""Backward-compatible re-exports; prefer graphql.domain.milestone_payload."""

from graphql.domain.milestone_payload import validate_pass_criteria_list, validate_result_payload

__all__ = ["validate_pass_criteria_list", "validate_result_payload"]
