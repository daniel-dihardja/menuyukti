import pandas as pd
from typing import List, Dict


def calculate_popularity_index(df: pd.DataFrame) -> List[Dict]:
    """
    Calculate popularity index per menu item.

    Popularity = total quantity of menu item / total quantity of all items

    Expects df to contain:
    - menu
    - qty
    """
    if df.empty:
        raise ValueError("DataFrame is empty. Cannot calculate popularity index.")

    df = df.copy()

    total_qty = df["qty"].sum()
    if total_qty == 0:
        raise ValueError("Total quantity is zero. Cannot calculate popularity index.")

    menu_qty = df.groupby("menu")["qty"].sum().sort_values(ascending=False)

    popularity = (menu_qty / total_qty).round(6).reset_index()
    popularity.columns = ["menu", "popularity"]

    return popularity.to_dict(orient="records")
