"""Style Spec v1 models (Pydantic) for location visual style packs."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

STYLE_SPEC_CONTROL_KEYS = ("headline", "productName", "backgroundIllustration")


class ControlParam(BaseModel):
    type: Literal["string"] = "string"
    requiredWhen: str | None = None
    description: str | None = None


class StyleControlDef(BaseModel):
    type: Literal["enum"] = "enum"
    values: list[str] = Field(min_length=1)
    default: str
    description: str | None = None
    params: dict[str, ControlParam] | None = None
    instructions: dict[str, str]

    @field_validator("values")
    @classmethod
    def _nonempty_values(cls, values: list[str]) -> list[str]:
        cleaned = [v.strip() for v in values if v and v.strip()]
        if not cleaned:
            raise ValueError("values must not be empty")
        return cleaned

    @model_validator(mode="after")
    def _default_and_instructions(self) -> StyleControlDef:
        if self.default not in self.values:
            raise ValueError("default must be one of values")
        for value in self.values:
            text = self.instructions.get(value)
            if not text or not str(text).strip():
                raise ValueError(f"Missing instructions for value {value!r}")
        return self


class StyleSpecControls(BaseModel):
    headline: StyleControlDef
    productName: StyleControlDef
    backgroundIllustration: StyleControlDef


class StyleSpecDefaults(BaseModel):
    headline: str
    productName: str
    backgroundIllustration: str


class StyleSpec(BaseModel):
    schemaVersion: Literal[1] = 1
    kind: Literal["template", "mood"]
    baseRules: list[str] = Field(min_length=1, max_length=40)
    controls: StyleSpecControls
    defaults: StyleSpecDefaults

    @field_validator("baseRules")
    @classmethod
    def _clean_rules(cls, rules: list[str]) -> list[str]:
        cleaned = [r.strip() for r in rules if r and r.strip()]
        if not cleaned:
            raise ValueError("baseRules must not be empty")
        return cleaned

    @model_validator(mode="after")
    def _defaults_in_values(self) -> StyleSpec:
        for key in STYLE_SPEC_CONTROL_KEYS:
            control: StyleControlDef = getattr(self.controls, key)
            default_value: str = getattr(self.defaults, key)
            if default_value not in control.values:
                raise ValueError(f"defaults.{key} must be one of controls.{key}.values")
        return self


class DraftInstruction(BaseModel):
    """One enum value → imperative instruction (list form for OpenAI structured output)."""

    value: str = Field(description="Control enum value this instruction applies to")
    instruction: str = Field(description="Imperative instruction for the image generator")


class DraftControl(BaseModel):
    """LLM-friendly control definition without free-form dict keys."""

    values: list[str] = Field(min_length=1, description="Allowed enum values")
    default: str = Field(description="Default value; must appear in values")
    instructions: list[DraftInstruction] = Field(
        min_length=1,
        description="One entry per value in values",
    )

    def to_style_control_def(self) -> StyleControlDef:
        values = [v.strip() for v in self.values if v and v.strip()]
        instr_map: dict[str, str] = {}
        for item in self.instructions:
            key = item.value.strip()
            text = item.instruction.strip()
            if key and text:
                instr_map[key] = text
        for value in values:
            if value not in instr_map:
                instr_map[value] = f"Apply control mode {value}."
        default = self.default.strip() if self.default.strip() in values else values[0]
        return StyleControlDef(
            type="enum",
            values=values,
            default=default,
            instructions=instr_map,
        )


class StyleSpecDraftOutput(BaseModel):
    """LLM structured output for create-from-image (OpenAI-schema-friendly)."""

    name: str = Field(description="Short suggested style pack name")
    kind: Literal["template", "mood"]
    baseRules: list[str] = Field(min_length=1, max_length=40)
    headline: DraftControl
    productName: DraftControl
    backgroundIllustration: DraftControl
    defaultHeadline: str = Field(description="Default for headline; must be in headline.values")
    defaultProductName: str = Field(
        description="Default for productName; must be in productName.values"
    )
    defaultBackgroundIllustration: str = Field(
        description="Default for backgroundIllustration; must be in backgroundIllustration.values"
    )

    def to_style_spec(self) -> StyleSpec:
        controls = StyleSpecControls(
            headline=self.headline.to_style_control_def(),
            productName=self.productName.to_style_control_def(),
            backgroundIllustration=self.backgroundIllustration.to_style_control_def(),
        )
        defaults = StyleSpecDefaults(
            headline=self.defaultHeadline.strip() or controls.headline.default,
            productName=self.defaultProductName.strip() or controls.productName.default,
            backgroundIllustration=(
                self.defaultBackgroundIllustration.strip()
                or controls.backgroundIllustration.default
            ),
        )
        # Coerce defaults into allowed values if the model drifts
        if defaults.headline not in controls.headline.values:
            defaults.headline = controls.headline.default
        if defaults.productName not in controls.productName.values:
            defaults.productName = controls.productName.default
        if defaults.backgroundIllustration not in controls.backgroundIllustration.values:
            defaults.backgroundIllustration = controls.backgroundIllustration.default
        return StyleSpec(
            schemaVersion=1,
            kind=self.kind,
            baseRules=self.baseRules,
            controls=controls,
            defaults=defaults,
        )


def normalize_style_spec_dict(raw: dict[str, Any]) -> StyleSpec:
    """Validate and coerce a dict into StyleSpec (drops unknown top-level keys via model)."""
    return StyleSpec.model_validate(raw)


def rules_from_style_spec(spec: StyleSpec, *, max_len: int = 4000) -> str:
    text = "\n".join(r.strip() for r in spec.baseRules if r.strip())
    return text[:max_len]
