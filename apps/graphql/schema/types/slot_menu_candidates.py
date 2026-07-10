"""Slot menu promotion candidates GraphQL types."""

import strawberry


@strawberry.type(
    description=(
        "A ranked menu item suitable for Instagram promotion in a specific day × meal-period slot."
    )
)
class SlotMenuCandidateItemType:
    menu: str
    globalCategory: str | None
    globalAction: str | None
    slotQuantity: int
    slotShare: float
    slotAffinity: float
    slotRevenue: float | None
    contributionMargin: float | None
    contributionMarginPercentage: float | None
    menuCategory: str | None
    menuCategoryDetail: str | None
    rank: int
    score: float
    recommendedUse: str


@strawberry.type(
    description=(
        "Promotion candidates and venue demand metadata for one day × meal-period slot."
    )
)
class SlotMenuCandidatesCellType:
    day: str
    mealPeriod: str
    mealPeriodLabel: str
    mealPeriodHoursLabel: str
    orderCount: int
    demandIndex: float
    relativeDemand: str
    posture: str
    recommendedCategories: list[str]
    totalItemQuantity: int
    insufficientData: bool
    candidates: list[SlotMenuCandidateItemType]


@strawberry.type(
    description=(
        "Per-slot menu promotion candidates for an analytics run, combining venue slot "
        "demand, per-slot sales, and global menu engineering classification."
    )
)
class SlotMenuCandidatesType:
    reportingPeriod: str
    matrixAvailable: bool
    coverageNotes: list[str]
    slots: list[SlotMenuCandidatesCellType]
