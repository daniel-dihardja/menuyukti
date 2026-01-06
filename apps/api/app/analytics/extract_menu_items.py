import pandas as pd
from typing import List, Dict


def extract_menu_items(df: pd.DataFrame) -> List[Dict]:
    """
    Extract unique menu items,
    sorted by total quantity sold (descending).

    Expects df to contain:
    - menu
    - qty
    """
    if df.empty:
        return []

    df = df.copy()

    menu_items = (
        df.groupby("menu")
        .agg(
            quantity=("qty", "sum"),  # used only for sorting
        )
        .reset_index()
        .sort_values("quantity", ascending=False)
        .drop(columns=["quantity"])  # remove before returning
    )

    return menu_items.to_dict(orient="records")
