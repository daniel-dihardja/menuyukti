"""Unit tests for ChatKit tag enrichment."""

from agents_app.agents.core.chatkit.tags import (
    describe_tag_for_model,
    enrich_user_text_with_tags,
    referenced_media_names_from_content,
    referenced_visualization_id_from_content,
)


class _Text:
    type = "input_text"

    def __init__(self, text: str) -> None:
        self.text = text


class _Tag:
    type = "input_tag"

    def __init__(self, *, id: str, text: str, data: dict) -> None:
        self.id = id
        self.text = text
        self.data = data


def test_describe_visualization_tag() -> None:
    out = describe_tag_for_model(
        "viz:menu_item_heatmap",
        "Menu item heatmap",
        {"kind": "visualization", "visualizationId": "menu_item_heatmap"},
    )
    assert "VISUALIZATION_TAG" in out
    assert "menu_item_heatmap" in out


def test_enrich_and_extract_refs() -> None:
    content = [
        _Text("Please use this chart"),
        _Tag(
            id="viz:menu_item_heatmap",
            text="Menu item heatmap",
            data={"kind": "visualization", "visualizationId": "menu_item_heatmap"},
        ),
        _Tag(
            id="media:photo.jpg",
            text="photo.jpg",
            data={"kind": "media", "name": "photo.jpg"},
        ),
    ]
    text = enrich_user_text_with_tags(content)  # type: ignore[arg-type]
    assert "Please use this chart" in text
    assert "VISUALIZATION_TAG" in text
    assert "MEDIA_TAG" in text
    assert referenced_visualization_id_from_content(content) == "menu_item_heatmap"  # type: ignore[arg-type]
    assert referenced_media_names_from_content(content) == ["photo.jpg"]  # type: ignore[arg-type]
