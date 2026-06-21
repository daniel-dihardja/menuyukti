from pathlib import Path

import pytest

from menuyukti.core.analytics.esb import normalize_esb_excel, normalize_esb_excel_with_rejections
from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes
from menuyukti.core.models.pos_mapping import get_config

ROOT_DIR = Path(__file__).resolve().parents[6]
REPORT_FILE = ROOT_DIR / "reports" / "SalesRecapitulationDetailReport_JUN_2026.xlsx"


def test_get_config_esb_skip_rows_matches_header_row():
    skip_rows, rename_map = get_config("esb")
    assert skip_rows == 10
    assert rename_map == {}


def test_detect_pos_from_excel_bytes_recognizes_esb_sales_recapitulation_detail_report():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected ESB report at 'reports/SalesRecapitulationDetailReport_JUN_2026.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    assert detect_pos_from_excel_bytes(payload) == "esb"


def test_normalize_esb_excel_normalizes_sales_recapitulation_detail_rows():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected ESB report at 'reports/SalesRecapitulationDetailReport_JUN_2026.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    df = normalize_esb_excel(payload)

    assert not df.empty
    assert {
        "bill_number",
        "menu",
        "qty",
        "price",
        "total_after_bill_discount",
        "order_time",
        "menu_category",
        "menu_category_detail",
    }.issubset(df.columns)
    assert df["bill_number"].str.startswith("SCM").all()
    assert (df["qty"] > 0).all()
    assert (df["total_after_bill_discount"] > 0).all()


def test_normalize_esb_excel_with_rejections_accepts_majority_of_rows():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected ESB report at 'reports/SalesRecapitulationDetailReport_JUN_2026.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    cleaned, rejected = normalize_esb_excel_with_rejections(payload)

    assert len(cleaned) == 977
    assert len(rejected) == 4
