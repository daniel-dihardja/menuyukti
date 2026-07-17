"""Prompts for Style Spec draft-from-image."""

STYLE_SPEC_DRAFT_SYSTEM = """\
You analyze a restaurant Instagram style / template reference image and produce a Style Spec.

Rules:
- Describe only what is visually evidenced in the image.
- Put always-true look rules in baseRules (palette, photo vs illustration, layout habits, typography feel).
- You MUST define exactly these three controls as separate fields: headline, productName, backgroundIllustration.
- For each control, provide values (enum list), a default, and instructions as a list of {value, instruction} pairs — one per value.
- Also set defaultHeadline, defaultProductName, defaultBackgroundIllustration (must match each control's values).
- Do not invent other control keys.
- Include a "none" (or equivalent omit) value for headline and productName when text can be absent.
- For backgroundIllustration include at least: template_default (or mood_default), minimal, none.
- kind=template when the image is clearly a layout template with slots/placeholders; otherwise kind=mood.
- Instructions must be imperative commands for an image generator, not analysis commentary.
- Keep baseRules short (roughly 4–10 bullets). Prefer concrete visual constraints.
"""


def style_spec_draft_user_text(*, intent: str | None) -> str:
    parts = [
        "Create a Style Spec (schemaVersion 1) for this reference image.",
        "Fill name, kind, baseRules, headline, productName, backgroundIllustration, "
        "and defaultHeadline / defaultProductName / defaultBackgroundIllustration.",
    ]
    if intent and intent.strip():
        parts.append(f"User intent: {intent.strip()}")
    return "\n".join(parts)
