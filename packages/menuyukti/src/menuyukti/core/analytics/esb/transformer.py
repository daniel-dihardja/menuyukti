import pandas as pd

from menuyukti.core.models.pos_transaction import POSTransactionLineItem


def filter_required_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensure the DataFrame contains all required columns and return a cleaned subset.

    Uses POSTransactionLineItem model to define the data contract.
    """
    required_columns = POSTransactionLineItem.get_required_columns()

    # Check for missing columns
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Filter to required columns and drop rows with missing values
    df_cleaned = df[required_columns].dropna()

    return df_cleaned


def convert_column_types(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert column data types for numeric and datetime fields.
    Remove rows that become invalid after conversion.

    Uses POSTransactionLineItem constants for type-safe column access.
    """
    # Use model constants for column names
    COL = POSTransactionLineItem

    # Numeric conversions
    df[COL.QTY] = pd.to_numeric(df[COL.QTY], errors="coerce")
    df[COL.PRICE] = pd.to_numeric(df[COL.PRICE], errors="coerce")
    df[COL.TOTAL_AFTER_BILL_DISCOUNT] = pd.to_numeric(
        df[COL.TOTAL_AFTER_BILL_DISCOUNT],
        errors="coerce",
    )

    # Datetime conversion
    df[COL.ORDER_TIME] = pd.to_datetime(df[COL.ORDER_TIME], errors="coerce")

    # Drop rows where any required field is still NaN
    required_columns = POSTransactionLineItem.get_required_columns()
    df = df.dropna(subset=required_columns)

    return df
