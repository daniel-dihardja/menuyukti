"""Generate a synthetic 1-month ESB sales mock for make dev-data.

Uses a SNABB Sales Recapitulation Detail Report only for workbook shell
(A1 title, metadata row layout, header columns). Menu items are a typical
Berlin cafe catalog (Kaffeestube Mitte) — not inventar-aligned Warung dishes
and not a copy of live SNABB cafe sales.

Also writes a matching ``dev_mock_menu_cogs.json`` so menu-engineering stars
and combo lift work with the analytics seed on Kaffeestube Mitte.
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
LOCATION_NAME = "Kaffeestube Mitte"
LOCATION_CITY = "Berlin"
LOCATION_BRAND = "Kaffeestube"

# Mon=0 … Sun=6 — Sat busy, Tue/Sun softer for clear slot contrast.
WEEKDAY_BILL_MULTIPLIER: dict[int, float] = {
    0: 1.0,  # Mon
    1: 0.75,  # Tue
    2: 0.95,  # Wed
    3: 1.05,  # Thu
    4: 1.15,  # Fri
    5: 1.35,  # Sat
    6: 0.7,  # Sun
}

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


Daypart = str  # breakfast | lunch | afternoon | any


@dataclass(frozen=True)
class MockMenuItem:
    menu: str
    menu_category: str
    menu_category_detail: str
    menu_code: str
    price: float
    cogs: float
    role: str  # star | plow | puzzle | filler | side
    # Preferred dayparts for heatmap contrast (empty / {"any"} = all dayparts).
    daypart_bias: frozenset[Daypart] = frozenset({"any"})


def _bias(*parts: Daypart) -> frozenset[Daypart]:
    return frozenset(parts)


# Berlin cafe catalog (EUR). Roles tuned so smoke checks yield stars + strong lift.
MOCK_CATALOG: tuple[MockMenuItem, ...] = (
    MockMenuItem(
        "Flat White",
        "COFFEE",
        "ESPRESSO",
        "KSM-CF-001",
        3.8,
        0.9,
        "star",
        _bias("breakfast"),
    ),
    MockMenuItem(
        "Cappuccino",
        "COFFEE",
        "ESPRESSO",
        "KSM-CF-002",
        3.6,
        0.85,
        "star",
        _bias("breakfast"),
    ),
    MockMenuItem(
        "Avocado Toast",
        "FOOD",
        "TOAST",
        "KSM-FD-001",
        9.5,
        3.2,
        "star",
        _bias("breakfast", "lunch"),
    ),
    MockMenuItem(
        "Filter Coffee",
        "COFFEE",
        "BREW",
        "KSM-CF-003",
        3.2,
        2.2,  # thin margin → plow_horse when volume is high
        "plow",
        _bias("breakfast"),
    ),
    MockMenuItem(
        "Espresso",
        "COFFEE",
        "ESPRESSO",
        "KSM-CF-004",
        2.4,
        1.6,
        "plow",
        _bias("breakfast"),
    ),
    MockMenuItem(
        "Buttercroissant",
        "BAKERY",
        "PASTRY",
        "KSM-BK-001",
        2.8,
        2.0,
        "plow",
        _bias("breakfast"),
    ),
    MockMenuItem(
        "Banana Bread",
        "BAKERY",
        "CAKE",
        "KSM-BK-002",
        3.5,
        0.9,
        "side",
        _bias("afternoon"),
    ),
    MockMenuItem(
        "Cheesecake",
        "BAKERY",
        "CAKE",
        "KSM-BK-003",
        4.8,
        1.4,
        "side",
        _bias("afternoon"),
    ),
    MockMenuItem(
        "Matcha Latte",
        "TEA",
        "LATTE",
        "KSM-TE-001",
        4.5,
        1.1,
        "puzzle",
        _bias("afternoon"),
    ),
    MockMenuItem(
        "Chai Latte",
        "TEA",
        "LATTE",
        "KSM-TE-002",
        4.2,
        1.0,
        "filler",
        _bias("afternoon"),
    ),
    MockMenuItem(
        "Granola Bowl",
        "FOOD",
        "BOWL",
        "KSM-FD-002",
        8.5,
        2.8,
        "puzzle",
        _bias("breakfast", "lunch"),
    ),
    MockMenuItem(
        "Toastie",
        "FOOD",
        "TOAST",
        "KSM-FD-003",
        7.5,
        2.4,
        "filler",
        _bias("lunch"),
    ),
    MockMenuItem(
        "Fresh OJ",
        "SOFTDRINKS",
        "JUICE",
        "KSM-SD-001",
        4.0,
        1.2,
        "side",
        _bias("breakfast", "lunch"),
    ),
    MockMenuItem(
        "Still Water",
        "SOFTDRINKS",
        "WATER",
        "KSM-SD-002",
        2.5,
        1.9,
        "plow",
        _bias("any"),
    ),
)

# Intentional co-purchase pairs (both must appear on many shared bills).
COMBO_PAIRS: tuple[tuple[str, str], ...] = (
    ("Cappuccino", "Buttercroissant"),
    ("Flat White", "Banana Bread"),
    ("Matcha Latte", "Cheesecake"),
    ("Avocado Toast", "Fresh OJ"),
)

# Reject leftover inventar / Warung dish names if generation regresses.
WARUNG_DISH_NAMES = frozenset(
    {
        "Nasi Timbel",
        "Tahu Goreng",
        "Tumis Kangkung",
        "Pecel Sayuran",
        "Sayur Lodeh",
        "Nasi Putih",
        "Gulai Tahu Santan",
        "Es Gula Aren",
    }
)


def _items_by_role(role: str) -> list[MockMenuItem]:
    return [item for item in MOCK_CATALOG if item.role == role]


def _catalog_by_name() -> dict[str, MockMenuItem]:
    return {item.menu: item for item in MOCK_CATALOG}


def _daypart_for_hour(hour: int) -> str:
    if hour < 11:
        return "breakfast"
    if hour < 15:
        return "lunch"
    return "afternoon"


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
    ws["A2"] = LOCATION_NAME
    ws["A4"] = "Generated"
    ws["B4"] = "dev-mock-berlin-cafe"
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
    # Berlin cafe: strong breakfast + Kaffee & Kuchen afternoon; lunch steady; soft close.
    hour_weights = (
        [(h, 5) for h in range(8, 11)]
        + [(h, 3) for h in range(11, 14)]
        + [(h, 4) for h in range(14, 17)]
        + [(h, 2) for h in range(17, 19)]
    )
    hours = [h for h, w in hour_weights for _ in range(w)]
    hour = rng.choice(hours)
    minute = rng.randint(0, 59)
    second = rng.randint(0, 59)
    return datetime(day.year, day.month, day.day, hour, minute, second)


# Soft daypart preference: peaks stay clear, but off-peak hours still get some sales.
DAYPART_WEIGHT_ON = 6
DAYPART_WEIGHT_OFF = 1


def _matches_daypart(item: MockMenuItem, daypart: str) -> bool:
    bias = item.daypart_bias
    return "any" in bias or daypart in bias


def _item_daypart_weight(item: MockMenuItem, daypart: str) -> int:
    return DAYPART_WEIGHT_ON if _matches_daypart(item, daypart) else DAYPART_WEIGHT_OFF


def _weighted_choice(rng: random.Random, candidates: list[MockMenuItem], daypart: str) -> MockMenuItem:
    weights = [_item_daypart_weight(item, daypart) for item in candidates]
    return rng.choices(candidates, weights=weights, k=1)[0]


def _pick_line_items(rng: random.Random, order_time: datetime) -> list[MockMenuItem]:
    """Build 1–3 line items; soft daypart weights + forced combo pairs.

    Volume mix is tuned so menu-engineering yields stars *and* plow_horses:
    high-volume thin-margin plow SKUs must sell enough to clear avg qty while
    staying below avg contribution margin.
    """
    by_name = _catalog_by_name()
    stars = _items_by_role("star")
    plows = _items_by_role("plow")
    puzzles = _items_by_role("puzzle")
    fillers = _items_by_role("filler")
    sides = _items_by_role("side")
    daypart = _daypart_for_hour(order_time.hour)
    catalog = list(MOCK_CATALOG)

    roll = rng.random()
    if roll < 0.28:
        # Soft-prefer combo pairs that fit the daypart (never hard-exclude).
        pair_weights = [
            (
                DAYPART_WEIGHT_ON
                if (
                    _matches_daypart(by_name[a], daypart)
                    or _matches_daypart(by_name[b], daypart)
                )
                else DAYPART_WEIGHT_OFF
            )
            for a, b in COMBO_PAIRS
        ]
        pair = rng.choices(list(COMBO_PAIRS), weights=pair_weights, k=1)[0]
        items = [by_name[pair[0]], by_name[pair[1]]]
        if rng.random() < 0.3:
            items.append(_weighted_choice(rng, plows + sides, daypart))
        return items

    if roll < 0.52:
        primary = _weighted_choice(rng, stars, daypart)
        extras: list[MockMenuItem] = []
        if rng.random() < 0.55:
            extras.append(_weighted_choice(rng, plows + sides + fillers, daypart))
        if rng.random() < 0.2:
            extras.append(_weighted_choice(rng, puzzles + fillers, daypart))
        return [primary, *extras]

    # Dedicated plow path — high volume, thin margin items for plow_horse quadrant.
    if roll < 0.78:
        primary = _weighted_choice(rng, plows, daypart)
        extras: list[MockMenuItem] = []
        if rng.random() < 0.35:
            extras.append(_weighted_choice(rng, plows + sides + fillers, daypart))
        return [primary, *extras]

    if roll < 0.88:
        return [_weighted_choice(rng, fillers + puzzles, daypart)]

    # Ambient noise: any catalog item, still soft-weighted — fills sparse hours.
    return [_weighted_choice(rng, catalog, daypart)]


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
    subtotal = round(item.price * qty, 2)
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
        "Branch": LOCATION_NAME,
        "Brand": LOCATION_BRAND,
        "City": LOCATION_CITY,
        "Area": "Mitte",
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


def _bills_for_day(day: date) -> int:
    multiplier = WEEKDAY_BILL_MULTIPLIER.get(day.weekday(), 1.0)
    return max(15, int(round(BILLS_PER_DAY * multiplier)))


def _synthesize_rows(headers: list[str], rng: random.Random) -> list[list[object]]:
    rows: list[list[object]] = []
    bill_seq = 0
    day = PERIOD_START
    payments = ("Card", "Cash", "Apple Pay")

    while day <= PERIOD_END:
        for _ in range(_bills_for_day(day)):
            bill_seq += 1
            bill_number = f"DEV-KSM{bill_seq:010d}"
            sales_number = f"DEV-SSKM{bill_seq:010d}"
            order_time = _pick_order_time(rng, day)
            payment = rng.choice(payments)
            for item in _pick_line_items(rng, order_time):
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

    overlap = WARUNG_DISH_NAMES.intersection(set(df["menu"].unique()))
    if overlap:
        raise SystemExit(f"ERROR: mock contains unexpected Warung dishes: {sorted(overlap)}")

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
    by_cat: dict[str, list[str]] = {}
    for item in matrix["items"]:
        by_cat.setdefault(str(item.get("category")), []).append(str(item["menu"]))
    stars = by_cat.get("star", [])
    plows = by_cat.get("plow_horse", [])
    if len(stars) < 1:
        raise SystemExit("ERROR: expected at least one menu-engineering star")
    if len(plows) < 1:
        raise SystemExit(
            "ERROR: expected at least one menu-engineering plow_horse "
            f"(got categories={{{', '.join(f'{k}:{len(v)}' for k, v in sorted(by_cat.items()))}}})"
        )
    print(
        f"Smoke: stars={len(stars)} sample={stars[:5]}; "
        f"plow_horses={len(plows)} sample={plows[:5]}; "
        f"puzzles={len(by_cat.get('puzzle', []))} low_end={len(by_cat.get('low_end', []))}"
    )

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
            "Generate a synthetic Berlin cafe ESB mock sales Excel "
            "(SNABB structure only) for make dev-data."
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
