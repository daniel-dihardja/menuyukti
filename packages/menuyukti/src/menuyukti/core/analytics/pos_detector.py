from typing import Optional
from openpyxl import load_workbook
from io import BytesIO

from menuyukti.core.models.pos_mapping import detect


def detect_pos_from_excel_bytes(data: bytes) -> Optional[str]:
    """
    Detect POS by reading cell A1 from the first worksheet.

    Uses POS_CONFIG registry - add new POS systems in pos_mapping.py.

    Returns:
        Registered POS key (e.g. ``"esb"``), or ``None`` when A1 is not a
        string or does not match any known pattern.
    """
    wb = load_workbook(filename=BytesIO(data), read_only=True, data_only=True)
    ws = wb.worksheets[0]
    value = ws["A1"].value

    # QUINO ItemSalesReport.xlsx uses a fixed first-row header:
    # Code | Name | Qty | ... | Net Sales
    if (
        isinstance(ws["A1"].value, str)
        and isinstance(ws["B1"].value, str)
        and isinstance(ws["C1"].value, str)
        and isinstance(ws["G1"].value, str)
        and ws["A1"].value.strip().lower() == "code"
        and ws["B1"].value.strip().lower() == "name"
        and ws["C1"].value.strip().lower() == "qty"
        and ws["G1"].value.strip().lower() == "net sales"
    ):
        return "quino"

    if not isinstance(value, str):
        return None

    result = detect(value.strip())
    return None if result == "unknown" else result
