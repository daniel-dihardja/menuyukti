"""Validate and normalize owner quick_profile JSON."""

from graphql.domain.manual_quick_profile import (
    is_quick_profile_empty,
    validate_and_normalize_quick_profile,
)

__all__ = ["is_quick_profile_empty", "validate_and_normalize_quick_profile"]
