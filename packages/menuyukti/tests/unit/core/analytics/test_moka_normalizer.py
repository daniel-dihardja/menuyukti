from pathlib import Path

from menuyukti.core.analytics.esb import normalize_esb_excel
from menuyukti.core.analytics.moka import normalize_moka_excel, normalize_moka_excel_with_rejections
from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes
from menuyukti.core.models.pos_mapping import get_config

PACKAGE_ROOT = Path(__file__).resolve().parents[4]
FIXTURES_ROOT = PACKAGE_ROOT / "fixtures" / "pos-sales-reports"
MOKA_FIXTURE = FIXTURES_ROOT / "moka" / "ItemDetails_DEMO.xlsx"
ESB_FIXTURE = FIXTURES_ROOT / "esb" / "SalesRecapitulationDetailReport_DEMO.xlsx"


def test_get_config_moka_skip_rows_matches_header_row():
    skip_rows, rename_map = get_config("moka")
    assert skip_rows == 3
    assert rename_map == {}


def test_detect_pos_from_excel_bytes_recognizes_moka_item_details_report():
    payload = MOKA_FIXTURE.read_bytes()
    assert detect_pos_from_excel_bytes(payload) == "moka"


def test_normalize_moka_excel_normalizes_item_details_rows():
    payload = MOKA_FIXTURE.read_bytes()
    df = normalize_moka_excel(payload)

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
    assert df["bill_number"].str.startswith("DEMO-").all()
    assert (df["qty"] > 0).all()
    assert (df["total_after_bill_discount"] > 0).all()
    assert len(df) == 9
    assert df["bill_number"].nunique() == 4


def test_normalize_moka_excel_with_rejections_accepts_demo_rows():
    payload = MOKA_FIXTURE.read_bytes()
    cleaned, rejected = normalize_moka_excel_with_rejections(payload)

    assert len(cleaned) == 9
    assert rejected.empty


def test_normalize_moka_excel_matches_shared_esb_demo_line_items():
    import pandas as pd

    moka = normalize_moka_excel(MOKA_FIXTURE.read_bytes())
    esb = normalize_esb_excel(ESB_FIXTURE.read_bytes())

    key_cols = [
        "bill_number",
        "menu",
        "qty",
        "price",
        "total_after_bill_discount",
        "menu_category",
        "menu_category_detail",
    ]
    moka_sorted = moka[key_cols].sort_values(key_cols).reset_index(drop=True)
    esb_sorted = esb[key_cols].sort_values(key_cols).reset_index(drop=True)
    # StringDtype vs object str can differ across normalizers; compare values only.
    pd.testing.assert_frame_equal(moka_sorted, esb_sorted, check_dtype=False)
