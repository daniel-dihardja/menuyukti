"""Unit tests for holiday ID propagation, slot annotation, and brief derivation."""

import json
from pathlib import Path

import pytest

from agent.ig_campaign.schedule import _build_candidate_weeks
from agent.ig_campaign.brief import _derive_holiday_ids, _format_candidate_weeks, _format_holidays
from agent.state import CampaignBrief, NationalHoliday, PostSlot


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

EASTER_HOLIDAY: NationalHoliday = NationalHoliday(
    id="EASTER_SUNDAY_2026",
    date="2026-04-05",
    name="Easter Sunday",
    localName="Hari Paskah",
    type="public",
)

GOOD_FRIDAY_HOLIDAY: NationalHoliday = NationalHoliday(
    id="GOOD_FRIDAY_2026",
    date="2026-04-03",
    name="Good Friday",
    localName="Jumat Agung",
    type="public",
)

SAMPLE_HOLIDAYS: list[NationalHoliday] = [GOOD_FRIDAY_HOLIDAY, EASTER_HOLIDAY]


# ---------------------------------------------------------------------------
# Step 1: Holiday JSON has unique non-empty IDs
# ---------------------------------------------------------------------------

def test_indonesia_holidays_have_unique_ids() -> None:
    path = (
        Path(__file__).resolve().parents[4]
        / "apps" / "graphql" / "data_sources" / "holidays" / "indonesia.json"
    )
    entries = json.loads(path.read_text())
    ids = [e["id"] for e in entries]
    assert all(ids), "Every holiday entry must have a non-empty 'id'"
    assert len(ids) == len(set(ids)), "Holiday IDs must be unique"


# ---------------------------------------------------------------------------
# Step 2: CandidateSlot annotation
# ---------------------------------------------------------------------------

def test_slot_on_holiday_date_has_holiday_id() -> None:
    weeks = _build_candidate_weeks("2026-04-05", "2026-04-05", holidays=SAMPLE_HOLIDAYS)
    assert len(weeks) == 1
    slot = weeks[0].slots[0]
    assert slot.date == "2026-04-05"
    assert slot.holiday_id == "EASTER_SUNDAY_2026"
    assert slot.proximity is None


def test_slot_day_before_holiday_has_proximity() -> None:
    # April 4 is the day before Easter (April 5)
    weeks = _build_candidate_weeks("2026-04-04", "2026-04-04", holidays=SAMPLE_HOLIDAYS)
    slot = weeks[0].slots[0]
    assert slot.holiday_id is None
    assert slot.proximity == "day_before_EASTER_SUNDAY_2026"


def test_slot_day_after_holiday_has_proximity() -> None:
    # April 6 is the day after Easter (April 5)
    weeks = _build_candidate_weeks("2026-04-06", "2026-04-06", holidays=SAMPLE_HOLIDAYS)
    slot = weeks[0].slots[0]
    assert slot.holiday_id is None
    assert slot.proximity == "day_after_EASTER_SUNDAY_2026"


def test_slot_not_near_holiday_has_no_annotation() -> None:
    weeks = _build_candidate_weeks("2026-04-10", "2026-04-10", holidays=SAMPLE_HOLIDAYS)
    slot = weeks[0].slots[0]
    assert slot.holiday_id is None
    assert slot.proximity is None


def test_slot_annotation_without_holidays() -> None:
    weeks = _build_candidate_weeks("2026-04-05", "2026-04-05", holidays=None)
    slot = weeks[0].slots[0]
    assert slot.holiday_id is None
    assert slot.proximity is None


# ---------------------------------------------------------------------------
# Step 3: Prompt formatting surfaces IDs
# ---------------------------------------------------------------------------

def test_format_holidays_includes_id() -> None:
    result = _format_holidays(SAMPLE_HOLIDAYS)
    assert "[GOOD_FRIDAY_2026]" in result
    assert "[EASTER_SUNDAY_2026]" in result
    assert "2026-04-05" in result


def test_format_candidate_weeks_annotates_holiday_slot() -> None:
    weeks = _build_candidate_weeks("2026-04-03", "2026-04-07", holidays=SAMPLE_HOLIDAYS)
    result = _format_candidate_weeks(weeks)
    assert "[GOOD_FRIDAY_2026]" in result
    assert "[EASTER_SUNDAY_2026]" in result
    assert "(day_before_EASTER_SUNDAY_2026)" in result
    assert "(day_after_EASTER_SUNDAY_2026)" in result


# ---------------------------------------------------------------------------
# Step 5: _derive_holiday_ids server-side derivation
# ---------------------------------------------------------------------------

def _make_brief(slots: list[PostSlot]) -> CampaignBrief:
    return CampaignBrief(
        campaign_theme="Test",
        tone="casual",
        target_audience="families",
        posting_cadence="3x/week",
        post_slots=slots,
    )


def test_derive_sets_holiday_id_on_holiday_date() -> None:
    slot = PostSlot(
        scheduled_date="2026-04-05",
        theme="holiday",
        caption_seed="Celebrate Easter with us.",
    )
    result = _derive_holiday_ids(_make_brief([slot]), SAMPLE_HOLIDAYS)
    assert result.post_slots[0].holiday_id == "EASTER_SUNDAY_2026"
    assert result.post_slots[0].theme == "holiday"


def test_derive_does_not_set_holiday_id_on_non_holiday_date() -> None:
    slot = PostSlot(
        scheduled_date="2026-04-10",
        theme="engagement",
        caption_seed="Friday vibes.",
    )
    result = _derive_holiday_ids(_make_brief([slot]), SAMPLE_HOLIDAYS)
    assert result.post_slots[0].holiday_id is None
    assert result.post_slots[0].theme == "engagement"


def test_derive_downgrades_holiday_theme_on_non_holiday_date() -> None:
    # Model mistakenly assigned theme='holiday' to April 22
    slot = PostSlot(
        scheduled_date="2026-04-22",
        theme="holiday",
        caption_seed="Happy Easter (wrong date).",
    )
    result = _derive_holiday_ids(_make_brief([slot]), SAMPLE_HOLIDAYS)
    downgraded = result.post_slots[0]
    assert downgraded.theme == "engagement"
    assert downgraded.holiday_id is None


def test_derive_handles_empty_holidays() -> None:
    slot = PostSlot(
        scheduled_date="2026-04-05",
        theme="holiday",
        caption_seed="Easter post.",
    )
    result = _derive_holiday_ids(_make_brief([slot]), holidays=None)
    # No holidays provided — theme downgraded, no id set
    assert result.post_slots[0].theme == "engagement"
    assert result.post_slots[0].holiday_id is None


def test_derive_sets_holiday_id_on_promotion_slot_that_happens_to_be_holiday() -> None:
    # A promotion slot that happens to fall on Easter should get holiday_id set
    # but theme stays "promotion"
    slot = PostSlot(
        scheduled_date="2026-04-05",
        theme="promotion",
        focus_item="Nasi Goreng",
        caption_seed="Try our special today.",
    )
    result = _derive_holiday_ids(_make_brief([slot]), SAMPLE_HOLIDAYS)
    assert result.post_slots[0].holiday_id == "EASTER_SUNDAY_2026"
    assert result.post_slots[0].theme == "promotion"
