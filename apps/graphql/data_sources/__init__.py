"""Lazy re-export of SQLAlchemy models and helpers for the GraphQL service."""

__all__ = [
    "Base",
    "User",
    "AnalyticsRun",
    "OrderFact",
    "MenuItemCogs",
    "SessionLocal",
    "engine",
    "init_db",
    "drop_db",
]


def __getattr__(name: str):
    if name not in __all__:
        raise AttributeError

    from . import database

    value = getattr(database, name)
    globals()[name] = value
    return value
