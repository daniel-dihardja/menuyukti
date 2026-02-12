import pandas as pd
from io import BytesIO

from marketing_engine.core.analytics.utils import normalize_columns
from marketing_engine.core.analytics.esb.transformer import (
    filter_required_columns,
    convert_column_types,
)


def normalize_esb_excel(data: bytes, skiprows: int = 11) -> pd.DataFrame:
    """
    Load, normalize, and transform an ESB Excel export into clean sales data.
    """
    # 1. Load Excel
    df = pd.read_excel(
        BytesIO(data),
        skiprows=skiprows,
    )

    # 2. Normalize column names (shared utility)
    df = normalize_columns(df)

    # 3. Filter to required columns & validate presence
    df = filter_required_columns(df)

    # 4. Convert column types & drop invalid rows
    df = convert_column_types(df)

    return df
