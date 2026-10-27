"""ChatKit widgets for advisor generative UI (story, image, tool status)."""

from __future__ import annotations

from typing import Any, Literal

from chatkit.actions import ActionConfig
from chatkit.widgets import Button, Caption, Card, Col, Image, Row, Text, Title

ToolStatusTone = Literal["ok", "error", "info"]


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
