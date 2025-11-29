# analytics_utils.py

import pandas as pd
import numpy as np
from typing import List, Dict, Any


# -----------------------------------------
# Configuration
# -----------------------------------------


REQUIRED_COLUMNS = [
    "bill_number",
    "menu",
    "qty",
    "price",
    "total_after_bill_discount",
    "order_time",
]


# -----------------------------------------
# Custom Exceptions
# -----------------------------------------


class ValidationError(Exception):
    """Raised when input data is missing required structure."""

    pass


# -----------------------------------------
# Step 1: Load Data
# -----------------------------------------


def load_raw_df(path: str) -> pd.DataFrame:
    """
    Loads the raw Excel file into a DataFrame.
    SKIPS THE FIRST 11 ROWS.
    """
    df = pd.read_excel(path, skiprows=11)

    # Clean dirty Excel column names immediately
    df.columns = (
        df.columns.astype(str)
        .str.strip()
        .str.replace("\u00a0", " ")  # replace non-breaking spaces
        .str.replace("\t", "")
        .str.lower()
        .str.replace(" ", "_")
    )

    return df


# -----------------------------------------
# Step 2: Validate Data
# -----------------------------------------


def validate_raw_df(df: pd.DataFrame) -> None:
    """
    Validates that all required normalized columns exist.
    """

    # print("Loaded columns:", df.columns.tolist())  # Debugging!

    if df.empty:
        raise ValidationError("Dataframe is empty.")

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValidationError(f"Missing required columns: {missing}")

    if df["bill_number"].isna().all():
        raise ValidationError("bill_number column is completely empty.")


# -----------------------------------------
# Step 3: Clean & Normalize Data
# -----------------------------------------


def clean_orders_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Selects required columns and converts types.
    """

    # Keep only needed columns (now safe because names normalized)
    df = df[REQUIRED_COLUMNS].copy()

    # Type conversions
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce")
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df["total_after_bill_discount"] = pd.to_numeric(
        df["total_after_bill_discount"], errors="coerce"
    )
    df["order_time"] = pd.to_datetime(df["order_time"], errors="coerce")

    # Drop invalid rows
    df = df.dropna(subset=REQUIRED_COLUMNS)

    return df


# -----------------------------------------
# Step 4: Transform DataFrame → Orders
# -----------------------------------------


def row_to_order_item(row) -> Dict[str, Any]:
    """
    Convert a single DataFrame row into an OrderItem.
    """
    return {
        "menuCode": None,
        "menuName": row["menu"],
        "category": "Unknown",
        "subcategory": None,
        "price": float(row["price"]),
        "qty": float(row["qty"]),
        "netTotal": float(row["total_after_bill_discount"]),
    }


def df_to_orders(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Group rows by bill number and turn each bill into an Order object.
    """
    orders: List[Dict[str, Any]] = []

    for bill_number, group in df.groupby("bill_number"):
        order_datetime = group["order_time"].iloc[0]

        order = {
            "billNumber": bill_number,
            "salesNumber": bill_number,
            "datetime": order_datetime,
            "items": [row_to_order_item(row) for _, row in group.iterrows()],
        }

        orders.append(order)

    return orders


# -----------------------------------------
# Step 5: Build Analytic Object
# -----------------------------------------


def build_analytic_from_orders(
    orders: List[Dict[str, Any]], name: str
) -> Dict[str, Any]:
    """
    Build the Analytic object from a list of normalized orders.
    """

    if not orders:
        raise ValidationError("No orders generated from data.")

    order_revenues = [
        sum(item["netTotal"] for item in order["items"]) for order in orders
    ]

    order_item_counts = [
        sum(item["qty"] for item in order["items"]) for order in orders
    ]

    start_date = min(order["datetime"] for order in orders)
    end_date = max(order["datetime"] for order in orders)

    analytic = {
        "name": name,
        "startDate": start_date,
        "endDate": end_date,
        "ordersCount": len(orders),
        "revenueTotal": sum(order_revenues),
        "maxOrderItems": max(order_item_counts),
        "avgOrderItems": float(np.mean(order_item_counts)),
        "minOrderItems": min(order_item_counts),
        "minOrderRevenue": min(order_revenues),
        "maxOrderRevenue": max(order_revenues),
        "avgOrderRevenue": float(np.mean(order_revenues)),
        "orders": orders,
    }

    return analytic


# -----------------------------------------
# Step 6: Full Pipeline
# -----------------------------------------


def build_analytic_from_excel(
    path: str, name: str = "Sales Analytic"
) -> Dict[str, Any]:
    df_raw = load_raw_df(path)
    validate_raw_df(df_raw)

    df_clean = clean_orders_df(df_raw)
    orders = df_to_orders(df_clean)

    analytic = build_analytic_from_orders(orders, name)
    return analytic


def test_hot_reload():
    return "UPDATED SUCCESSFULLY"
