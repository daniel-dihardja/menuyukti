#!/usr/bin/env python3
"""Clear all knowledge documents, chunks, and embeddings.

Usage (from repo root)::

    cd apps/graphql && make knowledge-clear

Ingest does not remove DB rows for deleted markdown files. Use this wipe, then
``make knowledge-ingest`` to rebuild from ``knowledge/*.md``.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_GRAPHQL_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _GRAPHQL_DIR.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


def main() -> int:
    from graphql.env_bootstrap import load_app_env

    load_app_env(_GRAPHQL_DIR)

    parser = argparse.ArgumentParser(
        description="Delete all Menuyukti knowledge docs / chunks / embeddings"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print row counts only; do not delete",
    )
    args = parser.parse_args()

    from sqlalchemy import func, select

    from graphql.data_sources import SessionLocal
    from graphql.data_sources.models.knowledge import (
        KnowledgeChunk,
        KnowledgeDocument,
        KnowledgeEmbedding,
    )
    from graphql.services.knowledge_ingest import clear_knowledge_corpus

    session = SessionLocal()
    try:
        docs = session.scalar(select(func.count()).select_from(KnowledgeDocument)) or 0
        chunks = session.scalar(select(func.count()).select_from(KnowledgeChunk)) or 0
        embeddings = (
            session.scalar(select(func.count()).select_from(KnowledgeEmbedding)) or 0
        )
        if args.dry_run:
            print(
                f"dry-run documents={docs} chunks={chunks} embeddings={embeddings}"
            )
            return 0

        result = clear_knowledge_corpus(session)
        session.commit()
        print(
            f"cleared documents={result.documents} "
            f"chunks={result.chunks} embeddings={result.embeddings}"
        )
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        msg = str(exc)
        if "knowledge_document" in msg and (
            "does not exist" in msg or "UndefinedTable" in msg
        ):
            print(
                "ERROR: knowledge tables are missing. "
                "Run `make db-upgrade` (revision g6h7i8j9k0l1+) first, "
                "then knowledge-clear / knowledge-ingest.",
                file=sys.stderr,
            )
            return 1
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    finally:
        session.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
