import pandas as pd
from io import BytesIO

from menuyukti.core.analytics.utils import normalize_columns
from menuyukti.core.models.pos_transaction import POSTransactionLineItem


def normalize_esb_excel_with_rejections(
    data: bytes,
    skiprows: int = 10,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load and normalize ESB Excel export into:
    - accepted rows (typed and valid)
    - rejected rows with `rejection_reason`

    Uses POSTransactionLineItem model to define the data contract.
    """
    required_columns = POSTransactionLineItem.get_required_columns()
    COL = POSTransactionLineItem

    df = pd.read_excel(
        BytesIO(data),
        skiprows=skiprows,
    )
    df = normalize_columns(df)

    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df_required = df[required_columns].copy()

    missing_required_mask = df_required.isna().any(axis=1)
    rejected_missing = df_required[missing_required_mask].copy()
    rejected_missing["rejection_reason"] = "missing_required_field"

    accepted = df_required[~missing_required_mask].copy()

    accepted[COL.QTY] = pd.to_numeric(accepted[COL.QTY], errors="coerce")
    accepted[COL.PRICE] = pd.to_numeric(accepted[COL.PRICE], errors="coerce")
    accepted[COL.TOTAL_AFTER_BILL_DISCOUNT] = pd.to_numeric(
        accepted[COL.TOTAL_AFTER_BILL_DISCOUNT],
        errors="coerce",
    )
    accepted[COL.ORDER_TIME] = pd.to_datetime(accepted[COL.ORDER_TIME], errors="coerce")

    invalid_conversion_mask = accepted.isna().any(axis=1)
    rejected_invalid = accepted[invalid_conversion_mask].copy()
    rejected_invalid["rejection_reason"] = "invalid_type_conversion"

    cleaned = accepted[~invalid_conversion_mask].copy()

    rejected = pd.concat(
        [rejected_missing, rejected_invalid],
        ignore_index=True,
    )
    return cleaned, rejected


def normalize_esb_excel(data: bytes, skiprows: int = 10) -> pd.DataFrame:
    """
    Load, normalize, and transform an ESB Excel export into clean sales data.
    """
    cleaned, _ = normalize_esb_excel_with_rejections(data, skiprows=skiprows)
    return cleaned
