"""Mock TSE adapter — deterministic non-legal signatures for prep/testing."""

from __future__ import annotations

import hashlib
import os
from datetime import UTC, datetime

from graphql.services.pos_fiscal_port import (
    FiscalCancelResult,
    FiscalFinishResult,
    FiscalProcessContext,
    FiscalStartResult,
    FiscalUpdateResult,
)

PROVIDER_NAME = "mock"


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _force_fail() -> bool:
    return os.environ.get("POS_FISCAL_FORCE_FAIL", "").strip() in {"1", "true", "TRUE", "yes"}


def _tx_id(ctx: FiscalProcessContext) -> str:
    raw = f"mock:{ctx.kind}:{ctx.order_id}:{ctx.bill_number}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    return f"MOCK-TX-{digest}"


def _signature(ctx: FiscalProcessContext, counter: int) -> str:
    raw = f"{_tx_id(ctx)}|{counter}|{ctx.gross_cents}|{ctx.kind}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _client_id(ctx: FiscalProcessContext) -> str:
    reg = ctx.register_id if ctx.register_id is not None else 0
    return f"register:{reg}"


def _certificate_serial(ctx: FiscalProcessContext) -> str:
    return f"MOCK-CERT-{ctx.location_id:04d}"


def _qr_payload(ctx: FiscalProcessContext, *, signature: str, counter: int) -> str:
    return (
        f"V0;{_tx_id(ctx)};{_client_id(ctx)};{_certificate_serial(ctx)};"
        f"{counter};{ctx.gross_cents};{signature[:32]}"
    )


class MockTseAdapter:
    """In-process mock that never calls a remote TSE."""

    name = PROVIDER_NAME

    def start(self, ctx: FiscalProcessContext) -> FiscalStartResult:
        if _force_fail():
            raise RuntimeError("Mock TSE forced failure (POS_FISCAL_FORCE_FAIL)")
        return FiscalStartResult(
            tse_transaction_id=_tx_id(ctx),
            client_id=_client_id(ctx),
            certificate_serial=_certificate_serial(ctx),
            process_type="Kassenbeleg-V1",
            started_at=_utcnow(),
        )

    def update(self, ctx: FiscalProcessContext, *, tse_transaction_id: str) -> FiscalUpdateResult:
        if _force_fail():
            raise RuntimeError("Mock TSE forced failure (POS_FISCAL_FORCE_FAIL)")
        return FiscalUpdateResult(tse_transaction_id=tse_transaction_id)

    def finish(self, ctx: FiscalProcessContext, *, tse_transaction_id: str) -> FiscalFinishResult:
        if _force_fail():
            raise RuntimeError("Mock TSE forced failure (POS_FISCAL_FORCE_FAIL)")
        # Deterministic counter from order id + kind offset
        counter = int(ctx.order_id) * 10 + (1 if ctx.kind == "sale" else 2)
        signature = _signature(ctx, counter)
        return FiscalFinishResult(
            tse_transaction_id=tse_transaction_id,
            tse_signature=signature,
            signature_counter=counter,
            certificate_serial=_certificate_serial(ctx),
            qr_payload=_qr_payload(ctx, signature=signature, counter=counter),
            finished_at=_utcnow(),
        )

    def cancel(self, ctx: FiscalProcessContext, *, tse_transaction_id: str) -> FiscalCancelResult:
        if _force_fail():
            raise RuntimeError("Mock TSE forced failure (POS_FISCAL_FORCE_FAIL)")
        return FiscalCancelResult(
            tse_transaction_id=tse_transaction_id,
            finished_at=_utcnow(),
        )
