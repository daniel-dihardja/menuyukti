"""Sample scenario: struggling restaurant with low margins and underperforming items."""

from __future__ import annotations

from datetime import datetime, timedelta

from menuyukti.core.models.pos_transaction import POSTransactionLineItem

STRUGGLING_RESTAURANT_COGS_RATES = {
    "Basic Burger": 0.67,
    "Veggie Burger": 0.67,
    "House Pasta": 0.60,
    "Meatloaf Special": 0.71,
    "Fish & Chips": 0.70,
    "Chicken Wings": 0.67,
    "Mozzarella Sticks": 0.67,
    "Nachos": 0.70,
    "French Fries": 0.50,
    "Onion Rings": 0.60,
    "Coleslaw": 0.63,
    "Garden Salad": 0.50,
    "Soup of the Day": 0.67,
    "Soft Drinks": 0.33,
    "Iced Tea": 0.33,
}


def struggling_restaurant_scenario() -> list[POSTransactionLineItem]:
    """
    Scenario: Family restaurant with low margins and underperforming items.

    Expected behavior:
    - Most items are "dogs" or "plow horses"
    - Need repricing or menu optimization
    - Only beverages have decent margins
    """

    menu_catalog = {
        # Mains - poor margins
        "Basic Burger": (120000.0, "Mains", "Burgers"),
        "Veggie Burger": (150000.0, "Mains", "Burgers"),
        "House Pasta": (150000.0, "Mains", "Pasta"),
        "Meatloaf Special": (140000.0, "Mains", "Specials"),
        "Fish & Chips": (150000.0, "Mains", "Seafood"),
        # Appetizers - poor margins
        "Chicken Wings": (120000.0, "Appetizers", "Fried"),
        "Mozzarella Sticks": (120000.0, "Appetizers", "Fried"),
        "Nachos": (120000.0, "Appetizers", "Tex-Mex"),
        # Sides - low revenue
        "French Fries": (60000.0, "Sides", "Fried"),
        "Onion Rings": (100000.0, "Sides", "Fried"),
        "Coleslaw": (80000.0, "Sides", "Salads"),
        # Salads & Soups - minimal sales
        "Garden Salad": (120000.0, "Salads", "Fresh"),
        "Soup of the Day": (120000.0, "Soups", "Homemade"),
        # Beverages - only bright spot
        "Soft Drinks": (30000.0, "Beverages", "Soda"),
        "Iced Tea": (30000.0, "Beverages", "Tea"),
    }

    # Low-volume items
    mains = [
        "Basic Burger",
        "Veggie Burger",
        "House Pasta",
        "Meatloaf Special",
        "Fish & Chips",
    ]
    appetizers = ["Chicken Wings", "Mozzarella Sticks", "Nachos"]
    sides = ["French Fries", "Onion Rings", "Coleslaw"]
    others = ["Garden Salad", "Soup of the Day"]
    beverages = ["Soft Drinks", "Iced Tea"]

    base_time = datetime(2025, 1, 1, 11, 0, 0)
    items: list[POSTransactionLineItem] = []
    order_counter = 1

    # Generate 90 days of sparse data (struggling business)
    for day in range(90):
        day_time = base_time + timedelta(days=day)

        # Only 5-7 orders per day (struggling)
        daily_orders = 5 + (day % 3)

        for order_index in range(daily_orders):
            order_time = day_time + timedelta(minutes=order_index * 90)
            bill_number = f"ORD-SR-{order_counter:05d}"
            order_counter += 1

            # Main item
            main = mains[(day + order_index) % len(mains)]
            price, category, detail = menu_catalog[main]
            items.append(
                POSTransactionLineItem(
                    bill_number=bill_number,
                    menu=main,
                    qty=1,
                    price=price,
                    total_after_bill_discount=price,
                    order_time=order_time,
                    menu_category=category,
                    menu_category_detail=detail,
                )
            )

            # Add side 70% of the time
            if order_index % 10 < 7:
                side = sides[(day + order_index) % len(sides)]
                side_price, side_category, side_detail = menu_catalog[side]
                items.append(
                    POSTransactionLineItem(
                        bill_number=bill_number,
                        menu=side,
                        qty=1,
                        price=side_price,
                        total_after_bill_discount=side_price,
                        order_time=order_time,
                        menu_category=side_category,
                        menu_category_detail=side_detail,
                    )
                )

            # Add beverage 80% of the time
            if order_index % 5 < 4:
                beverage = beverages[(day + order_index) % len(beverages)]
                bev_price, bev_category, bev_detail = menu_catalog[beverage]
                items.append(
                    POSTransactionLineItem(
                        bill_number=bill_number,
                        menu=beverage,
                        qty=1,
                        price=bev_price,
                        total_after_bill_discount=bev_price,
                        order_time=order_time,
                        menu_category=bev_category,
                        menu_category_detail=bev_detail,
                    )
                )

            # Rarely add appetizer (20%)
            if order_index % 5 == 0:
                appetizer = appetizers[(day + order_index) % len(appetizers)]
                app_price, app_category, app_detail = menu_catalog[appetizer]
                items.append(
                    POSTransactionLineItem(
                        bill_number=bill_number,
                        menu=appetizer,
                        qty=1,
                        price=app_price,
                        total_after_bill_discount=app_price,
                        order_time=order_time,
                        menu_category=app_category,
                        menu_category_detail=app_detail,
                    )
                )

            # Very rarely add salad/soup (10%)
            if order_index % 10 == 0:
                other = others[(day + order_index) % len(others)]
                other_price, other_category, other_detail = menu_catalog[other]
                items.append(
                    POSTransactionLineItem(
                        bill_number=bill_number,
                        menu=other,
                        qty=1,
                        price=other_price,
                        total_after_bill_discount=other_price,
                        order_time=order_time,
                        menu_category=other_category,
                        menu_category_detail=other_detail,
                    )
                )

    return items
