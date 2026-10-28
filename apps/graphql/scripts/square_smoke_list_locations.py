#!/usr/bin/env python3
"""Sandbox smoke: list Square locations with env-configured credentials.

Usage (from ``apps/graphql``)::

    PYTHONPATH=../.. uv run python scripts/square_smoke_list_locations.py

Requires repo-root ``.env`` with ``SQUARE_ENVIRONMENT`` (usually ``sandbox``) and
``SQUARE_ACCESS_TOKEN``. Does not print tokens.
"""

from __future__ import annotations

import sys
from pathlib import Path

_GRAPHQL_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _GRAPHQL_DIR.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


def main() -> int:
    from square.core.api_error import ApiError

    from graphql.env_bootstrap import load_app_env
    from graphql.services.square_client import SquareConfigError, build_square_client

    load_app_env(_GRAPHQL_DIR)

    try:
        client = build_square_client()
        response = client.locations.list()
    except SquareConfigError as exc:
        print(f"CONFIG ERROR: {exc}", file=sys.stderr)
        return 2
    except ApiError as exc:
        print(f"SQUARE API ERROR: {exc}", file=sys.stderr)
        return 1

    locations = list(response.locations or [])
    print(f"locations={len(locations)} environment_ok=1")
    for loc in locations:
        loc_id = getattr(loc, "id", None) or "?"
        name = getattr(loc, "name", None) or "(unnamed)"
        print(f"  {loc_id}\t{name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
