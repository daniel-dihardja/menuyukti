"""Post format task: assign single vs. carousel format to each promotion slot."""

import json
import logging
from collections import Counter
from dataclasses import dataclass
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.config import LLM_MODEL, REFLECT_MAX_ITERATIONS as _MAX_REFLECTION_ITERATIONS
from agent.ig_campaign.node_utils import _emit, _format_items_for_selection, _update_planning
from agent.ig_campaign.post_format_reflect import (
    _PostFormatReflectionResult,
    _REFLECTION_PROMPT,
    _REVISION_PROMPT,
    _reflector_llm,
)
from agent.state import (
    CandidateWeek,
    PostFormatPlan,
    ReflectionIteration,
    State,
    WeekSelection,
)

logger = logging.getLogger(__name__)

_format_llm = ChatOpenAI(model=LLM_MODEL, temperature=0.2)
_format_llm_structured = _format_llm.with_structured_output(PostFormatPlan)
_revise_llm_structured = ChatOpenAI(model=LLM_MODEL, temperature=0.3).with_structured_output(PostFormatPlan)


# ---------------------------------------------------------------------------
# Serialisation helper
# ---------------------------------------------------------------------------

def _serialize_plan(plan: PostFormatPlan) -> str:
    """Serialise assignment list to indented JSON."""
    return json.dumps([a.model_dump() for a in plan.assignments], indent=2)


# ---------------------------------------------------------------------------
# Post format assignment prompt
# ---------------------------------------------------------------------------

_FORMAT_ASSIGNMENT_PROMPT = """You are deciding Instagram post formats for a restaurant campaign.

Your job is to assign a format (single post or carousel) to each promotion date and decide which menu items to feature on it.

Available posting dates — {slot_count} dates total:
{promotion_slots}

Menu items available for promotion ({item_count} items):
{promotion_items}

Rules:
- Use ONLY the dates listed above. Do NOT invent or add any dates not in the list.
- You may use fewer than {slot_count} dates — unused dates will become engagement posts. But you MUST NOT exceed {slot_count} assignments.
- Use carousels to group multiple items onto one date rather than adding extra dates.
- "star" category items must always be assigned as format="single" — they deserve a solo spotlight.
- "puzzle" and "plow_horse" category items are carousel candidates if they share a menu category or customer theme (e.g. all drinks, all snacks, all value sets).
- Holiday-pinned dates (marked [HOLIDAY]) must always be format="single".
- A maximum of 2 carousel posts per week.
- Carousel posts must group 2 to 4 items. Each item may appear in at most one post.
- Fit as many items as possible, prioritising high-value items. Low-priority items may be left out if dates are insufficient.
- Item distribution targets:
  - STAR items ≈ 60–70% of assignments
  - PUZZLE items ≈ 20–30% of assignments
  - PLOW_HORSE items ≤ 10% of assignments
- For each assignment, provide:
  - scheduled_date: one of the dates listed above (exactly as written)
  - format: "single" or "carousel"
  - items: list of exactly 1 item name (single) or 2–4 item names (carousel)
  - carousel_narrative: a short angle explaining why these items belong together (carousel only, null for single)"""


# ---------------------------------------------------------------------------
# Formatting helper
# ---------------------------------------------------------------------------

def _format_promotion_slots(
    weeks: list[WeekSelection],
    holiday_by_date: dict[str, str] | None = None,
) -> str:
    """Format only the promotion-eligible slots for the format-assignment LLM."""
    hmap = holiday_by_date or {}
    lines: list[str] = []
    for week in weeks:
        week_slots = []
        for d in week.selected_dates:
            hid = hmap.get(d)
            annotation = "  [HOLIDAY]" if hid else ""
            week_slots.append(f"  - {d}{annotation}")
        if week_slots:
            lines.append(f"Week {week.week_number}:")
            lines.extend(week_slots)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Post-generation sanitiser (pure Python — no LLM needed)
# ---------------------------------------------------------------------------

def _sanitize_assignments(
    plan: PostFormatPlan,
    promotion_slot_dates: list[str],
) -> PostFormatPlan:
    """Drop assignments that use invalid or duplicate dates, then cap to slot count.

    This runs deterministically after every LLM generation so the hard constraint
    checker never sees overcounting caused by hallucinated dates.
    """
    slot_date_set = set(promotion_slot_dates)
    seen_dates: set[str] = set()
    kept = []
    for a in plan.assignments:
        if a.scheduled_date not in slot_date_set:
            logger.debug("sanitize: dropping assignment for unknown date %s", a.scheduled_date)
            continue
        if a.scheduled_date in seen_dates:
            logger.debug("sanitize: dropping duplicate assignment for date %s", a.scheduled_date)
            continue
        seen_dates.add(a.scheduled_date)
        kept.append(a)
    if len(kept) > len(promotion_slot_dates):
        logger.debug("sanitize: trimming %d excess assignments", len(kept) - len(promotion_slot_dates))
        kept = kept[: len(promotion_slot_dates)]
    return PostFormatPlan(assignments=kept)


