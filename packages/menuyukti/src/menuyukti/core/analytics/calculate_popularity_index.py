from typing import TypedDict

import pandas as pd

from menuyukti.core.analytics.frame_contracts import (
    popularity_index_columns,
    require_columns,
)


class PopularityIndexRow(TypedDict):
    menu: str
    popularity: float
    quantity: int


def calculate_popularity_index(df: pd.DataFrame) -> list[PopularityIndexRow]:
    """
    Calculate popularity index per menu item.

    Popularity = total quantity of menu item / total quantity of all items

    Expects df to contain:
    - menu
    - qty
    """
    require_columns(
        df,
        popularity_index_columns(),
        context="calculate_popularity_index",
    )
    if df.empty:
        raise ValueError("DataFrame is empty. Cannot calculate popularity index.")

    df = df.copy()

    total_qty = df["qty"].sum()
    if total_qty == 0:
        raise ValueError("Total quantity is zero. Cannot calculate popularity index.")

    # Deterministic tie-break: when popularity is equal, sort by menu name.
    menu_qty = (
        df.groupby("menu", as_index=False)["qty"].sum()
        .sort_values(by=["qty", "menu"], ascending=[False, True], kind="mergesort")
        .reset_index(drop=True)
    )

    menu_qty["popularity"] = (menu_qty["qty"] / total_qty).round(6)

    menu_qty = menu_qty.rename(columns={"qty": "quantity"})

    return menu_qty[["menu", "popularity", "quantity"]].to_dict(orient="records")
