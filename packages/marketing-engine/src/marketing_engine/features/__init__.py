"""Agent-specific feature builders."""

from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel

from marketing_engine.core.inputs import CoreInputs


class FeatureProvider(Protocol):
    name: str

    def build(
        self,
        core: CoreInputs,
        shared: Any | None = None,
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
    shared: Any | None = None,
) -> BaseModel:
    return get_provider(name).build(core, shared)


def load_default_providers() -> None:
    # Import built-in feature modules so their register_provider(...)
    # side-effects run and populate the registry. This keeps the registry
    # empty by default and avoids importing every feature unless requested.
    from marketing_engine.features import audience as _audience  # noqa: F401
