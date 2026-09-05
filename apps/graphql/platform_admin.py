"""Platform admin allowlist for global (non-tenant) GraphQL mutations.

GraphQL trusts ``X-User-Id`` after the internal API key gate and does not call Clerk.
Platform-admin checks therefore use ``MENUYUKTI_ADMIN_USER_IDS`` (comma-separated
Clerk user ids). Keep this list aligned with users who have
``publicMetadata.menuyuktiRole = "admin"`` in Clerk.
"""

from __future__ import annotations

import os
from functools import lru_cache


@lru_cache(maxsize=1)
def platform_admin_user_ids() -> frozenset[str]:
    """Clerk user ids allowed to mutate global platform config (e.g. image AI flows)."""
    raw = os.environ.get("MENUYUKTI_ADMIN_USER_IDS", "")
    return frozenset(part.strip() for part in raw.split(",") if part.strip())


def clear_platform_admin_cache() -> None:
    """Test helper: reset cached allowlist after env changes."""
    platform_admin_user_ids.cache_clear()


def is_platform_admin(user_id: str) -> bool:
    if not user_id:
        return False
    return user_id in platform_admin_user_ids()


def require_platform_admin(user_id: str) -> None:
    """Raise ``PermissionError`` when the caller is not on the platform admin allowlist."""
    if not is_platform_admin(user_id):
        raise PermissionError("Access denied")
