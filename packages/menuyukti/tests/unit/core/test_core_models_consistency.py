import pytest

from menuyukti.core.models.matrix_distribution import CategoryDistribution, MatrixDistribution
from menuyukti.core.models.matrix_item import MatrixItem


def test_matrix_item_strips_identity_fields():
    item = MatrixItem(
        menu="  Latte  ",
        menu_category=" DRINK ",
        menu_category_detail=" COFFEE ",
        category="star",
        action="keep",
        quantity=10,
        total_revenue=100.0,
        cogs=2.0,
        total_cogs=20.0,
        margin_per_unit=8.0,
        contribution_margin=80.0,
        contribution_margin_percentage=0.2,
        we_value=0.4,
    )

    assert item.menu == "Latte"
    assert item.menu_category == "DRINK"
    assert item.menu_category_detail == "COFFEE"


def test_matrix_item_rejects_empty_identity_fields():
    with pytest.raises(ValueError) as exc:
        MatrixItem(
            menu="   ",
            menu_category="DRINK",
            menu_category_detail="COFFEE",
            category="star",
            action="keep",
            quantity=10,
            total_revenue=100.0,
            cogs=2.0,
            total_cogs=20.0,
            margin_per_unit=8.0,
            contribution_margin=80.0,
            contribution_margin_percentage=0.2,
            we_value=0.4,
        )

    assert "CORE_MODEL_EMPTY_STRING" in str(exc.value)


def test_matrix_distribution_rejects_duplicate_category_entries():
    with pytest.raises(ValueError) as exc:
        MatrixDistribution(
            categories=[
                CategoryDistribution(category="star", item_count=1, item_share=0.5, margin_share=0.5),
                CategoryDistribution(category="star", item_count=1, item_share=0.5, margin_share=0.5),
            ]
        )

    assert "CORE_MODEL_DUPLICATE_CATEGORY_DISTRIBUTION" in str(exc.value)


def test_matrix_distribution_sorts_categories_deterministically():
    distribution = MatrixDistribution(
        categories=[
            CategoryDistribution(category="puzzle", item_count=1, item_share=0.2, margin_share=0.2),
            CategoryDistribution(category="star", item_count=1, item_share=0.5, margin_share=0.5),
            CategoryDistribution(category="low_end", item_count=1, item_share=0.3, margin_share=0.3),
        ]
    )

    assert [category.category for category in distribution.categories] == [
        "low_end",
        "puzzle",
        "star",
    ]
