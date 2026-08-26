"""Lazy re-export of SQLAlchemy models and helpers for the GraphQL service."""

__all__ = [
    "Base",
    "Workspace",
    "WorkspaceMembership",
    "Location",
    "LocationOpeningHour",
    "LocationManualBriefInput",
    "LocationMenuItemCogs",
    "VisualStyle",
    "MediaAsset",
    "MediaCollection",
    "MediaCollectionMember",
    "CrmApp",
    "CrmAuditEvent",
    "CrmAuthChallenge",
    "CrmCashbackEntry",
    "CrmCustomer",
    "CrmDevice",
    "CrmEnrollmentToken",
    "CalendarEntry",
    "AnalyticsRun",
    "OrderFact",
    "MenuItemCogs",
    "InstagramPost",
    "InstagramPostPage",
    "InstagramPostPageMediaVersion",
    "Node",
    "ImageAiFlow",
    "InventoryCatalogItem",
    "InventoryStock",
    "SessionLocal",
    "engine",
    "init_db",
    "drop_db",
    "seed_db",
]


def __getattr__(name: str):
    if name not in __all__:
        raise AttributeError

    from graphql.data_sources import models

    from . import database

    value = getattr(database, name) if hasattr(database, name) else getattr(models, name)
    globals()[name] = value
    return value
