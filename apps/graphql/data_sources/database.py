"""Database engine, session factory, and lifecycle helpers for the GraphQL service."""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=False)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+pysqlite:///./graphql.db")

engine = create_engine(DATABASE_URL, future=True, echo=False)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()

# Register all ORM models with Base.metadata (import side effects only).
import graphql.data_sources.models  # noqa: F401, E402


def seed_db(target_engine=None) -> None:
    """Insert default image AI flows when missing (idempotent)."""

    resolved_engine = target_engine or engine
    Session = sessionmaker(bind=resolved_engine, expire_on_commit=False)
    session = Session()
    from graphql.data_sources import ImageAiFlow

    try:
        existing = (
            session.query(ImageAiFlow)
            .filter(ImageAiFlow.slug == "remove-background")
            .first()
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
    finally:
        session.close()


def init_db(target_engine=None) -> None:
    """Create tables for all models (defaults to the configured engine)."""

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
    """Entry point so the schema can be quickly bootstrapped."""

    init_db()
    print("Created tables for the GraphQL service.")


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
