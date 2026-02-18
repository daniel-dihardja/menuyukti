from io import BytesIO

from openpyxl import Workbook

from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes


def _workbook_bytes(a1_value):
    wb = Workbook()
    ws = wb.active
    ws["A1"] = a1_value
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_detect_pos_esb():
    data = _workbook_bytes("Sales Recapitulation Detail Report")

    assert detect_pos_from_excel_bytes(data) == "esb"


def test_detect_pos_unknown():
    data = _workbook_bytes("Some Other Report")

    assert detect_pos_from_excel_bytes(data) == "unknown"


def test_detect_pos_non_string():
    data = _workbook_bytes(123)

    assert detect_pos_from_excel_bytes(data) is None
