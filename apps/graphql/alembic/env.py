"""Alembic environment: loads ORM metadata from graphql.data_sources and DATABASE_URL."""

from __future__ import annotations

import os
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# Load root then app .env before DATABASE_URL (matches graphql.data_sources.database).
_BASE_DIR = Path(__file__).resolve().parent.parent

from graphql.env_bootstrap import load_app_env

load_app_env(_BASE_DIR)

from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql.base import ischema_names

import graphql.data_sources.models  # noqa: F401 — ensure all models register on Base.metadata
from graphql.data_sources.database import Base

# So reflection/autogenerate recognize pgvector columns (embedding_vec).
ischema_names["vector"] = Vector

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Set it in the repo-root .env, apps/graphql/.env, "
        "or the environment before running Alembic "
        "(e.g. postgresql+psycopg2://user:pass@host:5432/dbname)."
    )
config.set_main_option("sqlalchemy.url", database_url)

target_metadata = Base.metadata


def include_object(object_, name, type_, reflected, compare_to):
    """Keep alembic check stable for pgvector HNSW (ops often do not round-trip)."""
    return not (type_ == "index" and name == "ix_knowledge_embedding_vec_hnsw")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (SQL script output, no live DB connection)."""

    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    section = config.get_section(config.config_ini_section) or {}
    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
