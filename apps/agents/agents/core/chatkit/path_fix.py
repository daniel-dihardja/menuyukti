"""Ensure OpenAI ``agents`` (openai-agents) is not shadowed by ``apps/agents``.

Two shadowing cases:

1. Cwd is ``apps/agents`` so ``import agents`` loads ``apps/agents/agents/``.
2. Pytest importlib mode names the app package ``agents`` (directory name), so
   ``import agents`` loads ``apps/agents/__init__.py`` (agents_app) and blocks
   openai-agents entirely.
"""

from __future__ import annotations

import importlib
import importlib.util
import sys
from pathlib import Path

_APP_ROOT = Path(__file__).resolve().parents[3]  # apps/agents
_LOCAL_AGENTS_PKG = _APP_ROOT / "agents"


def _site_packages_agents_init() -> Path | None:
    for entry in sys.path:
        try:
            root = Path(entry)
        except TypeError:
            continue
        candidate = root / "agents" / "__init__.py"
        try:
            if candidate.is_file() and "site-packages" in str(candidate.resolve()):
                return candidate.resolve()
        except OSError:
            continue
    # Fallback: walk known venv layout relative to this file
    for parent in Path(__file__).resolve().parents:
        candidate = parent / ".venv" / "lib"
        if not candidate.is_dir():
            continue
        for init in candidate.glob("python*/site-packages/agents/__init__.py"):
            if init.is_file():
                return init.resolve()
    return None


def prefer_site_packages_agents() -> None:
    """Force ``sys.modules['agents']`` to the openai-agents distribution."""
    cleaned: list[str] = []
    for entry in sys.path:
        try:
            resolved = Path(entry or ".").resolve()
        except OSError:
            cleaned.append(entry)
            continue
        if resolved == _APP_ROOT:
            continue
        cleaned.append(entry)
    sys.path[:] = cleaned

    init_path = _site_packages_agents_init()
    if init_path is None:
        raise RuntimeError("Could not locate site-packages openai-agents package")

    existing = sys.modules.get("agents")
    existing_file = getattr(existing, "__file__", "") or ""
    if existing is not None and "site-packages" in existing_file.replace("\\", "/"):
        # Already correct.
        return

    # Drop shadowed top-level ``agents`` (keep agents_app.* and pytest agents.tests.*
    # only if we can; replacing ``agents`` is required for ChatKit).
    for key in list(sys.modules):
        if key == "agents" or key.startswith("agents."):
            mod = sys.modules[key]
            mod_file = getattr(mod, "__file__", "") or ""
            if "site-packages" in mod_file.replace("\\", "/"):
                continue
            # Keep agents_app.* 
            if key == "agents_app" or key.startswith("agents_app."):
                continue
            del sys.modules[key]

    spec = importlib.util.spec_from_file_location(
        "agents",
        init_path,
        submodule_search_locations=[str(init_path.parent)],
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load openai-agents from {init_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["agents"] = module
    spec.loader.exec_module(module)

    # Sanity: ChatKit needs this submodule.
    importlib.import_module("agents.models.chatcmpl_helpers")
