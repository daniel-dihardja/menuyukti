from io import BytesIO
from typing import Optional

from openpyxl import load_workbook

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
    try:
        value = wb.worksheets[0]["A1"].value
    finally:
        wb.close()

    if not isinstance(value, str):
        return None

    result = detect(value.strip())
    return None if result == "unknown" else result
