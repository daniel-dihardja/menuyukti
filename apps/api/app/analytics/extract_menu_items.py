import pandas as pd
from typing import List, Dict


def extract_menu_items(df: pd.DataFrame) -> List[Dict]:
    """
    Extract unique menu items with their price,
    sorted by total quantity sold (descending).

    Expects df to contain:
    - menu
    - price
    - qty
    """
    if df.empty:
        return []

    df = df.copy()

    menu_items = (
        df.groupby("menu")
        .agg(
            price=("price", "mean"),  # average price per item
            quantity=("qty", "sum"),  # used only for sorting
        )
        .reset_index()
        .sort_values("quantity", ascending=False)
        .drop(columns=["quantity"])  # remove before returning
    )

    return menu_items.to_dict(orient="records")
