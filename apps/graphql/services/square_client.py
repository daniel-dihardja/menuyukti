"""Square API client helpers (sandbox smoke + future OAuth-backed sync).

Uses the official ``squareup`` SDK. Product OAuth token storage is TASK-9.2;
this module supports sandbox access-token smoke calls first.
"""

from __future__ import annotations

import os

from square import Square
from square.environment import SquareEnvironment


class SquareConfigError(RuntimeError):
    """Raised when Square env is missing or invalid for the requested client."""


def square_environment_from_env() -> SquareEnvironment:
    raw = (os.environ.get("SQUARE_ENVIRONMENT") or "sandbox").strip().lower()
    if raw == "sandbox":
        return SquareEnvironment.SANDBOX
    if raw == "production":
        return SquareEnvironment.PRODUCTION
    raise SquareConfigError(
        f"SQUARE_ENVIRONMENT must be 'sandbox' or 'production', got {raw!r}"
    )


def build_square_client(*, access_token: str | None = None) -> Square:
    """Build a Square client for the configured environment.

    Token resolution order:
    1. Explicit ``access_token`` argument (future per-workspace OAuth tokens)
    2. ``SQUARE_ACCESS_TOKEN`` env (sandbox spike / smoke only)
    """
    token = (access_token or os.environ.get("SQUARE_ACCESS_TOKEN") or "").strip()
    if not token:
        raise SquareConfigError(
            "Square access token missing. Set SQUARE_ACCESS_TOKEN for sandbox smoke, "
            "or pass access_token= (OAuth tokens after TASK-9.2)."
        )
    return Square(token=token, environment=square_environment_from_env())
