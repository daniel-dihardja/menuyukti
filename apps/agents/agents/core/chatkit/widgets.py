"""ChatKit widgets for advisor generative UI (story, image, tool status)."""

from __future__ import annotations

from typing import Any, Literal

from chatkit.actions import ActionConfig
from chatkit.widgets import (
    Badge,
    Button,
    Caption,
    Card,
    Col,
    Form,
    Image,
    Input,
    Label,
    Row,
    Text,
    Title,
)

ToolStatusTone = Literal["ok", "error", "info"]

_COGS_LIST_DISPLAY_CAP = 40
_COGS_EDIT_FORM_CAP = 20


def story_confirm_widget(*, message: str = "Ready to generate?") -> Card:
    return Card(
        children=[
            Col(
                gap=3,
                children=[
                    Title(value="Story image", size="md"),
                    Text(value=message, size="md"),
                    Row(
                        gap=2,
                        children=[
                            Button(
                                label="Generate",
                                onClickAction=ActionConfig(
                                    type="story.generate",
                                    payload={"action": "generate"},
                                    handler="server",
                                ),
                                color="primary",
                            ),
                            Button(
                                label="Change",
                                onClickAction=ActionConfig(
                                    type="story.change",
                                    payload={"action": "change"},
                                    handler="server",
                                ),
                                color="secondary",
                            ),
                        ],
                    ),
                ],
            )
        ]
    )


def generated_image_widget(*, url: str, caption: str | None = None) -> Card:
    kids: list[Any] = [
        Title(value="Generated image", size="sm"),
        Image(src=url, alt=caption or "Generated Instagram image", fit="contain", height=320),
    ]
    if caption and caption.strip():
        kids.append(Caption(value=caption.strip()[:240]))
    return Card(children=[Col(gap=2, children=kids)])


def tool_status_widget(
    *,
    title: str,
    detail: str | None = None,
    tone: ToolStatusTone = "ok",
) -> Card:
    # info = in-flight / loading; keep distinct from completed checkmark
    prefix = {"ok": "✓", "error": "!", "info": "→"}.get(tone, "•")
    kids: list[Any] = [
        Text(value=f"{prefix} {title}", size="sm", weight="semibold"),
    ]
    if detail and detail.strip():
        kids.append(Caption(value=detail.strip()[:300]))
    return Card(children=[Col(gap=1, children=kids)])


def _cogs_run_caption(run_name: str | None) -> str | None:
    """Optional wrapping caption for a long report name (keep Title short)."""
    if not run_name or not run_name.strip():
        return None
    return f"Report: {run_name.strip()}"


def cogs_list_widget(
    items: list[dict[str, Any]],
    *,
    missing_count: int,
    total_count: int,
    run_name: str | None = None,
) -> Card:
    """Read-only Card listing menu COGS with missing badges."""
    summary = f"{total_count} items · {missing_count} missing"
    row_kids: list[Any] = [
        Title(value="Menu COGS", size="md"),
    ]
    run_caption = _cogs_run_caption(run_name)
    if run_caption is not None:
        row_kids.append(Caption(value=run_caption))
    row_kids.append(Caption(value=summary))
    display = items[:_COGS_LIST_DISPLAY_CAP]
    for row in display:
        menu = str(row.get("menu") or "").strip() or "(unnamed)"
        status = row.get("status")
        cogs_val = row.get("cogs")
        currency = row.get("currency")
        if status == "missing" or cogs_val is None:
            value_node: Any = Badge(label="Missing", color="warning")
        else:
            label = str(cogs_val)
            if isinstance(currency, str) and currency.strip():
                label = f"{label} {currency.strip()}"
            value_node = Text(value=label, size="sm")
        row_kids.append(
            Row(
                gap=2,
                children=[
                    Text(value=menu[:80], size="sm", weight="medium"),
                    value_node,
                ],
            )
        )
    overflow = total_count - len(display)
    if overflow > 0:
        row_kids.append(Caption(value=f"+{overflow} more in tool result"))
    # size=lg widens past the default ~half-column ChatKit cards.
    return Card(size="lg", children=[Col(gap=2, children=row_kids)])


def cogs_edit_form_widget(
    items: list[dict[str, Any]],
    *,
    run_name: str | None = None,
    truncated: bool = False,
) -> Card:
    """Card with number inputs for editing COGS (no persist yet)."""
    display = items[:_COGS_EDIT_FORM_CAP]
    menus = [str(row.get("menu") or "").strip() or f"item_{i}" for i, row in enumerate(display)]

    form_children: list[Any] = [
        Title(value="Edit menu COGS", size="md"),
    ]
    run_caption = _cogs_run_caption(run_name)
    if run_caption is not None:
        form_children.append(Caption(value=run_caption))
    form_children.append(
        Caption(
            value=(
                "Enter COGS amounts below. Saving from chat is not available yet — "
                "use Done when finished typing."
            )
        ),
    )
    if truncated:
        form_children.append(
            Caption(value=f"Showing first {len(display)} items only.")
        )

    for index, row in enumerate(display):
        menu = menus[index]
        field = f"cogs_{index}"
        cogs_val = row.get("cogs")
        default = "" if cogs_val is None else str(cogs_val)
        currency = row.get("currency")
        label = menu[:80]
        if isinstance(currency, str) and currency.strip():
            label = f"{label} ({currency.strip()})"
        form_children.append(Label(value=label, fieldName=field))
        form_children.append(
            Input(
                name=field,
                inputType="number",
                defaultValue=default,
                placeholder="COGS amount",
            )
        )

    form_children.append(
        Button(label="Done", submit=True, color="secondary"),
    )
    # Full-column Card so Form width="75%" resolves against the message panel.
    return Card(
        size="full",
        children=[
            Form(
                width="75%",
                onSubmitAction=ActionConfig(
                    type="cogs.edit_ack",
                    payload={"menus": menus},
                    handler="server",
                ),
                direction="col",
                gap=2,
                children=form_children,
            )
        ],
    )
