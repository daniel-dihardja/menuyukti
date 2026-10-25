"""ChatKit widgets for story confirmation and weekly Instagram schedule."""

from __future__ import annotations

import json
from typing import Any

from chatkit.actions import ActionConfig
from chatkit.widgets import Button, Card, Col, Text


def story_confirm_widget(*, message: str = "Ready to generate?") -> Card:
    return Card(
        children=[
            Col(
                children=[
                    Text(value=message, size="md"),
                    Button(
                        label="Generate",
                        onClickAction=ActionConfig(
                            type="story.generate",
                            payload={"action": "generate"},
                        ),
                        color="primary",
                    ),
                    Button(
                        label="Change",
                        onClickAction=ActionConfig(
                            type="story.change",
                            payload={"action": "change"},
                        ),
                        color="secondary",
                    ),
                ]
            )
        ]
    )


def weekly_schedule_widget(schedule_payload: str | dict[str, Any]) -> Card:
    if isinstance(schedule_payload, str):
        try:
            data = json.loads(schedule_payload)
        except json.JSONDecodeError:
            data = {"raw": schedule_payload}
    else:
        data = schedule_payload
    title = "Weekly Instagram schedule"
    if isinstance(data, dict):
        title = str(data.get("title") or data.get("weekLabel") or title)
    summary = json.dumps(data, ensure_ascii=False)[:800] if data else ""
    return Card(
        children=[
            Col(
                children=[
                    Text(value=title, size="lg", weight="semibold"),
                    Text(value=summary or "Schedule ready.", size="sm"),
                    Button(
                        label="Export ICS",
                        onClickAction=ActionConfig(
                            type="schedule.export_ics",
                            payload={"schedule": data},
                        ),
                        color="secondary",
                    ),
                ]
            )
        ]
    )
