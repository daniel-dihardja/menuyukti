"""ChatKit widgets for advisor generative UI (story, schedule, image, tool status)."""

from __future__ import annotations

import json
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


def _parse_schedule(schedule_payload: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(schedule_payload, str):
        try:
            data = json.loads(schedule_payload)
        except json.JSONDecodeError:
            return {"raw": schedule_payload, "title": "Weekly Instagram schedule", "days": []}
        return data if isinstance(data, dict) else {"raw": schedule_payload, "days": []}
    return schedule_payload if isinstance(schedule_payload, dict) else {"days": []}


def _day_rows(data: dict[str, Any]) -> list[Any]:
    raw_days = data.get("days") or data.get("schedule") or data.get("slots") or []
    if isinstance(raw_days, dict):
        raw_days = list(raw_days.values())
    if not isinstance(raw_days, list):
        return []
    rows: list[Any] = []
    for item in raw_days[:14]:
        if not isinstance(item, dict):
            continue
        day = str(item.get("day") or item.get("weekday") or "").strip() or "—"
        time = str(item.get("time") or item.get("posting_time") or "—").strip()
        fmt = str(item.get("format") or item.get("type") or "post").strip()
        menus = str(
            item.get("menu_items") or item.get("menuItems") or item.get("menus") or "—"
        ).strip()
        caption = str(
            item.get("caption_angle") or item.get("caption") or item.get("angle") or ""
        ).strip()
        line = f"{day.title()} · {time} · {fmt}"
        detail = menus if not caption else f"{menus} — {caption}"
        rows.append(
            Col(
                gap=0,
                children=[
                    Text(value=line, size="sm", weight="semibold"),
                    Caption(value=detail[:200] if detail else "—"),
                ],
            )
        )
    return rows


def weekly_schedule_widget(schedule_payload: str | dict[str, Any]) -> Card:
    data = _parse_schedule(schedule_payload)
    title = str(data.get("title") or data.get("weekLabel") or "Weekly Instagram schedule")
    summary = str(data.get("summary") or data.get("description") or "").strip()
    day_children = _day_rows(data)
    if not day_children and data.get("raw"):
        day_children = [Text(value=str(data["raw"])[:600], size="sm")]
    if not day_children:
        day_children = [Text(value="Schedule ready.", size="sm")]

    children: list[Any] = [
        Title(value=title, size="md"),
    ]
    if summary:
        children.append(Caption(value=summary[:300]))
    children.extend(day_children)
    children.append(
        Row(
            gap=2,
            children=[
                Button(
                    label="Export ICS",
                    onClickAction=ActionConfig(
                        type="schedule.export_ics",
                        payload={"schedule": data},
                        handler="client",
                    ),
                    color="primary",
                ),
                Button(
                    label="Share",
                    onClickAction=ActionConfig(
                        type="schedule.share",
                        payload={"schedule": data},
                        handler="client",
                    ),
                    color="secondary",
                ),
            ],
        )
    )
    return Card(children=[Col(gap=3, children=children)])


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
    prefix = {"ok": "✓", "error": "!", "info": "i"}.get(tone, "•")
    kids: list[Any] = [
        Text(value=f"{prefix} {title}", size="sm", weight="semibold"),
    ]
    if detail and detail.strip():
        kids.append(Caption(value=detail.strip()[:300]))
    return Card(children=[Col(gap=1, children=kids)])
