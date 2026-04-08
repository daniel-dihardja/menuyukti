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

    if not isinstance(value, str):
        return None

    result = detect(value.strip())
    return None if result == "unknown" else result
