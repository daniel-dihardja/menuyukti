"""Business logic layer (separate from Strawberry resolvers).

Package ``__init__`` uses lazy exports so importing a submodule does not load every service module and avoids
circular imports with ``graphql.schema``.
"""

from __future__ import annotations

import importlib
from typing import Any

__all__ = [
    "MenuEngineeringMatrixData",
    "SalesReportIngestResult",
    "build_promotion_menu_items",
    "compute_menu_engineering_matrix",
    "image_ai_flow",
    "ingest_sales_report_upload",
    "update_image_ai_flow",
]

_LAZY: dict[str, tuple[str, str | None]] = {
    "update_image_ai_flow": ("graphql.services.image_ai_flow", "update_image_ai_flow"),
    "MenuEngineeringMatrixData": ("graphql.services.menu_engineering", "MenuEngineeringMatrixData"),
    "compute_menu_engineering_matrix": (
        "graphql.services.menu_engineering",
        "compute_menu_engineering_matrix",
    ),
    "build_promotion_menu_items": (
        "graphql.services.promotion_menu_items",
        "build_promotion_menu_items",
    ),
    "SalesReportIngestResult": ("graphql.services.sales_report", "SalesReportIngestResult"),
    "ingest_sales_report_upload": ("graphql.services.sales_report", "ingest_sales_report_upload"),
    "image_ai_flow": ("graphql.services.image_ai_flow", None),
}

_cache: dict[str, Any] = {}


def __getattr__(name: str) -> Any:
    if name in _cache:
        return _cache[name]
    spec = _LAZY.get(name)
    if spec is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    mod_name, attr = spec
    mod = importlib.import_module(mod_name)
    value = mod if attr is None else getattr(mod, attr)
    _cache[name] = value
    return value


def __dir__() -> list[str]:
    return sorted(__all__)
