from tests.helpers.tone_contract import (
    EXPECTED_TONE_OUTPUTS,
    load_tone_core_input_fixture,
)


def test_tone_fixture_contains_required_core_input_sections() -> None:
    payload = load_tone_core_input_fixture()

    assert "matrix_items" in payload
    assert "heatmaps" in payload
    assert "distribution" in payload
    assert "sales_summary" in payload


def test_tone_expected_outputs_are_unique() -> None:
    assert len(EXPECTED_TONE_OUTPUTS) == len(set(EXPECTED_TONE_OUTPUTS))
