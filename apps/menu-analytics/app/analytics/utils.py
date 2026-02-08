import pandas as pd


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize DataFrame column names into snake_case.
    """
    df = df.copy()

    df.columns = (
        df.columns.astype(str)
        .str.strip()
        .str.replace("\u00a0", " ", regex=False)
        .str.replace("\t", "", regex=False)
        .str.lower()
        .str.replace(" ", "_")
    )

    return df