# ---------------------------------------------------------------------------
# Hard constraint checkers (pure Python — no LLM needed)
# ---------------------------------------------------------------------------

def _check_date_constraints(
    plan: PostFormatPlan,
    slot_date_set: set[str],
    promotion_slot_dates: list[str],
) -> list[str]:
    """Checks: assignment count, invalid dates, duplicate dates."""
    failures: list[str] = []

    if len(plan.assignments) > len(promotion_slot_dates):
        failures.append(
            f"Plan has {len(plan.assignments)} assignment(s) but only {len(promotion_slot_dates)} "
            f"dates are available — do not exceed the available date count"
        )

    invalid_dates = [a.scheduled_date for a in plan.assignments if a.scheduled_date not in slot_date_set]
    if invalid_dates:
        failures.append(
            f"Assignment(s) use date(s) not in the available list: {', '.join(sorted(set(invalid_dates)))}"
        )

    date_counts = Counter(a.scheduled_date for a in plan.assignments)
    duplicate_dates = [d for d, c in date_counts.items() if c > 1]
    if duplicate_dates:
        failures.append(
            f"Multiple assignments share the same date: {', '.join(sorted(duplicate_dates))}"
        )

    return failures


def _check_item_constraints(
    plan: PostFormatPlan,
    promotion_items: list[dict],
) -> list[str]:
    """Checks: missing items, duplicate items, star items in carousels."""
    failures: list[str] = []

    expected_names = {item.get("menu", "") for item in promotion_items if item.get("menu")}
    star_names = {item.get("menu", "") for item in promotion_items if item.get("action") == "star" and item.get("menu")}
    assigned_items: list[str] = [item for a in plan.assignments for item in a.items]

    missing = expected_names - set(assigned_items)
    if missing:
        failures.append(f"Items not assigned to any post: {', '.join(sorted(missing))}")

    item_counts = Counter(assigned_items)
    dupes = [item for item, c in item_counts.items() if c > 1]
    if dupes:
        failures.append(f"Items appear in more than one post: {', '.join(sorted(dupes))}")

    for a in plan.assignments:
        if a.format == "carousel" and any(i in star_names for i in a.items):
            offenders = [i for i in a.items if i in star_names]
            failures.append(
                f"Star item(s) {', '.join(offenders)} in carousel on {a.scheduled_date} — must be single"
            )

    return failures


def _check_carousel_constraints(
    plan: PostFormatPlan,
    candidate_weeks: list[CandidateWeek],
    holiday_by_date: dict[str, str],
) -> list[str]:
    """Checks: holiday format, weekly carousel cap, carousel size and narrative."""
    failures: list[str] = []

    for a in plan.assignments:
        if a.scheduled_date in holiday_by_date and a.format == "carousel":
            failures.append(f"Holiday slot {a.scheduled_date} is carousel — must be single")

    date_to_week: dict[str, int] = {
        s.date: s.week_number for w in candidate_weeks for s in w.slots
    }
    carousels_by_week = Counter(
        date_to_week.get(a.scheduled_date, 0)
        for a in plan.assignments
        if a.format == "carousel"
    )
    for wk, count in carousels_by_week.items():
        if count > 2:
            failures.append(f"Week {wk} has {count} carousel(s) — maximum is 2")

    for a in plan.assignments:
        if a.format == "carousel":
            if len(a.items) < 2 or len(a.items) > 4:
                failures.append(
                    f"Carousel on {a.scheduled_date} has {len(a.items)} item(s) — must be 2–4"
                )
            if not a.carousel_narrative:
                failures.append(f"Carousel on {a.scheduled_date} is missing carousel_narrative")

    return failures


def _check_hard_constraints(
    plan: PostFormatPlan,
    promotion_items: list[dict],
    candidate_weeks: list[CandidateWeek],
    holiday_by_date: dict[str, str],
    promotion_slot_dates: list[str],
) -> list[str]:
    """Return a list of constraint violation descriptions, empty if all pass."""
    slot_date_set = set(promotion_slot_dates)
    return (
        _check_date_constraints(plan, slot_date_set, promotion_slot_dates)
        + _check_item_constraints(plan, promotion_items)
        + _check_carousel_constraints(plan, candidate_weeks, holiday_by_date)
    )


