"""Fiscalization port protocol and result types (provider-agnostic)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class FiscalProcessContext:
    order_id: int
    bill_number: str
    location_id: int
    register_id: int | None
    kind: str
    gross_cents: int
    net_cents: int
    tax_cents: int
    payment_method: str | None = None


@dataclass(frozen=True)
class FiscalStartResult:
    tse_transaction_id: str
    client_id: str
    certificate_serial: str
    process_type: str
    started_at: datetime


@dataclass(frozen=True)
class FiscalUpdateResult:
    tse_transaction_id: str


@dataclass(frozen=True)
class FiscalFinishResult:
    tse_transaction_id: str
    tse_signature: str
    signature_counter: int
    certificate_serial: str
    qr_payload: str
    finished_at: datetime


@dataclass(frozen=True)
class FiscalCancelResult:
    tse_transaction_id: str
    finished_at: datetime


class FiscalizationPort(Protocol):
    """Provider adapter for TSE start/update/finish/cancel."""

    name: str

    def start(self, ctx: FiscalProcessContext) -> FiscalStartResult: ...

    def update(
        self, ctx: FiscalProcessContext, *, tse_transaction_id: str
    ) -> FiscalUpdateResult: ...

    def finish(
        self, ctx: FiscalProcessContext, *, tse_transaction_id: str
    ) -> FiscalFinishResult: ...

    def cancel(
        self, ctx: FiscalProcessContext, *, tse_transaction_id: str
    ) -> FiscalCancelResult: ...
