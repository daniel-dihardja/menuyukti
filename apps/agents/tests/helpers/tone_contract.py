from __future__ import annotations

from pathlib import Path
import json


EXPECTED_TONE_OUTPUTS = [
    "tone_profile",
    "language_guidelines",
    "caption_style",
    "hashtag_style",
    "content_dos_donts",
    "post_concepts",
    "cta_phrases",
    "emoji_guidelines",
]


def load_tone_core_input_fixture() -> dict:
    fixture_path = (
        Path(__file__).resolve().parents[1] / "fixtures" / "audience_core_input.json"
    )
    return json.loads(fixture_path.read_text())
