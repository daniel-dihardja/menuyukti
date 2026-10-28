#!/usr/bin/env python3
"""Ingest knowledge seed markdown into Postgres/SQLite via SQLAlchemy.

Usage (from repo root)::

    cd apps/graphql && make knowledge-ingest

Options::

    --dir PATH   Seed directory (default: apps/graphql/knowledge)
    --force      Re-embed even when content_hash is unchanged
    --dry-run    Parse seeds only; do not write
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# scripts/ -> graphql/ -> apps/ -> repo root
_GRAPHQL_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _GRAPHQL_DIR.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


def main() -> int:
    from graphql.env_bootstrap import load_app_env

    load_app_env(_GRAPHQL_DIR)

    parser = argparse.ArgumentParser(description="Ingest Menuyukti knowledge seeds")
    default_dir = _GRAPHQL_DIR / "knowledge"
    parser.add_argument("--dir", type=Path, default=default_dir)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    from graphql.data_sources import SessionLocal
    from graphql.services.knowledge_ingest import ingest_seed_directory, parse_seed_markdown

    seed_dir: Path = args.dir
    if args.dry_run:
        for path in sorted(seed_dir.glob("*.md")):
            spec = parse_seed_markdown(path)
            print(f"OK {spec.slug} category={spec.category} chars={len(spec.body)}")
        return 0

    session = SessionLocal()
    try:
        results = ingest_seed_directory(session, seed_dir, force=bool(args.force))
        session.commit()
        for r in results:
            flag = "skip" if r.skipped else "upsert"
            print(
                f"{flag} id={r.document_id} slug={r.slug} "
                f"v={r.version} chunks={r.chunk_count}"
            )
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    finally:
        session.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
