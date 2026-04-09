"""Database engine, session factory, and lifecycle helpers for the GraphQL service.

**Production / PostgreSQL:** apply schema changes with Alembic — from ``apps/graphql`` run
``make db-upgrade`` (or ``PYTHONPATH=../.. uv run alembic upgrade head``) with
``DATABASE_URL`` set (e.g. ``postgresql+psycopg2://...``). See ``alembic/`` and the app README.

**Tests:** pytest sets ``DATABASE_URL`` to a SQLite file before importing this module; tests use
``init_db()`` / ``drop_db()`` which call ``create_all`` / ``drop_all`` — migrations are not run
in the test suite.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=False)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+pysqlite:///./graphql.db")

engine = create_engine(
    DATABASE_URL,
    future=True,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for SQLAlchemy 2.0 ORM models."""

    pass


# Register all ORM models with Base.metadata (import side effects only).
import graphql.data_sources.models  # noqa: F401, E402


def seed_db(target_engine=None) -> None:
    """Insert default image AI flows when missing (idempotent)."""

    resolved_engine = target_engine or engine
    Session = sessionmaker(bind=resolved_engine, expire_on_commit=False)
    from graphql.data_sources import ImageAiFlow

    with Session() as session:
        existing = (
            session.query(ImageAiFlow).filter(ImageAiFlow.slug == "remove-background").first()
        )
        if existing is None:
            session.add(
                ImageAiFlow(
                    slug="remove-background",
                    display_name="Remove background",
                    prompt=(
                        "Remove the background completely. Keep only the main subject "
                        "centered on a solid white background (opaque, not transparent). "
                        "Preserve edges and fine details of the subject."
                    ),
                    model="gemini-2.5-flash-image",
                    prompt_enhance="OFF",
                    image_reference_strength="MID",
                    style_ids=["556c1ee5-ec38-42e8-955a-1e82dad0ffa1"],
                    is_active=True,
                    sort_order=0,
                )
            )
            session.commit()


def init_db(target_engine=None) -> None:
    """Create tables for all models (defaults to the configured engine).

    Intended for **tests and local SQLite** bootstrap. For PostgreSQL in deployed environments,
    prefer ``alembic upgrade head`` so schema history stays in version control.
    """

    resolved_engine = target_engine or engine
    Base.metadata.create_all(bind=resolved_engine)
    seed_db(resolved_engine)


def drop_db(target_engine=None) -> None:
    """Drop all tables for the configured models.

    On PostgreSQL the schema is reset via DROP SCHEMA ... CASCADE so that
    stale tables (not in the current models) with FK dependencies don't block
    the drop. SQLite falls back to the standard drop_all path.
    """

    resolved_engine = target_engine or engine
    if resolved_engine.dialect.name == "postgresql":
        with resolved_engine.connect() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
            conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
            conn.commit()
    else:
        Base.metadata.drop_all(bind=resolved_engine)


def main() -> None:
    """Bootstrap SQLite or dev DB via create_all (not Alembic).

    For PostgreSQL, use ``make db-upgrade`` instead.
    """

    init_db()
    print(
        "Created tables for the GraphQL service (create_all). For PostgreSQL, use: make db-upgrade"
    )


def _main_drop() -> None:
    """Drop tables via the same module entry point."""

    drop_db()
    print("Dropped all GraphQL tables.")


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "init"

    if action == "drop":
        _main_drop()
    else:
        main()
