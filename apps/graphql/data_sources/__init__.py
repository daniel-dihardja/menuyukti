"""Placeholders for GraphQL data sources."""

__all__ = [
    "Base",
    "OrderFact",
    "User",
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
