"""Sample scenario: thriving downtown cafe with good margins."""

from __future__ import annotations

from datetime import datetime, timedelta

from menuyukti.core.models.pos_transaction import POSTransactionLineItem

THRIVING_CAFE_COGS_RATES = {
    "Cappuccino": 0.25,
    "Latte": 0.28,
    "Espresso": 0.22,
    "Flat White": 0.27,
    "Matcha Latte": 0.35,
    "Croissant": 0.30,
    "Avocado Toast": 0.40,
    "Bagel & Cream Cheese": 0.32,
    "Breakfast Burrito": 0.45,
    "Quiche": 0.42,
    "Chocolate Cake": 0.38,
    "Cheesecake": 0.40,
    "Tiramisu": 0.42,
}


def thriving_cafe_scenario() -> list[POSTransactionLineItem]:
    """
    Scenario: Thriving downtown cafe with good margins and diverse menu.

    Expected behavior:
    - Multiple high-performing items across categories
    - Good balance of beverages and food
    - Strong margins on specialty drinks
    """

    menu_catalog = {
        # Beverages - high margin
        "Cappuccino": (45000.0, "Beverages", "Coffee"),
        "Latte": (42000.0, "Beverages", "Coffee"),
        "Espresso": (35000.0, "Beverages", "Coffee"),
        "Flat White": (48000.0, "Beverages", "Coffee"),
        "Matcha Latte": (52000.0, "Beverages", "Specialty"),
        # Food - moderate to good margin
        "Croissant": (28000.0, "Food", "Pastry"),
        "Avocado Toast": (65000.0, "Food", "Breakfast"),
        "Bagel & Cream Cheese": (35000.0, "Food", "Breakfast"),
        "Breakfast Burrito": (72000.0, "Food", "Breakfast"),
        "Quiche": (58000.0, "Food", "Brunch"),
        # Desserts - good margin
        "Chocolate Cake": (48000.0, "Desserts", "Cake"),
        "Cheesecake": (52000.0, "Desserts", "Cake"),
        "Tiramisu": (55000.0, "Desserts", "Specialty"),
    }

    # Popular items weighted distribution
    morning_drinks = ["Cappuccino", "Latte", "Espresso", "Flat White"] * 3
    specialty_drinks = ["Matcha Latte"] * 2
    breakfast_items = [
        "Croissant",
        "Avocado Toast",
        "Bagel & Cream Cheese",
        "Breakfast Burrito",
    ]
    brunch_items = ["Quiche", "Avocado Toast"]
    desserts = ["Chocolate Cake", "Cheesecake", "Tiramisu"]

    base_time = datetime(2025, 1, 1, 7, 0, 0)
    items: list[POSTransactionLineItem] = []
    order_counter = 1

    # Generate 90 days of data
    for day in range(90):
        day_time = base_time + timedelta(days=day)

        # Morning rush (7am-10am): 15 orders
        for order_index in range(15):
            order_time = day_time + timedelta(minutes=order_index * 12)
            bill_number = f"ORD-TC-{order_counter:05d}"
            order_counter += 1

            # Coffee order
            drink = morning_drinks[(day + order_index) % len(morning_drinks)]
            price, category, detail = menu_catalog[drink]
            items.append(
                POSTransactionLineItem(
                    bill_number=bill_number,
                    menu=drink,
                    qty=1,
                    price=price,
                    total_after_bill_discount=price,
                    order_time=order_time,
                    menu_category=category,
                    menu_category_detail=detail,
                )
            )

            # Add food 60% of the time
            if order_index % 5 < 3:
                food = breakfast_items[(day + order_index) % len(breakfast_items)]
                food_price, food_category, food_detail = menu_catalog[food]
                items.append(
                    POSTransactionLineItem(
                        bill_number=bill_number,
                        menu=food,
                        qty=1,
                        price=food_price,
                        total_after_bill_discount=food_price,
                        order_time=order_time,
                        menu_category=food_category,
                        menu_category_detail=food_detail,
                    )
                )

        # Brunch period (10am-2pm): 8 orders
        for order_index in range(8):
            order_time = day_time + timedelta(hours=3, minutes=order_index * 30)
            bill_number = f"ORD-TC-{order_counter:05d}"
            order_counter += 1

            # Brunch item
            food = brunch_items[(day + order_index) % len(brunch_items)]
            food_price, food_category, food_detail = menu_catalog[food]
            items.append(
                POSTransactionLineItem(
                    bill_number=bill_number,
                    menu=food,
                    qty=1,
                    price=food_price,
                    total_after_bill_discount=food_price,
                    order_time=order_time,
                    menu_category=food_category,
                    menu_category_detail=food_detail,
                )
            )

            # Specialty drink with brunch
            if order_index % 3 == 0:
                drink = specialty_drinks[order_index % len(specialty_drinks)]
                price, category, detail = menu_catalog[drink]
                items.append(
                    POSTransactionLineItem(
                        bill_number=bill_number,
                        menu=drink,
                        qty=1,
                        price=price,
                        total_after_bill_discount=price,
                        order_time=order_time,
                        menu_category=category,
                        menu_category_detail=detail,
                    )
                )

        # Afternoon (2pm-6pm): 12 orders
        for order_index in range(12):
            order_time = day_time + timedelta(hours=7, minutes=order_index * 20)
            bill_number = f"ORD-TC-{order_counter:05d}"
            order_counter += 1

            # Coffee + dessert combo
            drink = (morning_drinks + specialty_drinks)[
                (day + order_index) % (len(morning_drinks) + len(specialty_drinks))
            ]
            price, category, detail = menu_catalog[drink]
            items.append(
                POSTransactionLineItem(
                    bill_number=bill_number,
                    menu=drink,
                    qty=1,
                    price=price,
                    total_after_bill_discount=price,
                    order_time=order_time,
                    menu_category=category,
                    menu_category_detail=detail,
                )
            )

            # Add dessert 50% of the time
            if order_index % 2 == 0:
                dessert = desserts[(day + order_index) % len(desserts)]
                dessert_price, dessert_category, dessert_detail = menu_catalog[dessert]
                items.append(
                    POSTransactionLineItem(
                        bill_number=bill_number,
                        menu=dessert,
                        qty=1,
                        price=dessert_price,
                        total_after_bill_discount=dessert_price,
                        order_time=order_time,
                        menu_category=dessert_category,
                        menu_category_detail=dessert_detail,
                    )
                )

    return items
