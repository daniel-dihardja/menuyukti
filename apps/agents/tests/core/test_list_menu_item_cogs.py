"""Unit tests for list_menu_item_cogs join and payload helpers."""

from __future__ import annotations

import json

from agents_app.agents.core.chat.list_menu_item_cogs import (
    build_cogs_list_payload,
    format_cogs_list_markdown,
    join_catalog_with_cogs,
)
from agents_app.agents.core.chat.untrusted_context import UNTRUSTED_BEGIN


def test_join_marks_catalog_only_as_missing() -> None:
    items = join_catalog_with_cogs(
        [{"name": "Nasi Goreng", "category": "Mains"}],
        [],
    )
    assert len(items) == 1
    assert items[0]["menu"] == "Nasi Goreng"
    assert items[0]["status"] == "missing"
    assert items[0]["cogs"] is None


def test_join_matches_set_cogs() -> None:
    items = join_catalog_with_cogs(
        [{"name": "Es Teh", "category": "Drinks"}],
        [{"menu": "Es Teh", "cogs": 1500, "currency": "IDR", "menuCategory": "Drinks"}],
    )
    assert len(items) == 1
    assert items[0]["status"] == "set"
    assert items[0]["cogs"] == 1500
    assert items[0]["currency"] == "IDR"


def test_join_keeps_orphan_cogs_rows() -> None:
    items = join_catalog_with_cogs(
        [{"name": "Nasi"}],
        [
            {"menu": "Nasi", "cogs": 8000, "currency": "IDR"},
            {"menu": "Legacy Item", "cogs": 500, "currency": "IDR", "menuCategory": "Other"},
        ],
    )
    by_menu = {row["menu"]: row for row in items}
    assert by_menu["Nasi"]["status"] == "set"
    assert by_menu["Legacy Item"]["status"] == "set"
    assert by_menu["Legacy Item"]["cogs"] == 500


def test_format_markdown_and_payload() -> None:
    items = join_catalog_with_cogs(
        [
            {"name": "A", "category": "X"},
            {"name": "B", "category": "Y"},
        ],
        [{"menu": "A", "cogs": 10, "currency": "IDR"}],
    )
    md = format_cogs_list_markdown(items, run_name="Jan sales", run_id=42)
    assert "2 items, 1 missing" in md
    assert "MISSING" in md
    assert "10 IDR" in md

    payload = build_cogs_list_payload(items, run_name="Jan sales", run_id=42)
    assert payload["ok"] is True
    assert payload["summary"]["total"] == 2
    assert payload["summary"]["missing_count"] == 1
    assert UNTRUSTED_BEGIN in payload["markdown"]
    # JSON-serializable for the tool return path
    roundtrip = json.loads(json.dumps(payload))
    assert roundtrip["summary"]["run_id"] == 42
