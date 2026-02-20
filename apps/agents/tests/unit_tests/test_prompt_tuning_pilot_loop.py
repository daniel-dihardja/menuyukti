from __future__ import annotations

import json
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


def test_pilot_loop_reaches_stop_condition(tmp_path: Path) -> None:
    report = run_pilot_improvement_loop(
        max_iterations=5,
        reruns_per_candidate=3,
        artifacts_base_dir=tmp_path / "pilot-iterations",
    )
    assert report["agent_id"] == "marketer-strategist"
    assert isinstance(report["iterations"], list)
    assert len(report["iterations"]) >= 1
    assert report["stop_reason"] in {"stop_condition_met", "max_iterations_reached"}
    assert report["pass_fail"] is True
    assert isinstance(report["selected_candidate"], str)
    assert isinstance(report["iterations"][-1]["prompt_text"], str)


def test_pilot_freeze_map_and_readiness_report_outputs(tmp_path: Path) -> None:
    report = run_pilot_improvement_loop(
        max_iterations=5,
        reruns_per_candidate=3,
        artifacts_base_dir=tmp_path / "pilot-iterations",
    )
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


def test_iteration_artifacts_written(tmp_path: Path) -> None:
    base_dir = tmp_path / "pilot-iterations"
    report = run_pilot_improvement_loop(
        max_iterations=2,
        reruns_per_candidate=1,
        artifacts_base_dir=base_dir,
    )

    iteration_dir = base_dir / report["run_id"] / "iter-01"
    assert iteration_dir.exists()

    output_data = json.loads((iteration_dir / "output.json").read_text(encoding="utf-8"))
    assert output_data["run_id"] == report["run_id"]
    assert output_data["iteration"] == 1
    assert "cases" in output_data

    score_data = json.loads((iteration_dir / "score.json").read_text(encoding="utf-8"))
    assert score_data["prompt_version"].startswith("pilot-candidate-")
    assert "dimension_scores" in score_data
    assert "failed_checks" in score_data
    assert isinstance(score_data["pass_fail"], bool)

    summary_data = json.loads((iteration_dir / "iteration-summary.json").read_text(encoding="utf-8"))
    assert summary_data["run_id"] == report["run_id"]
    assert summary_data["iteration"] == 1
    assert summary_data["next_action"] in {"improve", "stop"}
    assert summary_data["stop_reason"] in {"stop_condition_met", "below_threshold"}

    improver_input_path = iteration_dir / "improver-input.json"
    improver_output_path = iteration_dir / "improver-output.json"
    assert improver_input_path.exists()
    assert improver_output_path.exists()

    improver_input = json.loads(improver_input_path.read_text(encoding="utf-8"))
    assert improver_input["run_id"] == report["run_id"]
    assert improver_input["iteration"] == 1
    assert "constraints" in improver_input

    improver_output = json.loads(improver_output_path.read_text(encoding="utf-8"))
    assert "candidate_id" in improver_output
    assert improver_output["constraints_preserved"]
    assert summary_data["improver"]["candidate_id"] == improver_output["candidate_id"]
