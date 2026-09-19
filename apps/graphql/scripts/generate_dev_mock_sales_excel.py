"""Generate a synthetic 1-month ESB sales mock for make dev-data.

Uses a SNABB Sales Recapitulation Detail Report only for workbook shell
(A1 title, metadata row layout, header columns). Menu items are Warung Sunda
dishes aligned with inventar pantry seeds (Beras, Tahu, Kangkung, Pecel,
Santan, Gula Aren) — not a copy of live SNABB cafe sales.

Also writes a matching ``dev_mock_menu_cogs.json`` so menu-engineering stars
and combo lift work with the analytics seed on Warung Sunda Lembur.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

from menuyukti.core.analytics import (
    compute_menu_basket_affinities_from_orders,
    compute_menu_engineering_from_orders,
)
from menuyukti.core.analytics.esb import normalize_esb_excel
from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes
from openpyxl import Workbook, load_workbook
from openpyxl.worksheet.worksheet import Worksheet

ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE = (
    ROOT_DIR / "sales-reports" / "snabb" / "SalesRecapitulationDetailReport_JUL_2026.xlsx"
)
DEFAULT_OUTPUT = (
    ROOT_DIR / "apps" / "graphql" / "fixtures" / "dev_mock_SalesRecapitulationDetailReport_1mo.xlsx"
)
DEFAULT_COGS_OUTPUT = ROOT_DIR / "apps" / "graphql" / "fixtures" / "dev_mock_menu_cogs.json"

HEADER_ROW = 11
DATA_START_ROW = 12
PERIOD_START = date(2026, 7, 1)
PERIOD_END = date(2026, 7, 31)
RNG_SEED = 20260701
STRONG_LIFT_THRESHOLD = 1.5
BILLS_PER_DAY = 55

# Column order copied from SNABB ESB exports (structure only).
ESB_HEADERS: list[str] = [
    "Sales Number",
    "Bill Number",
    "Sales Type",
    "Batch Order",
    "Table Section",
    "Table Name",
    "Sales Date",
    "Sales Date In",
    "Sales Date Out",
    "Branch",
    "Brand",
    "City",
    "Area",
    "Visit Purpose",
    "Regular Member Code",
    "Regular Member Name",
    "Loyalty Member Code",
    "Loyalty Member Name",
    "Loyalty Member Type",
    "Employee Code",
    "Employee Name",
    "External Employee Code",
    "External Employee Name",
    "Customer Name",
    "Payment Method",
    "Menu Category",
    "Menu Category Detail",
    "Menu",
    "Custom Menu Name",
    "Menu Code",
    "Menu Notes",
    "Order Mode",
    "Qty",
    "Price",
    "Subtotal",
    "Discount",
    "Service Charge",
    "Tax",
    "VAT",
    "Total",
    "Nett Sales",
    "DPP",
    "Bill Discount",
    "Total After Bill Discount",
    "Waiter",
    "Order Time",
]


@dataclass(frozen=True)
class MockMenuItem:
    menu: str
    menu_category: str
    menu_category_detail: str
    menu_code: str
    price: float
    cogs: float
    role: str  # star | plow | puzzle | filler | side
    # Inventar catalog ingredient(s) this dish is meant to consume (dev_seed_inventar).
    inventar_ingredients: tuple[str, ...]


# Warung Sunda dishes aligned with inventar pantry seeds:
# Beras Cianjur, Tahu Bandung, Kangkung, Bumbu Pecel, Santan Kelapa, Gula Aren.
MOCK_CATALOG: tuple[MockMenuItem, ...] = (
    MockMenuItem(
        "Nasi Timbel",
        "MAKANAN",
        "NASI",
        "WSL-FD-001",
        12000.0,
        3500.0,
        "star",
        ("Beras Cianjur",),
    ),
    MockMenuItem(
        "Tahu Goreng",
        "MAKANAN",
        "LAUK",
        "WSL-FD-002",
        10000.0,
        2800.0,
        "star",
        ("Tahu Bandung",),
    ),
    MockMenuItem(
        "Tumis Kangkung",
        "MAKANAN",
        "SAYUR",
        "WSL-FD-003",
        12000.0,
        3200.0,
        "star",
        ("Kangkung",),
    ),
    MockMenuItem(
        "Pecel Sayuran",
        "MAKANAN",
        "SAYUR",
        "WSL-FD-004",
        18000.0,
        5500.0,
        "star",
        ("Bumbu Pecel", "Kangkung"),
    ),
    MockMenuItem(
        "Sayur Lodeh",
        "MAKANAN",
        "SAYUR",
        "WSL-FD-005",
        15000.0,
        4800.0,
        "star",
        ("Santan Kelapa",),
    ),
    MockMenuItem(
        "Nasi Putih",
        "MAKANAN",
        "NASI",
        "WSL-FD-006",
        8000.0,
        2200.0,
        "plow",
        ("Beras Cianjur",),
    ),
    MockMenuItem(
        "Tahu Isi",
        "MAKANAN",
        "LAUK",
        "WSL-FD-007",
        9000.0,
        3500.0,
        "plow",
        ("Tahu Bandung",),
    ),
    MockMenuItem(
        "Gulai Tahu Santan",
        "MAKANAN",
        "LAUK",
        "WSL-FD-008",
        22000.0,
        7000.0,
        "puzzle",
        ("Tahu Bandung", "Santan Kelapa"),
    ),
    MockMenuItem(
        "Es Gula Aren",
        "MINUMAN",
        "ES",
        "WSL-BVG-001",
        14000.0,
        3500.0,
        "puzzle",
        ("Gula Aren",),
    ),
    MockMenuItem(
        "Teh Manis Gula Aren",
        "MINUMAN",
        "TEH",
        "WSL-BVG-002",
        10000.0,
        2500.0,
        "filler",
        ("Gula Aren",),
    ),
    MockMenuItem(
        "Nasi Pecel",
        "MAKANAN",
        "NASI",
        "WSL-FD-009",
        20000.0,
        6500.0,
        "filler",
        ("Beras Cianjur", "Bumbu Pecel"),
    ),
    MockMenuItem(
        "Sambal Dadak",
        "MAKANAN",
        "SAMBAL",
        "WSL-FD-010",
        5000.0,
        1200.0,
        "side",
        (),
    ),
    MockMenuItem(
        "Kerupuk Putih",
        "MAKANAN",
        "SIDE",
        "WSL-FD-011",
        4000.0,
        1000.0,
        "side",
        (),
    ),
    MockMenuItem(
        "Air Mineral",
        "MINUMAN",
        "AIR",
        "WSL-BVG-003",
        5000.0,
        1500.0,
        "side",
        (),
    ),
)

# Intentional co-purchase pairs (both must appear on many shared bills).
COMBO_PAIRS: tuple[tuple[str, str], ...] = (
    ("Nasi Timbel", "Tumis Kangkung"),
    ("Nasi Timbel", "Tahu Goreng"),
    ("Nasi Putih", "Pecel Sayuran"),
    ("Gulai Tahu Santan", "Nasi Putih"),
)

# Inventar catalog names from graphql.scripts.dev_seed_inventar._CATALOG_SEEDS.
INVENTAR_CATALOG_NAMES = frozenset(
    {
        "Beras Cianjur",
        "Tahu Bandung",
        "Kangkung",
        "Bumbu Pecel",
        "Santan Kelapa",
        "Gula Aren",
    }
)


def _items_by_role(role: str) -> list[MockMenuItem]:
    return [item for item in MOCK_CATALOG if item.role == role]


def _catalog_by_name() -> dict[str, MockMenuItem]:
    return {item.menu: item for item in MOCK_CATALOG}


def _write_shell(ws: Worksheet, source_path: Path | None) -> list[str]:
    """Write ESB title/metadata/header rows; prefer headers from source if present."""
    headers = list(ESB_HEADERS)
    if source_path is not None and source_path.exists():
        source_wb = load_workbook(source_path, data_only=True)
        source_ws = source_wb[source_wb.sheetnames[0]]
        max_col = source_ws.max_column or 0
        if max_col >= len(ESB_HEADERS):
            source_headers = [
                source_ws.cell(HEADER_ROW, col).value for col in range(1, max_col + 1)
            ]
            if all(isinstance(h, str) and h for h in source_headers[: len(ESB_HEADERS)]):
                headers = [str(h) for h in source_headers if h is not None]
        source_wb.close()

    ws["A1"] = "Sales Recapitulation Detail Report"
    ws["A2"] = "Warung Sunda Lembur"
    ws["A4"] = "Generated"
    ws["B4"] = "dev-mock-warung-sunda"
    ws["A5"] = "Period"
    ws["B5"] = f"{PERIOD_START.strftime('%d-%m-%Y')} - {PERIOD_END.strftime('%d-%m-%Y')}"
    ws["A6"] = "Branch"
    ws["B6"] = "All"
    ws["A7"] = "Sales Type"
    ws["B7"] = "Sales"
    ws["A8"] = "Generated Username"
    ws["B8"] = "DEVMOCK"
    ws["A9"] = "Report File Name"
    ws["B9"] = "dev_mock_SalesRecapitulationDetailReport_1mo"

    for col_idx, header in enumerate(headers, start=1):
        ws.cell(HEADER_ROW, col_idx, value=header)
    return headers


def _pick_order_time(rng: random.Random, day: date) -> datetime:
    # Skew toward lunch and afternoon coffee hours.
    hour_weights = (
        [(h, 1) for h in range(8, 11)]
        + [(h, 4) for h in range(11, 14)]
        + [(h, 2) for h in range(14, 17)]
        + [(h, 3) for h in range(17, 20)]
    )
    hours = [h for h, w in hour_weights for _ in range(w)]
    hour = rng.choice(hours)
    minute = rng.randint(0, 59)
    second = rng.randint(0, 59)
    return datetime(day.year, day.month, day.day, hour, minute, second)


def _pick_line_items(rng: random.Random) -> list[MockMenuItem]:
    """Build 1–3 line items; bias stars and force combo pairs often."""
    by_name = _catalog_by_name()
    stars = _items_by_role("star")
    plows = _items_by_role("plow")
    puzzles = _items_by_role("puzzle")
    fillers = _items_by_role("filler")
    sides = _items_by_role("side")

    roll = rng.random()
    if roll < 0.35:
        pair = rng.choice(COMBO_PAIRS)
        items = [by_name[pair[0]], by_name[pair[1]]]
        if rng.random() < 0.25:
            items.append(rng.choice(sides + plows))
        return items

    if roll < 0.7:
        primary = rng.choice(stars)
        extras: list[MockMenuItem] = []
        if rng.random() < 0.55:
            extras.append(rng.choice(sides + plows + fillers))
        if rng.random() < 0.2:
            extras.append(rng.choice(puzzles + fillers))
        return [primary, *extras]

    if roll < 0.85:
        return [rng.choice(plows + fillers)]

    return [rng.choice(puzzles + fillers + sides)]


def _line_row(
    *,
    headers: list[str],
    sales_number: str,
    bill_number: str,
    order_time: datetime,
    item: MockMenuItem,
    qty: int,
    payment: str,
) -> list[object]:
    subtotal = item.price * qty
    sales_date = datetime(order_time.year, order_time.month, order_time.day)
    values: dict[str, object] = {
        "Sales Number": sales_number,
        "Bill Number": bill_number,
        "Sales Type": "Sales",
        "Batch Order": "1",
        "Table Section": "Quick Service",
        "Table Name": "Quick Service",
        "Sales Date": sales_date,
        "Sales Date In": order_time,
        "Sales Date Out": order_time,
        "Branch": "Warung Sunda Lembur",
        "Brand": "Warung Sunda Lembur",
        "City": "Bandung",
        "Area": None,
        "Visit Purpose": "DINE IN",
        "Regular Member Code": None,
        "Regular Member Name": None,
        "Loyalty Member Code": None,
        "Loyalty Member Name": None,
        "Loyalty Member Type": None,
        "Employee Code": None,
        "Employee Name": None,
        "External Employee Code": None,
        "External Employee Name": None,
        "Customer Name": None,
        "Payment Method": payment,
        "Menu Category": item.menu_category,
        "Menu Category Detail": item.menu_category_detail,
        "Menu": item.menu,
        "Custom Menu Name": None,
        "Menu Code": item.menu_code,
        "Menu Notes": None,
        "Order Mode": "POS Lite",
        "Qty": qty,
        "Price": item.price,
        "Subtotal": subtotal,
        "Discount": 0.0,
        "Service Charge": 0.0,
        "Tax": 0.0,
        "VAT": 0.0,
        "Total": subtotal,
        "Nett Sales": subtotal,
        "DPP": 0.0,
        "Bill Discount": 0.0,
        "Total After Bill Discount": subtotal,
        "Waiter": None,
        "Order Time": order_time,
    }
    return [values.get(header) for header in headers]


def _synthesize_rows(headers: list[str], rng: random.Random) -> list[list[object]]:
    rows: list[list[object]] = []
    bill_seq = 0
    day = PERIOD_START
    payments = ("QRIS", "Cash", "Debit Card")

    while day <= PERIOD_END:
        for _ in range(BILLS_PER_DAY):
            bill_seq += 1
            bill_number = f"DEV-SCM{bill_seq:010d}"
            sales_number = f"DEV-SSCM{bill_seq:010d}"
            order_time = _pick_order_time(rng, day)
            payment = rng.choice(payments)
            for item in _pick_line_items(rng):
                qty = 1 if item.role in {"puzzle", "side"} else rng.choice((1, 1, 1, 2))
                rows.append(
                    _line_row(
                        headers=headers,
                        sales_number=sales_number,
                        bill_number=bill_number,
                        order_time=order_time,
                        item=item,
                        qty=qty,
                        payment=payment,
                    )
                )
        day += timedelta(days=1)

    return rows


def _write_cogs(cogs_path: Path) -> None:
    payload = [{"menu": item.menu, "cogs": item.cogs} for item in MOCK_CATALOG]
    cogs_path.parent.mkdir(parents=True, exist_ok=True)
    cogs_path.write_text(json.dumps(payload, indent=2) + "\n")


def _smoke_check(output_path: Path, cogs_path: Path) -> None:
    payload = output_path.read_bytes()
    detected = detect_pos_from_excel_bytes(payload)
    if detected != "esb":
        raise SystemExit(f"ERROR: mock POS detect expected 'esb', got {detected!r}")

    df = normalize_esb_excel(payload)
    if df.empty:
        raise SystemExit("ERROR: normalize_esb_excel returned no rows")

    snabb_cafe_names = {
        "Es Kopi Susu Aren",
        "Ice Americano",
        "Lembur Signature Latte",
        "Crispy Tempeh Wrap",
    }
    overlap = snabb_cafe_names.intersection(set(df["menu"].unique()))
    if overlap:
        raise SystemExit(f"ERROR: mock contains unexpected cafe menus: {sorted(overlap)}")

    linked = {ingredient for item in MOCK_CATALOG for ingredient in item.inventar_ingredients}
    missing_inventar = linked - INVENTAR_CATALOG_NAMES
    if missing_inventar:
        raise SystemExit(
            f"ERROR: dish ingredients not in inventar seed catalog: {sorted(missing_inventar)}"
        )
    unused_inventar = INVENTAR_CATALOG_NAMES - linked
    if unused_inventar:
        raise SystemExit(
            f"ERROR: inventar ingredients unused by any dish: {sorted(unused_inventar)}"
        )

    order_times = df["order_time"]
    print(
        f"Smoke: pos={detected} rows={len(df)} "
        f"order_time={order_times.min()} -> {order_times.max()} "
        f"menus={df['menu'].nunique()} bills={df['bill_number'].nunique()}"
    )

    raw = json.loads(cogs_path.read_text())
    cogs_by_menu = {entry["menu"]: float(entry["cogs"]) for entry in raw}
    order_rows = [
        {
            "menu": row["menu"],
            "qty": int(row["qty"]),
            "total_after_bill_discount": float(row["total_after_bill_discount"]),
            "menu_category": row.get("menu_category"),
            "menu_category_detail": row.get("menu_category_detail"),
        }
        for row in df.to_dict("records")
    ]
    matrix = compute_menu_engineering_from_orders(order_rows, cogs_by_menu)
    stars = [item for item in matrix["items"] if item.get("category") == "star"]
    if len(stars) < 1:
        raise SystemExit("ERROR: expected at least one menu-engineering star")
    print(f"Smoke: stars={len(stars)} sample={[s['menu'] for s in stars[:5]]}")

    basket_rows = [
        {
            "bill_number": row["bill_number"],
            "menu": row["menu"],
            "qty": int(row["qty"]),
        }
        for row in df.to_dict("records")
    ]
    affinities = compute_menu_basket_affinities_from_orders(basket_rows)
    strong = [p for p in affinities["pairs"] if float(p["lift"]) >= STRONG_LIFT_THRESHOLD]
    if len(strong) < 1:
        raise SystemExit("ERROR: expected at least one strong combo pair (lift >= 1.5)")
    print(f"Smoke: strong_pairs(lift>={STRONG_LIFT_THRESHOLD})={len(strong)}")


def generate(
    *,
    source_path: Path | None,
    output_path: Path,
    cogs_output_path: Path,
) -> int:
    rng = random.Random(RNG_SEED)
    out_wb = Workbook()
    out_ws = out_wb.active
    assert out_ws is not None
    out_ws.title = "Report"

    headers = _write_shell(out_ws, source_path)
    missing = [h for h in ESB_HEADERS if h not in headers]
    if missing:
        raise SystemExit(f"ERROR: ESB headers missing required columns: {missing}")

    rows = _synthesize_rows(headers, rng)
    for offset, row in enumerate(rows):
        excel_row = DATA_START_ROW + offset
        for col_idx, value in enumerate(row, start=1):
            out_ws.cell(excel_row, col_idx, value=value)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    out_wb.save(output_path)
    out_wb.close()
    _write_cogs(cogs_output_path)

    print(f"Wrote {output_path} ({len(rows)} synthetic data rows); cogs={cogs_output_path}")
    _smoke_check(output_path, cogs_output_path)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Generate a synthetic ESB mock sales Excel (SNABB structure only) for make dev-data."
        )
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE if DEFAULT_SOURCE.exists() else None,
        help=(
            "Optional SNABB workbook used only to copy header column names "
            f"(default: {DEFAULT_SOURCE} when present)"
        ),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output mock path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--cogs-output",
        type=Path,
        default=DEFAULT_COGS_OUTPUT,
        help=f"Matching mock COGS JSON (default: {DEFAULT_COGS_OUTPUT})",
    )
    args = parser.parse_args(argv)
    return generate(
        source_path=args.source,
        output_path=args.output,
        cogs_output_path=args.cogs_output,
    )


if __name__ == "__main__":
    sys.exit(main())
