"""Fiskaly SIGN DE adapter stub — no HTTP until credentials + client land.

Env (reserved for the future HTTP client):
- ``FISKALY_API_KEY``
- ``FISKALY_API_SECRET``
- ``FISKALY_ENV`` — ``test`` (default) or ``live``
"""

from __future__ import annotations

import os

from graphql.services.pos_fiscal_port import (
    FiscalCancelResult,
    FiscalFinishResult,
    FiscalProcessContext,
    FiscalStartResult,
    FiscalUpdateResult,
)

PROVIDER_NAME = "fiskaly"


class FiskalyNotConfiguredError(RuntimeError):
    """Raised when fiskaly is selected but the HTTP client is not ready."""


def _credentials_present() -> bool:
    key = (os.environ.get("FISKALY_API_KEY") or "").strip()
    secret = (os.environ.get("FISKALY_API_SECRET") or "").strip()
    return bool(key and secret)


def fiskaly_env_name() -> str:
    raw = (os.environ.get("FISKALY_ENV") or "test").strip().lower()
    if raw in {"live", "prod", "production"}:
        return "live"
    return "test"


class FiskalyTseAdapter:
    """Placeholder ``FiscalizationPort`` until the SIGN DE client is implemented."""

    name = PROVIDER_NAME

    def _raise_not_configured(self) -> None:
        if not _credentials_present():
            raise FiskalyNotConfiguredError(
                "Fiskaly TSE is selected but FISKALY_API_KEY / FISKALY_API_SECRET "
                "are not set. Use POS_FISCAL_PROVIDER=mock for local prep, or configure "
                "fiskaly TEST credentials."
            )
        raise FiskalyNotConfiguredError(
            "Fiskaly TSE credentials are set but the SIGN DE HTTP client is not "
            f"implemented yet (FISKALY_ENV={fiskaly_env_name()})."
        )

    def start(self, ctx: FiscalProcessContext) -> FiscalStartResult:
        del ctx
        self._raise_not_configured()
        raise AssertionError("unreachable")

    def update(self, ctx: FiscalProcessContext, *, tse_transaction_id: str) -> FiscalUpdateResult:
        del ctx, tse_transaction_id
        self._raise_not_configured()
        raise AssertionError("unreachable")

    def finish(self, ctx: FiscalProcessContext, *, tse_transaction_id: str) -> FiscalFinishResult:
        del ctx, tse_transaction_id
        self._raise_not_configured()
        raise AssertionError("unreachable")

    def cancel(self, ctx: FiscalProcessContext, *, tse_transaction_id: str) -> FiscalCancelResult:
        del ctx, tse_transaction_id
        self._raise_not_configured()
        raise AssertionError("unreachable")
