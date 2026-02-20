from __future__ import annotations

from pathlib import Path

from agent.pilot.prompt_tuning import (
    run_pilot_baseline,
    run_pilot_improvement_loop,
    write_selected_final_prompt,
    write_pilot_freeze_map,
    write_pilot_readiness_report,
)


def test_pilot_baseline_report_shape() -> None:
    report = run_pilot_baseline(reruns_per_candidate=3)
    assert report["mode"] == "baseline"
    assert report["agent_id"] == "marketer-strategist"
    assert report["dataset_version"] == "pilot-ms-caption-v1"
    assert report["scoring_spec_version"] == "pilot-ms-caption-scoring-v1"
    assert "per_case_scores" in report
    assert isinstance(report["per_case_scores"], list)


def test_pilot_loop_reaches_stop_condition() -> None:
    report = run_pilot_improvement_loop(max_iterations=5, reruns_per_candidate=3)
    assert report["agent_id"] == "marketer-strategist"
    assert isinstance(report["iterations"], list)
    assert len(report["iterations"]) >= 1
    assert report["stop_reason"] in {"stop_condition_met", "max_iterations_reached"}
    assert report["pass_fail"] is True
    assert isinstance(report["selected_candidate"], str)
    assert isinstance(report["iterations"][-1]["prompt_text"], str)


def test_pilot_freeze_map_and_readiness_report_outputs(tmp_path: Path) -> None:
    report = run_pilot_improvement_loop(max_iterations=5, reruns_per_candidate=3)
    freeze_path = write_pilot_freeze_map(report, freeze_map_path=tmp_path / "freeze.json")
    assert freeze_path is not None
    assert freeze_path.exists()

    readiness_path = write_pilot_readiness_report(report, output_path=tmp_path / "readiness.md")
    assert readiness_path.exists()
    text = readiness_path.read_text(encoding="utf-8")
    assert "Prompt Tuning Pilot Readiness Report" in text

    final_prompt_path = write_selected_final_prompt(report, output_path=tmp_path / "final-prompt.txt")
    assert final_prompt_path is not None
    assert final_prompt_path.exists()
    assert final_prompt_path.read_text(encoding="utf-8").strip() != ""
