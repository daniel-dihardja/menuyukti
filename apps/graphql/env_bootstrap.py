"""Load monorepo env: repo-root ``.env`` then this app's ``.env`` (overrides)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_APP_DIR = Path(__file__).resolve().parent


def load_app_env(app_dir: Path | None = None) -> None:
    """Load shared root ``.env``, then optional ``apps/<svc>/.env`` overrides.

    Precedence (highest wins):

    1. Process env already set before this call (pytest, CI, shell exports)
    2. ``apps/<svc>/.env``
    3. Repo-root ``.env``

    App ``.env`` may override root dotenv values, but must never clobber a
    pre-existing process ``DATABASE_URL`` (tests call ``drop_db`` / ``init_db``).
    """
    app = app_dir if app_dir is not None else _APP_DIR
    repo_root = app.parent.parent  # apps/<name> -> repo
    preexisting = dict(os.environ)
    load_dotenv(repo_root / ".env", override=False)
    load_dotenv(app / ".env", override=True)
    os.environ.update(preexisting)
