"""Load monorepo env: repo-root ``.env`` then this app's ``.env`` (overrides)."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

_APP_DIR = Path(__file__).resolve().parent


def load_app_env(app_dir: Path | None = None) -> None:
    """Load shared root ``.env``, then optional ``apps/<svc>/.env`` overrides.

    Process environment variables already set before this call are not cleared;
    root loads with ``override=False``, then the app file with ``override=True``.
    """
    app = app_dir if app_dir is not None else _APP_DIR
    repo_root = app.parent.parent  # apps/<name> -> repo
    load_dotenv(repo_root / ".env", override=False)
    load_dotenv(app / ".env", override=True)
