"""Lazy re-export of SQLAlchemy models and helpers for the GraphQL service."""

__all__ = [
    "Base",
    "MilestoneAgentRun",
    "Workspace",
    "WorkspaceMembership",
    "Location",
    "LocationOpeningHour",
    "LocationManualBriefInput",
    "VisualStyle",
    "CrmApp",
    "CrmAuditEvent",
    "CrmAuthChallenge",
    "CrmCustomer",
    "CrmDevice",
    "CrmEnrollmentToken",
    "CalendarEntry",
    "AnalyticsRun",
    "OrderFact",
    "MenuItemCogs",
    "InstagramItem",
    "InstagramItemPage",
    "InstagramItemPageMediaVersion",
    "InstagramPost",
    "InstagramPostPage",
    "InstagramPostPageMediaVersion",
    "Node",
    "ImageAiFlow",
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
