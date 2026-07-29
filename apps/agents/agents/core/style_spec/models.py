"""Style Spec v2 models (Pydantic) for workspace visual style packs."""

from __future__ import annotations

import re
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

PROPERTY_KEY_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]*$")
MAX_PROPERTIES = 30


class ControlParam(BaseModel):
    type: Literal["string"] = "string"
    requiredWhen: str | None = None
    description: str | None = None


class EnumPropertyDef(BaseModel):
    type: Literal["enum"] = "enum"
    label: str | None = None
    description: str | None = None
    values: list[str] = Field(min_length=1)
    default: str
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
    def _default_and_instructions(self) -> EnumPropertyDef:
        if self.default not in self.values:
            raise ValueError("default must be one of values")
        for value in self.values:
            text = self.instructions.get(value)
            if not text or not str(text).strip():
                raise ValueError(f"Missing instructions for value {value!r}")
        return self


class BooleanPropertyDef(BaseModel):
    type: Literal["boolean"] = "boolean"
    label: str | None = None
    description: str | None = None
    default: bool
    instructions: dict[str, str]

    @model_validator(mode="after")
    def _boolean_instructions(self) -> BooleanPropertyDef:
        for key in ("true", "false"):
            text = self.instructions.get(key)
            if not text or not str(text).strip():
                raise ValueError(f"Missing instructions for {key!r}")
        return self


class NumberPropertyDef(BaseModel):
    type: Literal["number"] = "number"
    label: str | None = None
    description: str | None = None
    default: float
    min: float | None = None
    max: float | None = None
    instruction: str

    @model_validator(mode="after")
    def _number_bounds(self) -> NumberPropertyDef:
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("min must be <= max")
        if self.min is not None and self.default < self.min:
            raise ValueError("default must be >= min")
        if self.max is not None and self.default > self.max:
            raise ValueError("default must be <= max")
        if not self.instruction.strip():
            raise ValueError("instruction must not be empty")
        return self


class TextPropertyDef(BaseModel):
    type: Literal["text"] = "text"
    label: str | None = None
    description: str | None = None
    default: str
    instruction: str

    @model_validator(mode="after")
    def _text_instruction(self) -> TextPropertyDef:
        if not self.instruction.strip():
            raise ValueError("instruction must not be empty")
        return self


PropertyDef = Annotated[
    EnumPropertyDef | BooleanPropertyDef | NumberPropertyDef | TextPropertyDef,
    Field(discriminator="type"),
]


class StyleSpec(BaseModel):
    schemaVersion: Literal[2] = 2
    properties: dict[str, PropertyDef]

    @model_validator(mode="after")
    def _validate_properties(self) -> StyleSpec:
        if not self.properties:
            raise ValueError("properties must not be empty")
        if len(self.properties) > MAX_PROPERTIES:
            raise ValueError(f"properties must have at most {MAX_PROPERTIES} entries")
        for key in self.properties:
            if not PROPERTY_KEY_RE.match(key):
                raise ValueError(f"Invalid property key {key!r}")
        return self


# --- Agent draft adapter (list form for structured LLM output) ---


class DraftInstruction(BaseModel):
    value: str = Field(description="Enum value this instruction applies to")
    instruction: str = Field(description="Imperative instruction for the image generator")


class DraftEnumProperty(BaseModel):
    type: Literal["enum"] = "enum"
    label: str | None = None
    values: list[str] = Field(min_length=1)
    default: str
    instructions: list[DraftInstruction] = Field(min_length=1)

    def to_enum_property_def(self) -> EnumPropertyDef:
        values = [v.strip() for v in self.values if v and v.strip()]
        instr_map: dict[str, str] = {}
        for item in self.instructions:
            key = item.value.strip()
            text = item.instruction.strip()
            if key and text:
                instr_map[key] = text
        for value in values:
            if value not in instr_map:
                instr_map[value] = f"Apply mode {value}."
        default = self.default.strip() if self.default.strip() in values else values[0]
        label = self.label.strip() if self.label and self.label.strip() else None
        return EnumPropertyDef(
            type="enum",
            values=values,
            default=default,
            instructions=instr_map,
            label=label,
        )


