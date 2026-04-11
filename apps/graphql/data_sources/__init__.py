"""Lazy re-export of SQLAlchemy models and helpers for the GraphQL service."""

__all__ = [
    "ApiAdapterTool",
    "Base",
    "MilestoneAgentRun",
    "WorkflowExport",
    "Workspace",
    "WorkspaceMembership",
    "Location",
    "LocationSocialSettings",
    "AnalyticsRun",
    "OrderFact",
    "MenuItemCogs",
    "InstagramPost",
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
