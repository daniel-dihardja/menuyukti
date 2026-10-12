"""POS fiscal provider resolution and production anti-mock gates."""

from __future__ import annotations

import pytest

from graphql.server import validate_startup_security
from graphql.services import pos_fiscalization as fiscal
from graphql.services.pos_fiscal_fiskaly import FiskalyNotConfiguredError, FiskalyTseAdapter
from graphql.services.pos_fiscal_mock import MockTseAdapter
from graphql.services.pos_fiscal_port import FiscalProcessContext


def _clear_prod_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GRAPHQL_ENV", raising=False)
    monkeypatch.delenv("ENV", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.setenv("NODE_ENV", "test")
    monkeypatch.setenv("GRAPHQL_REQUIRE_INTERNAL_API_KEY", "")
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")


def _ctx() -> FiscalProcessContext:
    return FiscalProcessContext(
        order_id=1,
        bill_number="B-1",
        location_id=1,
        register_id=1,
        kind="sale",
        gross_cents=100,
        net_cents=84,
        tax_cents=16,
        payment_method="cash",
    )


def test_fiscal_provider_defaults_to_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_prod_env(monkeypatch)
    monkeypatch.delenv("POS_FISCAL_PROVIDER", raising=False)
    assert fiscal.fiscal_provider_name() == fiscal.PROVIDER_MOCK
    assert isinstance(fiscal.get_fiscal_port(), MockTseAdapter)


def test_fiscal_provider_off(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_prod_env(monkeypatch)
    monkeypatch.setenv("POS_FISCAL_PROVIDER", "off")
    assert fiscal.fiscal_provider_name() == fiscal.PROVIDER_OFF
    assert fiscal.get_fiscal_port() is None


def test_fiscal_provider_unknown_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_prod_env(monkeypatch)
    monkeypatch.setenv("POS_FISCAL_PROVIDER", "acme")
    with pytest.raises(ValueError, match="Unknown POS_FISCAL_PROVIDER"):
        fiscal.fiscal_provider_name()


def test_fiscal_provider_fiskaly_returns_stub(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_prod_env(monkeypatch)
    monkeypatch.setenv("POS_FISCAL_PROVIDER", "fiskaly")
    monkeypatch.delenv("FISKALY_API_KEY", raising=False)
    monkeypatch.delenv("FISKALY_API_SECRET", raising=False)
    port = fiscal.get_fiscal_port()
    assert isinstance(port, FiskalyTseAdapter)
    with pytest.raises(FiskalyNotConfiguredError, match="FISKALY_API_KEY"):
        port.start(_ctx())


def test_fiskaly_stub_credentials_but_no_client(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FISKALY_API_KEY", "k")
    monkeypatch.setenv("FISKALY_API_SECRET", "s")
    monkeypatch.setenv("FISKALY_ENV", "test")
    port = FiskalyTseAdapter()
    with pytest.raises(FiskalyNotConfiguredError, match="not implemented"):
        port.finish(_ctx(), tse_transaction_id="tx")


def test_get_fiscal_port_refuses_mock_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.setenv("POS_FISCAL_PROVIDER", "mock")
    with pytest.raises(RuntimeError, match="not allowed in production"):
        fiscal.get_fiscal_port()


def test_validate_startup_refuses_mock_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")
    monkeypatch.setenv("POS_FISCAL_PROVIDER", "mock")
    with pytest.raises(RuntimeError, match="POS_FISCAL_PROVIDER"):
        validate_startup_security()


def test_validate_startup_allows_fiskaly_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")
    monkeypatch.setenv("POS_FISCAL_PROVIDER", "fiskaly")
    validate_startup_security()


def test_validate_startup_allows_off_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")
    monkeypatch.setenv("POS_FISCAL_PROVIDER", "off")
    validate_startup_security()


def test_validate_startup_refuses_unknown_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")
    monkeypatch.setenv("POS_FISCAL_PROVIDER", "acme")
    with pytest.raises(RuntimeError, match="Unknown POS_FISCAL_PROVIDER"):
        validate_startup_security()
