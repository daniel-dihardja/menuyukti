"""Registry of milestone preset subgraph runners keyed by ``presetId``."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.state import MilestoneRunState

PresetRunner = Callable[
    [MilestoneRunState, httpx.AsyncClient],
    Awaitable[dict[str, Any]],
]

PRESET_RUNNERS: dict[str, PresetRunner] = {}


def register_preset_runner(preset_id: str, runner: PresetRunner) -> None:
    """Register a dedicated preset subgraph runner."""
    PRESET_RUNNERS[preset_id] = runner


def get_preset_runner(preset_id: str) -> PresetRunner | None:
    return PRESET_RUNNERS.get(preset_id)
