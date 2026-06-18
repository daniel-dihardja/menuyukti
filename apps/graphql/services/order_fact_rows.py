"""Map OrderFact ORM rows to menuyukti OrderRow* TypedDict lists."""

from __future__ import annotations

from typing import Any

from graphql.data_sources import OrderFact


def facts_to_sales_analytics_rows(facts: list[OrderFact]) -> list[dict[str, Any]]:
    return [
        {
            "bill_number": r.bill_number,
            "menu": r.menu,
            "qty": r.qty,
            "price": r.price,
            "total_after_bill_discount": r.total_after_bill_discount,
            "order_time": r.order_time,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in facts
    ]


def facts_to_category_mix_rows(facts: list[OrderFact]) -> list[dict[str, Any]]:
    return [
        {
            "bill_number": r.bill_number,
            "menu": r.menu,
            "qty": r.qty,
            "total_after_bill_discount": r.total_after_bill_discount,
            "menu_category": r.menu_category or None,
            "menu_category_detail": r.menu_category_detail or None,
        }
        for r in facts
    ]


def facts_to_revenue_trend_rows(facts: list[OrderFact]) -> list[dict[str, Any]]:
    return [
        {
            "menu": r.menu,
            "total_after_bill_discount": r.total_after_bill_discount,
        }
        for r in facts
    ]


def facts_to_operating_profile_rows(facts: list[OrderFact]) -> list[dict[str, Any]]:
    return [
        {
            "order_time": r.order_time,
            "bill_number": r.bill_number,
            "total_after_bill_discount": r.total_after_bill_discount,
            "qty": r.qty,
        }
        for r in facts
    ]


def facts_to_heatmap_rows(facts: list[OrderFact]) -> list[dict[str, Any]]:
    return [
        {
            "menu": r.menu,
            "qty": r.qty,
            "order_time": r.order_time,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in facts
    ]


def facts_to_basket_rows(facts: list[OrderFact]) -> list[dict[str, Any]]:
    return [
        {
            "bill_number": r.bill_number,
            "menu": r.menu,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in facts
    ]


def facts_to_menu_engineering_rows(facts: list[OrderFact]) -> list[dict[str, Any]]:
    return [
        {
            "menu": r.menu,
            "qty": r.qty,
            "total_after_bill_discount": r.total_after_bill_discount,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in facts
    ]
