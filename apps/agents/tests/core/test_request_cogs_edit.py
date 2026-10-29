"""Unit tests for request_cogs_edit selection helpers."""

from __future__ import annotations

from agents_app.agents.core.chat.request_cogs_edit import (
    build_cogs_edit_payload,
    select_cogs_edit_items,
)


def _items() -> list[dict]:
    return [
        {"menu": "Nasi Goreng", "cogs": None, "status": "missing", "currency": None},
        {"menu": "Es Teh", "cogs": 1500, "status": "set", "currency": "IDR"},
        {"menu": "Sate", "cogs": None, "status": "missing", "currency": None},
    ]


def test_select_missing_scope() -> None:
    selected = select_cogs_edit_items(_items(), scope="missing", menu_names=None)
    assert isinstance(selected, list)
    assert [row["menu"] for row in selected] == ["Nasi Goreng", "Sate"]


def test_select_selected_by_name_case_insensitive() -> None:
    selected = select_cogs_edit_items(
        _items(),
        scope="selected",
        menu_names=["es teh"],
    )
    assert isinstance(selected, list)
    assert len(selected) == 1
    assert selected[0]["menu"] == "Es Teh"


def test_select_selected_requires_names() -> None:
    err = select_cogs_edit_items(_items(), scope="selected", menu_names=None)
    assert isinstance(err, str)
    assert "menu_names" in err


def test_select_unknown_names() -> None:
    err = select_cogs_edit_items(
        _items(),
        scope="selected",
        menu_names=["Does Not Exist"],
    )
    assert isinstance(err, str)
    assert "None of those menu names" in err


def test_build_edit_payload() -> None:
    payload = build_cogs_edit_payload(
        [{"menu": "A", "cogs": None, "status": "missing"}],
        run_name="Jan",
        truncated=True,
    )
    assert payload["ok"] is True
    assert payload["action"] == "request_cogs_edit"
    assert payload["run_name"] == "Jan"
    assert payload["truncated"] is True
    assert len(payload["items"]) == 1
