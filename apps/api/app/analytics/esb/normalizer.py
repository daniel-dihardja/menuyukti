import pandas as pd
from io import BytesIO

from ..utils import normalize_columns


def normalize_esb_excel(data: bytes, skiprows: int = 11) -> pd.DataFrame:
    """
    Load and normalize an ESB Excel export.
    """
    df = pd.read_excel(
        BytesIO(data),
        skiprows=skiprows,
    )

    df = normalize_columns(df)

    return df
