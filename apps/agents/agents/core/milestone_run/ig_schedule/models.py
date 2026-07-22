"""Shared staged IG week-schedule models (plan → menu → format → text)."""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator


class IgPlanEntryOutput(BaseModel):
    day: str
    slot: str
    objective: str
    pillar: Literal[
        "hero",
        "reminder",
        "lifestyle",
        "community",
        "social_proof",
        "educational",
        "product_discovery",
    ]
    mealPeriod: str
    productRole: Literal["star", "puzzle", "plow_horse"]
    slotStrategy: Literal["maintain", "support", "grow", "aggressively_grow"]
    slotKey: str

    @field_validator("day")
    @classmethod
    def _validate_day(cls, value: str) -> str:
        text = value.strip().lower()
        allowed = {
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        }
        if text not in allowed:
            raise ValueError("day must be a lowercase English weekday")
        return text

    @field_validator("slot")
    @classmethod
    def _validate_slot(cls, value: str) -> str:
        text = value.strip()
        if not re.fullmatch(r"\d{2}:\d{2}", text):
            raise ValueError("slot must be HH:MM in 24-hour format")
        return text

    @field_validator("objective", "mealPeriod", "slotKey")
    @classmethod
    def _validate_non_empty_text(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text


class IgPlanMilestoneOutput(BaseModel):
    scheduleExplanation: str = Field(min_length=1)
    entries: list[IgPlanEntryOutput] = Field(min_length=1)
    sourceAnalyticsRunId: str = Field(min_length=1)
    reportingPeriod: str = Field(min_length=1)

    @field_validator("scheduleExplanation", "sourceAnalyticsRunId", "reportingPeriod")
    @classmethod
    def _validate_non_empty_header(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text


class IgMenuPickerMenuItemOutput(BaseModel):
    menu: str = Field(min_length=1)
    rationale: str = ""

    @field_validator("menu")
    @classmethod
    def _validate_menu(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text


class IgMenuPickerEntryOutput(IgPlanEntryOutput):
    menuItems: list[IgMenuPickerMenuItemOutput] = Field(min_length=1, max_length=3)


class IgMenuPickerMilestoneOutput(BaseModel):
    scheduleExplanation: str = Field(min_length=1)
    entries: list[IgMenuPickerEntryOutput] = Field(min_length=1)
    sourceAnalyticsRunId: str = Field(min_length=1)
    reportingPeriod: str = Field(min_length=1)
    sourceIgPlanTitle: str | None = None

    @field_validator("scheduleExplanation", "sourceAnalyticsRunId", "reportingPeriod")
    @classmethod
    def _validate_non_empty_header(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text


class IgFormatEntryOutput(IgMenuPickerEntryOutput):
    type: Literal["reel", "post", "post-carousel", "story"]
    formatRationale: str = ""


class IgFormatMilestoneOutput(BaseModel):
    scheduleExplanation: str = Field(min_length=1)
    entries: list[IgFormatEntryOutput] = Field(min_length=1)
    sourceAnalyticsRunId: str = Field(min_length=1)
    reportingPeriod: str = Field(min_length=1)
    sourceIgMenuPickerTitle: str | None = None

    @field_validator("scheduleExplanation", "sourceAnalyticsRunId", "reportingPeriod")
    @classmethod
    def _validate_non_empty_header(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text


def ig_text_required_fields(fmt_type: str, menu_item_count: int) -> list[str]:
    if fmt_type == "post":
        return ["headline", "subline", "productName", "caption"]
    if fmt_type == "reel":
        return ["hook", "onScreenText", "caption"]
    if fmt_type == "story":
        return ["headline", "cta", "caption"]
    if fmt_type == "post-carousel":
        required = ["caption"]
        for index in range(1, menu_item_count + 1):
            required.extend([f"slide_{index}_headline", f"slide_{index}_productName"])
        return required
    return []


# Backwards-compatible alias used by older call sites.
_ig_text_required_fields = ig_text_required_fields


class IgTextFieldOutput(BaseModel):
    field: str = Field(min_length=1)
    value: str = Field(min_length=1)

    @field_validator("field", "value")
    @classmethod
    def _validate_non_empty(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text


class IgTextEntryOutput(IgFormatEntryOutput):
    texts: list[IgTextFieldOutput] = Field(min_length=1)

    @model_validator(mode="after")
    def _validate_texts_for_type(self) -> IgTextEntryOutput:
        fmt_type = str(self.type or "").strip()
        menu_items = self.menuItems or []
        required = ig_text_required_fields(fmt_type, len(menu_items))
        if not required:
            raise ValueError(f"unsupported ig_text format type {fmt_type!r}")

        by_field = {row.field: row.value for row in self.texts}
        missing = [name for name in required if name not in by_field]
        if missing:
            raise ValueError(
                f"missing required text fields for {fmt_type}: {', '.join(missing[:6])}"
                + ("…" if len(missing) > 6 else "")
            )

        if fmt_type == "post":
            expected_menu = menu_items[0].menu.strip() if menu_items else ""
            actual = by_field.get("productName", "").strip()
            if expected_menu and actual != expected_menu:
                raise ValueError("productName must match the single menuItems[0].menu value")
        elif fmt_type == "post-carousel":
            for index, item in enumerate(menu_items, start=1):
                expected_menu = item.menu.strip()
                actual = by_field.get(f"slide_{index}_productName", "").strip()
                if expected_menu and actual != expected_menu:
                    raise ValueError(
                        f"slide_{index}_productName must match menuItems[{index - 1}].menu"
                    )
        return self


class IgTextMilestoneOutput(BaseModel):
    scheduleExplanation: str = Field(min_length=1)
    entries: list[IgTextEntryOutput] = Field(min_length=1)
    sourceAnalyticsRunId: str = Field(min_length=1)
    reportingPeriod: str = Field(min_length=1)
    sourceIgFormatTitle: str | None = None
    sourceCampaignBriefTitle: str | None = None

    @field_validator("scheduleExplanation", "sourceAnalyticsRunId", "reportingPeriod")
    @classmethod
    def _validate_non_empty_header(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text


def parse_ig_plan_schedule(raw: Any) -> IgPlanMilestoneOutput:
    """Validate prior/persisted IG plan schedule payload."""
    return IgPlanMilestoneOutput.model_validate(raw)


def parse_ig_menu_picker_schedule(raw: Any) -> IgMenuPickerMilestoneOutput:
    """Validate prior/persisted IG menu picker schedule payload."""
    return IgMenuPickerMilestoneOutput.model_validate(raw)


def parse_ig_format_schedule(raw: Any) -> IgFormatMilestoneOutput:
    """Validate prior/persisted IG format schedule payload."""
    return IgFormatMilestoneOutput.model_validate(raw)


def parse_ig_text_schedule(raw: Any) -> IgTextMilestoneOutput:
    """Validate prior/persisted IG text schedule payload."""
    return IgTextMilestoneOutput.model_validate(raw)


def try_parse_ig_plan_schedule(raw: Any) -> IgPlanMilestoneOutput | None:
    try:
        return parse_ig_plan_schedule(raw)
    except ValidationError:
        return None


def try_parse_ig_menu_picker_schedule(raw: Any) -> IgMenuPickerMilestoneOutput | None:
    try:
        return parse_ig_menu_picker_schedule(raw)
    except ValidationError:
        return None


def try_parse_ig_format_schedule(raw: Any) -> IgFormatMilestoneOutput | None:
    try:
        return parse_ig_format_schedule(raw)
    except ValidationError:
        return None


def try_parse_ig_text_schedule(raw: Any) -> IgTextMilestoneOutput | None:
    try:
        return parse_ig_text_schedule(raw)
    except ValidationError:
        return None
