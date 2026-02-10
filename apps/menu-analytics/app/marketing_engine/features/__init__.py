"""Agent-specific feature builders."""

from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel

from app.marketing_engine.core.inputs import CoreInputs
from app.marketing_engine.shared.primitives import SharedPrimitives


class FeatureProvider(Protocol):
    name: str

    def build(
        self,
        core: CoreInputs,
        shared: SharedPrimitives | None = None,
    ) -> BaseModel:
        ...


_REGISTRY: dict[str, FeatureProvider] = {}


def register_provider(provider: FeatureProvider) -> FeatureProvider:
    _REGISTRY[provider.name] = provider
    return provider


def get_provider(name: str) -> FeatureProvider:
    return _REGISTRY[name]


def available_providers() -> list[str]:
    return sorted(_REGISTRY)


def build_features(
    name: str,
    core: CoreInputs,
    shared: SharedPrimitives | None = None,
) -> BaseModel:
    return get_provider(name).build(core, shared)


def load_default_providers() -> None:
    # Import modules with registration side-effects.
    from app.marketing_engine.features import audience as _audience  # noqa: F401