# ---------------------------------------------------------------------------
# Format context
# ---------------------------------------------------------------------------

@dataclass
class _FormatContext:
    holiday_by_date: dict[str, str]
    candidate_weeks: list[CandidateWeek]
    promotion_slot_dates: list[str]
    items_str: str
    location_summary: str
    primary_meal_period: str
    date_start: str
    date_end: str
    generation_prompt: str
    reflection_prompt: str


def _prepare_format_context(planning: Any) -> "_FormatContext":
    """Derive all context and pre-format both LLM prompts from planning state."""
    holiday_by_date: dict[str, str] = {
        h["date"]: h["id"] for h in (planning.nationalHolidays or [])
    }
    promotion_slot_dates: list[str] = [
        d for week in planning.postSchedule.weeks for d in week.selected_dates
    ]
    items_str = _format_items_for_selection(planning.promotionItems)
    location_summary = planning.locationSummary or "No venue profile available."
    primary_meal_period = (planning.operatingProfile or {}).get("primaryMealPeriod", "N/A")
    date_start = planning.dateStart or "unknown"
    date_end = planning.dateEnd or "unknown"

    generation_prompt = _FORMAT_ASSIGNMENT_PROMPT.format(
        slot_count=len(promotion_slot_dates),
        item_count=len(planning.promotionItems),
        promotion_slots=_format_promotion_slots(planning.postSchedule.weeks, holiday_by_date),
        promotion_items=items_str,
    )
    reflection_prompt = _REFLECTION_PROMPT.format(
        location_summary=location_summary,
        primary_meal_period=primary_meal_period,
        date_start=date_start,
        date_end=date_end,
        promotion_items=items_str,
        serialized_plan="{serialized_plan}",  # deferred — filled per iteration
    )
    return _FormatContext(
        holiday_by_date=holiday_by_date,
        candidate_weeks=planning.candidateWeeks or [],
        promotion_slot_dates=promotion_slot_dates,
        items_str=items_str,
        location_summary=location_summary,
        primary_meal_period=primary_meal_period,
        date_start=date_start,
        date_end=date_end,
        generation_prompt=generation_prompt,
        reflection_prompt=reflection_prompt,
    )


# ---------------------------------------------------------------------------
# Iteration helpers
# ---------------------------------------------------------------------------

async def _generate_or_revise_plan(
    iteration: int,
    ctx: "_FormatContext",
    current_plan: PostFormatPlan | None,
    feedback_bullets: list[str],
    config: RunnableConfig,
) -> PostFormatPlan:
    """Call the appropriate LLM depending on whether this is the first attempt or a revision."""
    if iteration == 0:
        await _emit("assign_post_formats", "generating", f"Generating post format plan (attempt {iteration + 1})...", config)
        return await _format_llm_structured.ainvoke(ctx.generation_prompt)

    await _emit("assign_post_formats", "generating", f"Revising post format plan (attempt {iteration + 1})...", config)
    revision_prompt = _REVISION_PROMPT.format(
        slot_count=len(ctx.promotion_slot_dates),
        location_summary=ctx.location_summary,
        primary_meal_period=ctx.primary_meal_period,
        date_start=ctx.date_start,
        date_end=ctx.date_end,
        promotion_items=ctx.items_str,
        previous_plan_json=_serialize_plan(current_plan) if current_plan else "[]",
        feedback="\n".join(f"- {f}" for f in feedback_bullets),
    )
    return await _revise_llm_structured.ainvoke(revision_prompt)


async def _reflect_on_plan(
    iteration: int,
    current_plan: PostFormatPlan,
    ctx: "_FormatContext",
    config: RunnableConfig,
) -> tuple[str, list[str]]:
    """Call the marketing reflector LLM. Returns (verdict, feedback_bullets).

    Returns ("pass", []) on any LLM failure so the loop can accept the current plan.
    """
    await _emit("assign_post_formats", "reflecting", "Reviewing promotion plan quality...", config)
    try:
        reflect_result: _PostFormatReflectionResult = await _reflector_llm.ainvoke(
            ctx.reflection_prompt.format(serialized_plan=_serialize_plan(current_plan))
        )
    except Exception:
        logger.exception("Reflector LLM failed on iteration %d; accepting current plan", iteration)
        return "pass", []
    return reflect_result.verdict, (reflect_result.feedback or [])


# ---------------------------------------------------------------------------
# Main generate → check → reflect → revise loop
# ---------------------------------------------------------------------------

