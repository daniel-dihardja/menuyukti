import pandas as pd
from io import BytesIO

from marketing_engine.core.analytics.utils import normalize_columns
from marketing_engine.core.analytics.esb.transformer import REQUIRED_COLUMNS


def normalize_esb_excel_with_rejections(
    data: bytes,
    skiprows: int = 11,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load and normalize ESB Excel export into:
    - accepted rows (typed and valid)
    - rejected rows with `rejection_reason`
    """
    df = pd.read_excel(
        BytesIO(data),
        skiprows=skiprows,
    )
    df = normalize_columns(df)

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df_required = df[REQUIRED_COLUMNS].copy()

    missing_required_mask = df_required.isna().any(axis=1)
    rejected_missing = df_required[missing_required_mask].copy()
    rejected_missing["rejection_reason"] = "missing_required_field"

    accepted = df_required[~missing_required_mask].copy()

    accepted["qty"] = pd.to_numeric(accepted["qty"], errors="coerce")
    accepted["price"] = pd.to_numeric(accepted["price"], errors="coerce")
    accepted["total_after_bill_discount"] = pd.to_numeric(
        accepted["total_after_bill_discount"],
        errors="coerce",
    )
    accepted["order_time"] = pd.to_datetime(accepted["order_time"], errors="coerce")

    invalid_conversion_mask = accepted.isna().any(axis=1)
    rejected_invalid = accepted[invalid_conversion_mask].copy()
    rejected_invalid["rejection_reason"] = "invalid_type_conversion"

    cleaned = accepted[~invalid_conversion_mask].copy()

    rejected = pd.concat(
        [rejected_missing, rejected_invalid],
        ignore_index=True,
    )
    return cleaned, rejected


def normalize_esb_excel(data: bytes, skiprows: int = 11) -> pd.DataFrame:
    """
    Load, normalize, and transform an ESB Excel export into clean sales data.
    """
    cleaned, _ = normalize_esb_excel_with_rejections(data, skiprows=skiprows)
    return cleaned
