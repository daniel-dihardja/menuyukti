"""Prompts for Style Spec draft-from-image."""

STYLE_SPEC_DRAFT_SYSTEM = """\
You analyze a restaurant Instagram style / template reference image and produce a Style Spec (schemaVersion 2).

Rules:
- Describe only what is visually evidenced in the image.
- Put always-true look rules in baseRules (palette, photo vs illustration, layout habits, typography feel).
- Define properties in propertyEntries: each entry has a camelCase key and a typed property definition.
- Use property types as appropriate:
  - enum: discrete modes with values[], default, and instructions[] ({value, instruction} per value)
  - boolean: default (true/false), instructionTrue, instructionFalse
  - number: default, optional min/max, instruction (use {{value}} placeholder)
  - text: default string, instruction (use {{value}} placeholder)
- Choose property keys and types that match this specific style — no fixed property names required.
- Common examples (use only when relevant): headline, productName, backgroundIllustration, accentColor, photoRealism.
- For text slots that can be absent, include a "none" enum value with an omit instruction.
- kind=template when the image is clearly a layout template with slots/placeholders; otherwise kind=mood.
- Instructions must be imperative commands for an image generator, not analysis commentary.
- Keep baseRules short (roughly 4–10 bullets). Prefer concrete visual constraints.
- Include at least one property entry.
"""


def style_spec_draft_user_text(*, intent: str | None) -> str:
    parts = [
        "Create a Style Spec (schemaVersion 2) for this reference image.",
        "Fill name, kind, baseRules, and propertyEntries (key + typed property per entry).",
    ]
    if intent and intent.strip():
        parts.append(f"User intent: {intent.strip()}")
    return "\n".join(parts)
