"""Post format task: assign single vs. carousel format to each promotion slot."""

import json
import logging
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
# Hard constraint checker (pure Python — no LLM needed)
# ---------------------------------------------------------------------------

def _check_hard_constraints(
    plan: PostFormatPlan,
    promotion_items: list[dict],
    candidate_weeks: list[CandidateWeek],
    holiday_by_date: dict[str, str],
    promotion_slot_dates: list[str],
) -> list[str]:
    """Return a list of constraint violation descriptions, empty if all pass."""
    failures: list[str] = []

    slot_date_set = set(promotion_slot_dates)

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

    duplicate_dates = [d for d, c in ((d, sum(1 for a in plan.assignments if a.scheduled_date == d)) for d in {a.scheduled_date for a in plan.assignments}) if c > 1]
    if duplicate_dates:
        failures.append(
            f"Multiple assignments share the same date: {', '.join(sorted(duplicate_dates))}"
        )

    expected_names = {item.get("menu", "") for item in promotion_items if item.get("menu")}
    star_names = {item.get("menu", "") for item in promotion_items if item.get("action") == "star" and item.get("menu")}

    assigned_items: list[str] = [item for a in plan.assignments for item in a.items]

    missing = expected_names - set(assigned_items)
    if missing:
        failures.append(f"Items not assigned to any post: {', '.join(sorted(missing))}")

    seen: set[str] = set()
    dupes: set[str] = set()
    for item in assigned_items:
        if item in seen:
            dupes.add(item)
        seen.add(item)
    if dupes:
        failures.append(f"Items appear in more than one post: {', '.join(sorted(dupes))}")

    for a in plan.assignments:
        if a.format == "carousel" and any(i in star_names for i in a.items):
            offenders = [i for i in a.items if i in star_names]
            failures.append(
                f"Star item(s) {', '.join(offenders)} in carousel on {a.scheduled_date} — must be single"
            )

    for a in plan.assignments:
        if a.scheduled_date in holiday_by_date and a.format == "carousel":
            failures.append(
                f"Holiday slot {a.scheduled_date} is carousel — must be single"
            )

    date_to_week: dict[str, int] = {
        s.date: s.week_number for w in candidate_weeks for s in w.slots
    }
    carousels_by_week: dict[int, int] = {}
    for a in plan.assignments:
        if a.format == "carousel":
            wk = date_to_week.get(a.scheduled_date, 0)
            carousels_by_week[wk] = carousels_by_week.get(wk, 0) + 1
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
                failures.append(
                    f"Carousel on {a.scheduled_date} is missing carousel_narrative"
                )

    return failures


# ---------------------------------------------------------------------------
# Graph node
# ---------------------------------------------------------------------------

