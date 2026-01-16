import pandas as pd


def calculate_menu_engineering_matrix(df: pd.DataFrame) -> dict:
    """
    Calculate Menu Engineering Matrix from menu items.

    Required columns:
    - menu (str)
    - quantity (int)
    - total_revenue (float)
    - cogs (float | NaN)

    Items with cogs == 0 are skipped.
    All percentage values are returned in the range [0, 1].
    """

    # --------------------------------------------------
    # Validation
    # --------------------------------------------------
    required_cols = {"menu", "quantity", "total_revenue"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df.copy()

    # --------------------------------------------------
    # Normalize types
    # --------------------------------------------------
    df["quantity"] = df["quantity"].astype(float)
    df["total_revenue"] = df["total_revenue"].astype(float)
    df["cogs"] = df.get("cogs", 0).astype(float)

    # --------------------------------------------------
    # 🚨 Skip items with invalid economics
    # --------------------------------------------------
    df = df[(df["cogs"] > 0) & (df["total_revenue"] > 0)]

    if df.empty:
        raise ValueError("No valid menu items with cogs > 0 and revenue > 0")

    # --------------------------------------------------
    # Derived values
    # --------------------------------------------------
    df["total_cogs"] = df["cogs"] * df["quantity"]
    df["contribution_margin"] = df["total_revenue"] - df["total_cogs"]

    df["we_value"] = df["total_cogs"] / df["total_revenue"]

    total_margin = df["contribution_margin"].sum()

    df["contribution_margin_percentage"] = (
        df["contribution_margin"] / total_margin if total_margin > 0 else 0.0
    )

    df["margin_per_unit"] = df.apply(
        lambda row: (
            row["contribution_margin"] / row["quantity"] if row["quantity"] > 0 else 0.0
        ),
        axis=1,
    )

    # --------------------------------------------------
    # Thresholds
    # --------------------------------------------------
    avg_popularity = df["quantity"].mean()
    avg_margin = df["contribution_margin"].mean()

    # --------------------------------------------------
    # Classification (Menu Engineering Matrix)
    # --------------------------------------------------
    def classify(row):
        popular = row["quantity"] >= avg_popularity
        profitable = row["contribution_margin"] >= avg_margin

        if popular and profitable:
            return "star"
        if popular and not profitable:
            return "plow_horse"
        if not popular and profitable:
            return "puzzle"
        return "low_end"

    df["category"] = df.apply(classify, axis=1)

    # --------------------------------------------------
    # Action recommendation (decision intelligence)
    # --------------------------------------------------
    def recommend_action(row):
        if (
            row["category"] == "low_end"
            and row["contribution_margin_percentage"] < 0.005  # < 0.5%
            and row["quantity"] < avg_popularity
        ):
            return "remove"

        if row["category"] == "low_end" and row["margin_per_unit"] >= avg_margin:
            return "reprice"

        if row["category"] == "puzzle":
            return "promote"

        return "keep"

    df["action"] = df.apply(recommend_action, axis=1)

    # --------------------------------------------------
    # Distribution (category-level aggregation)
    # --------------------------------------------------
    total_items = len(df)
    distribution = []

    for category, group in df.groupby("category"):
        count = len(group)
        category_margin = group["contribution_margin"].sum()

        distribution.append(
            {
                "category": category,
                "count": int(count),
                "percentage": count / total_items if total_items > 0 else 0.0,
                "margin_contribution_percentage": (
                    category_margin / total_margin if total_margin > 0 else 0.0
                ),
            }
        )

    distribution.sort(
        key=lambda x: x["margin_contribution_percentage"],
        reverse=True,
    )

    # --------------------------------------------------
    # Output (JSON-friendly)
    # --------------------------------------------------
    return {
        "thresholds": {
            "avg_popularity": round(avg_popularity, 2),
            "avg_contribution_margin": round(avg_margin, 2),
        },
        "distribution": distribution,
        "items": [
            {
                "menu": row["menu"],
                "quantity": int(row["quantity"]),
                "total_revenue": round(row["total_revenue"], 2),
                "cogs": round(row["cogs"], 2),
                "total_cogs": round(row["total_cogs"], 2),
                "contribution_margin": round(row["contribution_margin"], 2),
                "contribution_margin_percentage": round(
                    row["contribution_margin_percentage"], 4
                ),
                "margin_per_unit": round(row["margin_per_unit"], 2),
                "we_value": round(row["we_value"], 4),
                "category": row["category"],
                "action": row["action"],
            }
            for _, row in df.sort_values("quantity", ascending=False).iterrows()
        ],
    }
