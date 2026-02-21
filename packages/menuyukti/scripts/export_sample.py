"""Export sample scenarios to JSON or CSV."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Iterable

from menuyukti.core.models.pos_transaction import POSTransactionLineItem
from menuyukti.samples.star_item import STAR_ITEM_COGS_RATES, star_item_scenario
from menuyukti.samples.thriving_cafe import (
    THRIVING_CAFE_COGS_RATES,
    thriving_cafe_scenario,
)
from menuyukti.samples.struggling_restaurant import (
    STRUGGLING_RESTAURANT_COGS_RATES,
    struggling_restaurant_scenario,
)

SCENARIOS = {
    "star_item": {
        "fn": star_item_scenario,
        "description": "Restaurant with one dominant high-margin item.",
        "cogs_rates": STAR_ITEM_COGS_RATES,
    },
    "thriving_cafe": {
        "fn": thriving_cafe_scenario,
        "description": "Thriving downtown cafe with good margins and diverse menu.",
        "cogs_rates": THRIVING_CAFE_COGS_RATES,
    },
    "struggling_restaurant": {
        "fn": struggling_restaurant_scenario,
        "description": "Family restaurant with low margins and underperforming items.",
        "cogs_rates": STRUGGLING_RESTAURANT_COGS_RATES,
    },
}


def _to_rows(items: Iterable[POSTransactionLineItem]) -> list[dict]:
    return [item.model_dump(mode="json") for item in items]


def _aggregate_menu_items(
    items: Iterable[POSTransactionLineItem],
    cogs_rates: dict[str, float] | None,
) -> list[dict]:
    aggregates: dict[str, dict] = {}

    for item in items:
        entry = aggregates.setdefault(
            item.menu,
            {
                "menu_name": item.menu,
                "menu_category": item.menu_category,
                "menu_category_detail": item.menu_category_detail,
                "quantity": 0,
                "total_revenue": 0.0,
                "cogs": 0.0 if cogs_rates and item.menu in cogs_rates else None,
            },
        )
        entry["quantity"] += int(item.qty)
        entry["total_revenue"] += float(item.total_after_bill_discount)
        if entry["cogs"] is not None and cogs_rates:
            entry["cogs"] += (
                float(item.total_after_bill_discount) * cogs_rates[item.menu]
            )

    return [aggregates[key] for key in sorted(aggregates.keys())]


def _write_json(payload: dict, output_path: Path | None) -> None:
    if output_path:
        output_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return

    json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


def _write_csv(rows: list[dict], output_path: Path | None) -> None:
    if not rows:
        return
    if output_path:
        with output_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        return

    writer = csv.DictWriter(sys.stdout, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Export menuyukti sample scenarios.")
    parser.add_argument("--scenario", required=True, choices=sorted(SCENARIOS.keys()))
    parser.add_argument("--format", default="json", choices=["json", "csv"])
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Write output file to this directory instead of stdout.",
    )
    args = parser.parse_args()

    scenario = SCENARIOS[args.scenario]
    items = scenario["fn"]()
    rows = _to_rows(items)
    analytics_menu_items = _aggregate_menu_items(
        items,
        scenario.get("cogs_rates"),
    )

    output_path: Path | None = None
    if args.output_dir:
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{args.scenario}.{args.format}"

    if args.format == "csv":
        _write_csv(rows, output_path)
    else:
        payload = {
            "scenario": args.scenario,
            "description": scenario["description"],
            "order_menu_items": rows,
            "analytics_menu_items": analytics_menu_items,
        }
        _write_json(payload, output_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
