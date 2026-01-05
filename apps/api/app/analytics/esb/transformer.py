import pandas as pd

# Columns required for processing ESB POS sales
REQUIRED_COLUMNS = [
    "bill_number",
    "menu",
    "qty",
    "price",
    "total_after_bill_discount",
    "order_time",
]


def filter_required_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensure the DataFrame contains all required columns and return a cleaned subset.
    """

    # Check for missing columns
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Filter to required columns and drop rows with missing values
    df_cleaned = df[REQUIRED_COLUMNS].dropna()

    return df_cleaned


def convert_column_types(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert column data types for numeric and datetime fields.
    Remove rows that become invalid after conversion.
    """

    # Numeric conversions
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce")
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df["total_after_bill_discount"] = pd.to_numeric(
        df["total_after_bill_discount"],
        errors="coerce",
    )

    # Datetime conversion
    df["order_time"] = pd.to_datetime(df["order_time"], errors="coerce")

    # Drop rows where any required field is still NaN
    df = df.dropna(subset=REQUIRED_COLUMNS)

    return df
