"""Sample scenario: one dominant high-margin menu item ("star")."""

from __future__ import annotations

from datetime import datetime, timedelta

from menuyukti.core.models.pos_transaction import POSTransactionLineItem

STAR_ITEM_COGS_RATES = {
    "Salmon Bowl": 0.32,
    "Chicken Satay": 0.38,
    "Beef Rendang": 0.42,
    "Veggie Gado-Gado": 0.28,
    "Miso Soup": 0.22,
    "Brownie": 0.30,
    "Iced Tea": 0.12,
    "Avocado Juice": 0.25,
}


def star_item_scenario() -> list[POSTransactionLineItem]:
    """
    Scenario: Restaurant with one dominant high-margin item.

    Expected behavior:
    - Consensus should rank "Salmon Bowl" as a top performer.
    - Portfolio shows a healthy mix with one clear star.
    """

    menu_catalog = {
        "Salmon Bowl": (85000.0, "Main Course", "Seafood"),
        "Chicken Satay": (65000.0, "Main Course", "Grilled"),
        "Beef Rendang": (90000.0, "Main Course", "Stew"),
        "Veggie Gado-Gado": (50000.0, "Main Course", "Salad"),
        "Miso Soup": (25000.0, "Sides", "Soup"),
        "Brownie": (28000.0, "Dessert", "Baked"),
        "Iced Tea": (15000.0, "Beverages", "Tea"),
        "Avocado Juice": (30000.0, "Beverages", "Juice"),
    }

    weighted_items = [
        "Salmon Bowl",
        "Salmon Bowl",
        "Salmon Bowl",
        "Salmon Bowl",
        "Salmon Bowl",
        "Chicken Satay",
        "Chicken Satay",
        "Beef Rendang",
        "Veggie Gado-Gado",
        "Iced Tea",
    ]

    side_cycle = ["Miso Soup", "Brownie", "Iced Tea", "Avocado Juice"]

    base_time = datetime(2026, 1, 15, 11, 0, 0)
    items: list[POSTransactionLineItem] = []
    order_counter = 1

    for day in range(5):
        day_time = base_time + timedelta(days=day)
        for order_index in range(12):
            order_time = day_time + timedelta(minutes=order_index * 35)
            bill_number = f"ORD-STAR-{order_counter:04d}"
            order_counter += 1

            primary_name = weighted_items[
                (day * 12 + order_index) % len(weighted_items)
            ]
            price, category, detail = menu_catalog[primary_name]
            qty = 2 if primary_name == "Salmon Bowl" and order_index % 4 == 0 else 1

            items.append(
                POSTransactionLineItem(
                    bill_number=bill_number,
                    menu=primary_name,
                    qty=qty,
                    price=price,
                    total_after_bill_discount=price * qty,
                    order_time=order_time,
                    menu_category=category,
                    menu_category_detail=detail,
                )
            )

            if order_index % 3 == 0:
                side_name = side_cycle[(day + order_index) % len(side_cycle)]
                side_price, side_category, side_detail = menu_catalog[side_name]
                items.append(
                    POSTransactionLineItem(
                        bill_number=bill_number,
                        menu=side_name,
                        qty=1,
                        price=side_price,
                        total_after_bill_discount=side_price,
                        order_time=order_time,
                        menu_category=side_category,
                        menu_category_detail=side_detail,
                    )
                )

    return items
