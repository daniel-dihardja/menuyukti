"""FiscalizationPort contract tests (mock adapter).

Future: mark a fiskaly TEST suite with ``@pytest.mark.fiskaly`` once credentials
and the HTTP client exist; keep mock as the default contract runner.
"""

from __future__ import annotations

import pytest

from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess
from graphql.services.pos_fiscal_mock import MockTseAdapter
from graphql.services.pos_fiscal_port import FiscalProcessContext
from graphql.services.pos_fiscalization import assert_finished_fiscal_immutable


def _sale_ctx(*, order_id: int = 42) -> FiscalProcessContext:
    return FiscalProcessContext(
        order_id=order_id,
        bill_number=f"B-{order_id}",
        location_id=1,
        register_id=1,
        kind="sale",
        gross_cents=1190,
        net_cents=1000,
        tax_cents=190,
        payment_method="cash",
    )


@pytest.mark.parametrize("adapter_factory", [MockTseAdapter], ids=["mock"])
def test_port_start_update_finish(adapter_factory: type) -> None:
    port = adapter_factory()
    ctx = _sale_ctx()
    started = port.start(ctx)
    assert started.tse_transaction_id
    assert started.client_id
    assert started.certificate_serial
    assert started.process_type
    assert started.started_at.tzinfo is not None

    updated = port.update(ctx, tse_transaction_id=started.tse_transaction_id)
    assert updated.tse_transaction_id == started.tse_transaction_id

    finished = port.finish(ctx, tse_transaction_id=started.tse_transaction_id)
    assert finished.tse_transaction_id == started.tse_transaction_id
    assert finished.tse_signature
    assert finished.signature_counter is not None
    assert finished.qr_payload
    assert finished.finished_at.tzinfo is not None


@pytest.mark.parametrize("adapter_factory", [MockTseAdapter], ids=["mock"])
def test_port_start_cancel(adapter_factory: type) -> None:
    port = adapter_factory()
    ctx = _sale_ctx(order_id=7)
    started = port.start(ctx)
    cancelled = port.cancel(ctx, tse_transaction_id=started.tse_transaction_id)
    assert cancelled.tse_transaction_id == started.tse_transaction_id
    assert cancelled.finished_at.tzinfo is not None


def test_assert_finished_fiscal_immutable() -> None:
    process = PosFiscalProcess(
        pos_order_id=1,
        kind="sale",
        state="finished",
        provider="mock",
    )
    process.id = 99
    with pytest.raises(ValueError, match="Cannot mutate finished fiscal"):
        assert_finished_fiscal_immutable(process)

    process.state = "started"
    assert_finished_fiscal_immutable(process)  # does not raise
