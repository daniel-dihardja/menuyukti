"""Prompts for Style Spec draft-from-image."""

STYLE_SPEC_DRAFT_SYSTEM = """\
You analyze a restaurant Instagram style / template reference image and produce a Style Spec (schemaVersion 2).

Rules:
- Describe only what is visually evidenced in the image.
- Encode always-true look constraints (palette, photo vs illustration, layout habits, typography feel) \
as property defaults with clear instructions — do not invent separate top-level fields.
- Define properties in propertyEntries: each entry has a camelCase key and a typed property definition.
- Use property types as appropriate:
  - enum: discrete modes with values[], default, and instructions[] ({value, instruction} per value)
  - boolean: default (true/false), instructionTrue, instructionFalse
  - number: default, optional min/max, instruction (use {{value}} placeholder)
  - text: default string, instruction (use {{value}} placeholder)
- Choose property keys and types that match this specific style — no fixed property names required.
- Common examples (use only when relevant): headline, productName, backgroundIllustration, accentColor, photoRealism.
- For text slots that can be absent, include a "none" enum value with an omit instruction.
- Instructions must be imperative commands for an image generator, not analysis commentary.
- Prefer concrete visual constraints in every instruction.
- Include at least one property entry.
"""


def style_spec_draft_user_text(*, intent: str | None) -> str:
    parts = [
        "Create a Style Spec (schemaVersion 2) for this reference image.",
        "Fill name and propertyEntries (key + typed property per entry).",
    ]
    if intent and intent.strip():
        parts.append(f"User intent: {intent.strip()}")
    return "\n".join(parts)