async def assign_post_formats(state: State, config: RunnableConfig) -> dict[str, Any]:
    """LLM decides single vs. carousel format for each promotion slot and groups items.

    Runs an inline generate → hard-check → reflect → revise loop up to
    REFLECT_MAX_ITERATIONS times, keeping PostFormatPlan structured throughout.
    """
    await _emit("assign_post_formats", "running", "Assigning post formats...", config)

    planning = state.planning
    post_format_plan: PostFormatPlan | None = None
    reflection_log: list[ReflectionIteration] = []

    if not (planning and planning.postSchedule and planning.promotionItems):
        await _emit("assign_post_formats", "done", "Post format assignment unavailable", config)
        return {"planning": _update_planning(planning, postFormatPlan=None)}

    holiday_by_date: dict[str, str] = {
        h["date"]: h["id"] for h in (planning.nationalHolidays or [])
    }
    candidate_weeks = planning.candidateWeeks or []
    promotion_slot_dates: list[str] = [
        d for week in planning.postSchedule.weeks for d in week.selected_dates
    ]
    promotion_slots_str = _format_promotion_slots(
        planning.postSchedule.weeks,
        holiday_by_date=holiday_by_date,
    )
    items_str = _format_items_for_selection(planning.promotionItems)
    location_summary = planning.locationSummary or "No venue profile available."
    primary_meal_period = (planning.operatingProfile or {}).get("primaryMealPeriod", "N/A")
    date_start = planning.dateStart or "unknown"
    date_end = planning.dateEnd or "unknown"

    generation_prompt = _FORMAT_ASSIGNMENT_PROMPT.format(
        slot_count=len(promotion_slot_dates),
        item_count=len(planning.promotionItems),
        promotion_slots=promotion_slots_str,
        promotion_items=items_str,
    )

    reflection_prompt = _REFLECTION_PROMPT.format(
        location_summary=location_summary,
        primary_meal_period=primary_meal_period,
        date_start=date_start,
        date_end=date_end,
        promotion_items=items_str,
        serialized_plan="{serialized_plan}",
    )

    current_plan: PostFormatPlan | None = None
    feedback_bullets: list[str] = []

    for iteration in range(_MAX_REFLECTION_ITERATIONS + 1):
        is_first = iteration == 0

        try:
            if is_first:
                await _emit("assign_post_formats", "generating", f"Generating post format plan (attempt {iteration + 1})...", config)
                current_plan = await _format_llm_structured.ainvoke(generation_prompt)
            else:
                await _emit("assign_post_formats", "generating", f"Revising post format plan (attempt {iteration + 1})...", config)
                feedback_text = "\n".join(f"- {f}" for f in feedback_bullets)
                revision_prompt = _REVISION_PROMPT.format(
                    slot_count=len(promotion_slot_dates),
                    location_summary=location_summary,
                    primary_meal_period=primary_meal_period,
                    date_start=date_start,
                    date_end=date_end,
                    promotion_items=items_str,
                    previous_plan_json=json.dumps(
                        [a.model_dump() for a in current_plan.assignments] if current_plan else [],
                        indent=2,
                    ),
                    feedback=feedback_text,
                )
                current_plan = await _revise_llm_structured.ainvoke(revision_prompt)
        except Exception:
            logger.exception("Failed to generate/revise post format plan on iteration %d", iteration)
            break

        if current_plan is None:
            break

        # Deterministically drop hallucinated/duplicate/excess dates before checking
        current_plan = _sanitize_assignments(current_plan, promotion_slot_dates)

        # Hard constraint check — pure Python, no LLM cost
        hard_failures = _check_hard_constraints(
            current_plan, planning.promotionItems, candidate_weeks, holiday_by_date, promotion_slot_dates
        )

        if hard_failures:
            logger.info(
                "assign_post_formats: hard constraint failures on iteration %d:\n%s",
                iteration,
                "\n".join(f"  - {f}" for f in hard_failures),
            )
            reflection_log.append(ReflectionIteration(
                iteration=iteration,
                verdict="revise",
                feedback=hard_failures,
                draft=json.dumps([a.model_dump() for a in current_plan.assignments], indent=2),
            ))
            feedback_bullets = hard_failures

            if iteration >= _MAX_REFLECTION_ITERATIONS:
                logger.warning("assign_post_formats: accepting plan despite hard failures after max iterations")
                await _emit("assign_post_formats", "reflect_pass", f"Accepted after {iteration + 1} attempt(s) (hard failures remain)", config)
                break

            await _emit("assign_post_formats", "reflect_revise", f"Hard constraint violations found — revising: {'; '.join(hard_failures[:2])}", config)
            continue

        # No hard failures — call the marketing expert reflector
        if iteration >= _MAX_REFLECTION_ITERATIONS:
            logger.info("assign_post_formats: reached max iterations (%d), accepting final plan", _MAX_REFLECTION_ITERATIONS)
            reflection_log.append(ReflectionIteration(
                iteration=iteration,
                verdict="pass",
                feedback=[],
                draft=json.dumps([a.model_dump() for a in current_plan.assignments], indent=2),
            ))
            await _emit("assign_post_formats", "reflect_pass", f"Accepted final plan after {iteration + 1} attempt(s)", config)
            break

        await _emit("assign_post_formats", "reflecting", "Reviewing promotion plan quality...", config)
        try:
            reflect_result: _PostFormatReflectionResult = await _reflector_llm.ainvoke(
                reflection_prompt.format(
                    serialized_plan=json.dumps(
                        [a.model_dump() for a in current_plan.assignments], indent=2
                    )
                )
            )
        except Exception:
            logger.exception("Reflector LLM failed on iteration %d; accepting current plan", iteration)
            reflection_log.append(ReflectionIteration(
                iteration=iteration,
                verdict="pass",
                feedback=[],
                draft=json.dumps([a.model_dump() for a in current_plan.assignments], indent=2),
            ))
            break

        if reflect_result.verdict == "pass":
            logger.info("assign_post_formats: passed marketing review on iteration %d", iteration)
            reflection_log.append(ReflectionIteration(
                iteration=iteration,
                verdict="pass",
                feedback=[],
                draft=json.dumps([a.model_dump() for a in current_plan.assignments], indent=2),
            ))
            await _emit("assign_post_formats", "reflect_pass", f"Plan passed marketing review on attempt {iteration + 1}", config)
            break

        feedback_bullets = reflect_result.feedback or []
        feedback_text_short = "; ".join(feedback_bullets[:2])
        logger.info(
            "assign_post_formats: marketing revision requested on iteration %d:\n%s",
            iteration,
            "\n".join(f"  - {f}" for f in feedback_bullets),
        )
        reflection_log.append(ReflectionIteration(
            iteration=iteration,
            verdict="revise",
            feedback=feedback_bullets,
            draft=json.dumps([a.model_dump() for a in current_plan.assignments], indent=2),
        ))
        await _emit("assign_post_formats", "reflect_revise", f"Revising: {feedback_text_short}", config)

    post_format_plan = current_plan

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