async def _run_format_loop(
    ctx: "_FormatContext",
    planning: Any,
    config: RunnableConfig,
) -> tuple[PostFormatPlan | None, list[ReflectionIteration]]:
    """Iterate up to _MAX_REFLECTION_ITERATIONS times, returning the best plan found."""
    current_plan: PostFormatPlan | None = None
    feedback_bullets: list[str] = []
    reflection_log: list[ReflectionIteration] = []

    for iteration in range(_MAX_REFLECTION_ITERATIONS + 1):
        try:
            current_plan = await _generate_or_revise_plan(iteration, ctx, current_plan, feedback_bullets, config)
        except Exception:
            logger.exception("Failed to generate/revise post format plan on iteration %d", iteration)
            break

        if current_plan is None:
            break

        current_plan = _sanitize_assignments(current_plan, ctx.promotion_slot_dates)
        hard_failures = _check_hard_constraints(
            current_plan, planning.promotionItems, ctx.candidate_weeks, ctx.holiday_by_date, ctx.promotion_slot_dates
        )

        if hard_failures:
            logger.info(
                "assign_post_formats: hard constraint failures on iteration %d:\n%s",
                iteration,
                "\n".join(f"  - {f}" for f in hard_failures),
            )
            reflection_log.append(ReflectionIteration(
                iteration=iteration, verdict="revise", feedback=hard_failures, draft=_serialize_plan(current_plan)
            ))
            feedback_bullets = hard_failures
            if iteration >= _MAX_REFLECTION_ITERATIONS:
                logger.warning("assign_post_formats: accepting plan despite hard failures after max iterations")
                await _emit("assign_post_formats", "reflect_pass", f"Accepted after {iteration + 1} attempt(s) (hard failures remain)", config)
                break
            await _emit("assign_post_formats", "reflect_revise", f"Hard constraint violations found — revising: {'; '.join(hard_failures[:2])}", config)
            continue

        if iteration >= _MAX_REFLECTION_ITERATIONS:
            logger.info("assign_post_formats: reached max iterations (%d), accepting final plan", _MAX_REFLECTION_ITERATIONS)
            reflection_log.append(ReflectionIteration(
                iteration=iteration, verdict="pass", feedback=[], draft=_serialize_plan(current_plan)
            ))
            await _emit("assign_post_formats", "reflect_pass", f"Accepted final plan after {iteration + 1} attempt(s)", config)
            break

        verdict, feedback_bullets = await _reflect_on_plan(iteration, current_plan, ctx, config)
        reflection_log.append(ReflectionIteration(
            iteration=iteration, verdict=verdict, feedback=feedback_bullets, draft=_serialize_plan(current_plan)
        ))

        if verdict == "pass":
            logger.info("assign_post_formats: passed marketing review on iteration %d", iteration)
            await _emit("assign_post_formats", "reflect_pass", f"Plan passed marketing review on attempt {iteration + 1}", config)
            break

        logger.info(
            "assign_post_formats: marketing revision requested on iteration %d:\n%s",
            iteration,
            "\n".join(f"  - {f}" for f in feedback_bullets),
        )
        await _emit("assign_post_formats", "reflect_revise", f"Revising: {'; '.join(feedback_bullets[:2])}", config)

    return current_plan, reflection_log


# ---------------------------------------------------------------------------
# Graph node
# ---------------------------------------------------------------------------

async def assign_post_formats(state: State, config: RunnableConfig) -> dict[str, Any]:
    """LLM decides single vs. carousel format for each promotion slot and groups items.

    Delegates to helpers: _prepare_format_context → _run_format_loop
    (which calls _generate_or_revise_plan, _check_hard_constraints, _reflect_on_plan).
    """
    await _emit("assign_post_formats", "running", "Assigning post formats...", config)

    planning = state.planning
    if not (planning and planning.postSchedule and planning.promotionItems):
        await _emit("assign_post_formats", "done", "Post format assignment unavailable", config)
        return {"planning": _update_planning(planning, postFormatPlan=None)}

    ctx = _prepare_format_context(planning)
    post_format_plan, reflection_log = await _run_format_loop(ctx, planning, config)

    carousel_count = sum(1 for a in (post_format_plan.assignments if post_format_plan else []) if a.format == "carousel")
    single_count = sum(1 for a in (post_format_plan.assignments if post_format_plan else []) if a.format == "single")
    label = (
        f"{single_count} single · {carousel_count} carousel post(s) assigned"
        if post_format_plan
        else "Post format assignment unavailable"
    )
    await _emit("assign_post_formats", "done", label, config)
    return {"planning": _update_planning(
        planning,
        postFormatPlan=post_format_plan,
        postFormatReflectionLog=reflection_log or None,
    )}
