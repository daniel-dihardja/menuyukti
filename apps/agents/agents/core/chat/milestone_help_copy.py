"""English help copy for chat milestone help tool.

Keep in sync with apps/web/messages/en.json (analytics.campaigns.chat milestonePreset.goal,
milestoneHelp* optional-input strings, milestoneHelpWhatItDoesFallback).
"""

from __future__ import annotations

# Same keys as apps/web/lib/milestones/milestone-help-description.ts PRESET_GOAL_TRANSLATION_KEYS
_PRESET_CATALOG_GOAL: dict[str, str] = {
    "restaurant_campaign_brief": (
        "The data holds a factual campaign brief foundation: venue snapshot, an explicit "
        "overall business strategy (`overallStrategy`) for audience ordering and lunch-first "
        "focus, objective and funnel stage, target segments, message hierarchy, CTA/offer "
        "plan, content and proof strategy, plus measurement/testing/risk guardrails grounded "
        "in available analytics."
    ),
    "promotion_candidates": (
        "Requires a prior Campaign Brief. Fetches promotion-engineering candidates, orders "
        "categories using the brief's main category, and enriches each star and puzzle menu name "
        "with storytelling fit (strong vs weak) and a short rationale grounded in the brief."
    ),
    "menu_tagger": (
        "Requires a prior Promotion Candidates milestone. Reads saved star and puzzle items and "
        "assigns fixed taxonomy tags (kind, ingredient, taste, course) to each menu item for "
        "downstream content grouping."
    ),
    "reel_lineup": (
        "Requires prior Campaign Brief and Menu Tagger milestones. Picks up to five main-course "
        "food items with strong storytelling from tagged items in menu tagger order and places "
        "each as the position-1 Reel hook in its own food group. Food groups also store the "
        "same core weekday lunch-offer message, creative rotation role, and scheduler-facing "
        "preferred weekday/time hints. Also picks up to three tagged beverage drinks "
        "(storytelling fit not required) as position-1 drink Reel hook groups."
    ),
    "post_lineup": (
        "Requires a prior Reel Lineup milestone. Reads saved foodLeads and drafts Instagram "
        "feed post concepts. Builds a pinned monthly menu carousel with one slide per food "
        "lead, each slide naming the dish and including a high-quality photo brief."
    ),
    "culture_hooks": (
        "Use Campaign Brief data to identify the location concept and target audience, then "
        "generate intersection topics between the concept and the audience's likely interests "
        "(not necessarily food). These intersections should be actionable for Instagram Reels "
        "ideas that attract potential new customers."
    ),
    "ig_profile": (
        "Read Campaign Brief data and generate Instagram profile suggestions — username options "
        "and three bio variations — aligned with brand, audience, and campaign objective."
    ),
    "scheduler": (
        "Reads the campaign window from dates plus business strategy from Campaign Brief and "
        "food-group rotation hints from Reel Lineup. It schedules food reels as a recurring "
        "twice-weekly lunch cadence with explicit `reel` slot kinds between the start and end "
        "dates."
    ),
}

_WHAT_IT_DOES_FALLBACK = "Add goal text to describe what this milestone does."

_CAMPAIGN_BRIEF_OPTIONAL = (
    "Optional input (Campaign brief notes)",
    "If you fill the optional Input field, it is sent alongside location profile and analytics "
    "signals when generating the campaign brief.",
    "Use it when temporary context or constraints matter, for example during a soccer World Cup "
    "period (match-day audience, campaign tone, offers, or no-alcohol messaging). Leave it "
    "empty when standard analytics and profile data are enough.",
)

_OPTIONAL_INPUT_GENERIC_TITLE = "Optional input"
_OPTIONAL_INPUT_GENERIC_SUMMARY = (
    "Notes from the Input tab are free-form guidance for the run; they are not verified as "
    "analytics facts."
)


def resolve_what_it_does(preset_id: str | None, milestone_goal: str | None) -> str:
    """Match getMilestoneHelpDescription: catalog goal → custom goal → fallback."""
    if preset_id and preset_id in _PRESET_CATALOG_GOAL:
        return _PRESET_CATALOG_GOAL[preset_id]
    custom = milestone_goal.strip() if isinstance(milestone_goal, str) else ""
    if custom:
        return custom
    return _WHAT_IT_DOES_FALLBACK


def format_optional_input_section(preset_id: str | None) -> str | None:
    """Match milestone-item-tabs Help tab optional-input blocks."""
    if preset_id == "restaurant_campaign_brief":
        title, a, b = _CAMPAIGN_BRIEF_OPTIONAL
        return "\n".join(
            [
                "",
                f"## {title}",
                "",
                a,
                "",
                b,
            ],
        )
    if preset_id in (
        "promotion_candidates",
        "culture_hooks",
        "ig_profile",
        "menu_tagger",
        "reel_lineup",
        "post_lineup",
        "scheduler",
    ):
        return "\n".join(
            [
                "",
                f"## {_OPTIONAL_INPUT_GENERIC_TITLE}",
                "",
                _OPTIONAL_INPUT_GENERIC_SUMMARY,
            ],
        )
    return None


def format_milestone_help_markdown(
    *,
    name: str,
    preset_id: str | None,
    milestone_goal: str | None,
) -> str:
    """Full Help-tab style markdown for the selected milestone."""
    what = resolve_what_it_does(preset_id, milestone_goal)
    lines = [
        f"## {name}",
        "",
        "## What this milestone does",
        "",
        what,
    ]
    optional = format_optional_input_section(preset_id)
    if optional:
        lines.append(optional)
    return "\n".join(lines)