class DraftBooleanProperty(BaseModel):
    type: Literal["boolean"] = "boolean"
    label: str | None = None
    default: bool
    instructionTrue: str = Field(description="Instruction when true")
    instructionFalse: str = Field(description="Instruction when false")

    def to_boolean_property_def(self) -> BooleanPropertyDef:
        label = self.label.strip() if self.label and self.label.strip() else None
        return BooleanPropertyDef(
            type="boolean",
            default=self.default,
            instructions={
                "true": self.instructionTrue.strip(),
                "false": self.instructionFalse.strip(),
            },
            label=label,
        )


class DraftNumberProperty(BaseModel):
    type: Literal["number"] = "number"
    label: str | None = None
    default: float
    min: float | None = None
    max: float | None = None
    instruction: str

    def to_number_property_def(self) -> NumberPropertyDef:
        label = self.label.strip() if self.label and self.label.strip() else None
        return NumberPropertyDef(
            type="number",
            default=self.default,
            instruction=self.instruction.strip(),
            min=self.min,
            max=self.max,
            label=label,
        )


class DraftTextProperty(BaseModel):
    type: Literal["text"] = "text"
    label: str | None = None
    default: str = ""
    instruction: str

    def to_text_property_def(self) -> TextPropertyDef:
        label = self.label.strip() if self.label and self.label.strip() else None
        return TextPropertyDef(
            type="text",
            default=self.default,
            instruction=self.instruction.strip(),
            label=label,
        )


DraftPropertyEntry = Annotated[
    DraftEnumProperty | DraftBooleanProperty | DraftNumberProperty | DraftTextProperty,
    Field(discriminator="type"),
]


class DraftPropertyEntryWithKey(BaseModel):
    key: str = Field(description="Property identifier (camelCase)")
    property: DraftPropertyEntry


class StyleSpecDraftOutput(BaseModel):
    """LLM structured output; normalized to canonical StyleSpec before persistence."""

    name: str = Field(description="Short suggested style pack name")
    propertyEntries: list[DraftPropertyEntryWithKey] = Field(
        min_length=1,
        description="Style properties appropriate to the reference image",
    )

    def to_style_spec(self) -> StyleSpec:
        properties: dict[str, PropertyDef] = {}
        for entry in self.propertyEntries:
            key = entry.key.strip()
            if not PROPERTY_KEY_RE.match(key):
                continue
            prop = entry.property
            if isinstance(prop, DraftEnumProperty):
                properties[key] = prop.to_enum_property_def()
            elif isinstance(prop, DraftBooleanProperty):
                properties[key] = prop.to_boolean_property_def()
            elif isinstance(prop, DraftNumberProperty):
                properties[key] = prop.to_number_property_def()
            elif isinstance(prop, DraftTextProperty):
                properties[key] = prop.to_text_property_def()
        if not properties:
            raise ValueError("propertyEntries produced no valid properties")
        return StyleSpec(
            schemaVersion=2,
            properties=properties,
        )


def normalize_style_spec_dict(raw: dict[str, Any]) -> StyleSpec:
    """Validate and coerce a dict into StyleSpec v2."""
    return StyleSpec.model_validate(raw)


def rules_from_style_spec(spec: StyleSpec, *, max_len: int = 4000) -> str:
    """Sync rules text from compiled property defaults."""
    lines: list[str] = ["PROPERTIES (resolved):"]
    for key, prop in spec.properties.items():
        if isinstance(prop, EnumPropertyDef):
            instruction = prop.instructions.get(prop.default, "")
            lines.append(f"- {key}: {prop.default} → {instruction.strip()}")
        elif isinstance(prop, BooleanPropertyDef):
            flag = "true" if prop.default else "false"
            instruction = prop.instructions[flag]
            lines.append(f"- {key}: {prop.default} → {instruction.strip()}")
        elif isinstance(prop, NumberPropertyDef):
            filled = prop.instruction.replace("{{value}}", str(prop.default))
            lines.append(f"- {key}: {prop.default} → {filled.strip()}")
        elif isinstance(prop, TextPropertyDef):
            filled = prop.instruction.replace("{{value}}", prop.default)
            lines.append(f"- {key}: {prop.default} → {filled.strip()}")
    text = "\n".join(lines).strip()
    return text[:max_len]
