from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Any
from uuid import uuid4


BASE_DIR = Path(__file__).resolve().parents[3]
PILOT_DIR = BASE_DIR / "pilot" / "prompt-tuning"
PILOT_FIXTURES_DIR = PILOT_DIR / "fixtures"
PILOT_PROMPTS_DIR = PILOT_DIR / "prompts"
PILOT_OUTPUTS_DIR = PILOT_DIR / "outputs"
PILOT_SPECS_DIR = PILOT_DIR / "specs"
PILOT_DATASET_PATH = PILOT_FIXTURES_DIR / "marketer-strategist-caption-dataset-v1.json"
PILOT_SCORING_SPEC_PATH = (
    PILOT_FIXTURES_DIR / "marketer-strategist-caption-scoring-spec-v1.json"
)
CODEX_SCORING_MATRIX_PATH = PILOT_SPECS_DIR / "codex-scoring-matrix-v1.json"
ITERATION_ARTIFACT_SCHEMA_PATH = PILOT_SPECS_DIR / "iteration-artifact-schema-v1.json"
PILOT_PROMPT_V1_PATH = PILOT_PROMPTS_DIR / "pilot-v1.txt"
PILOT_FREEZE_MAP_PATH = PILOT_OUTPUTS_DIR / "PILOT_PROMPT_VERSION_FREEZE_V1.json"
PILOT_FINAL_PROMPT_PATH = PILOT_OUTPUTS_DIR / "final-prompt.txt"
PILOT_READINESS_REPORT_PATH = PILOT_OUTPUTS_DIR / "readiness-report.md"

PILOT_VERSION = "ptl-pilot-v1"
PILOT_AGENT_ID = "marketer-strategist"

IMPROVER_CONSTRAINTS = [
    "Return strict JSON with keys caption, cta, hashtags.",
    "CTA must start with an action verb.",
    "Include 2-4 relevant hashtags that each begin with '#'.",
]
IMPROVER_FORBIDDEN_PHRASES = ["cheap", "fast-food"]


@dataclass(frozen=True)
class ImproverCandidate:
    candidate_id: str
    prompt_text: str
    rationale: str
    constraints_preserved: list[str]
    safety_notes: list[str] | None = None


class CodexImproverClient:
    """Simulated Codex improver that follows the pilot contract."""

    def generate_candidate(
        self, *, payload: dict[str, Any], iteration: int
    ) -> ImproverCandidate | None:
        prompt_text = payload.get("prompt_text")
        if not isinstance(prompt_text, str) or not prompt_text.strip():
            return None
        failed_dimensions = payload.get("failed_dimensions", [])
        instructions: list[str] = []
        if "menu_item_mention" in failed_dimensions:
            instructions.append("Mention the menu_item string exactly in the next caption.")
        if "cta_actionability" in failed_dimensions:
            instructions.append("Start the CTA with an action verb (Reserve/Order/Book).")
        if "premium_tone" in failed_dimensions:
            instructions.append("Use premium wording, no slang, concise style.")
        if "schema_validity" in failed_dimensions or "hashtag_quality" in failed_dimensions:
            instructions.append("Return JSON payload and include 2-4 hashtags that begin with '#'.")
        instructions.extend(IMPROVER_CONSTRAINTS)

        rationale = (
            " ".join(instructions[:2])
            if instructions
            else "Refined prompt to honor constraints."
        )
        candidate_id = f"v1-improved-{iteration:02d}"
        improved_prompt = f"{prompt_text.strip()}\n" + " ".join(instructions)
        return ImproverCandidate(
            candidate_id=candidate_id,
            prompt_text=improved_prompt,
            rationale=rationale,
            constraints_preserved=IMPROVER_CONSTRAINTS,
        )


def _check_improver_guardrails(
    candidate: ImproverCandidate | None,
) -> tuple[bool, list[str]]:
    if candidate is None:
        return False, ["improver_candidate_missing"]
    text = candidate.prompt_text.lower()
    reasons: list[str] = []
    for phrase in IMPROVER_FORBIDDEN_PHRASES:
        if phrase in text:
            reasons.append(f"forbidden phrase '{phrase}' detected")
    for constraint in IMPROVER_CONSTRAINTS:
        if constraint.lower() not in text:
            reasons.append(f"missing constraint '{constraint}'")
    return (len(reasons) == 0, reasons)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"invalid JSON object: {path}")
    return payload


def _write_json(path: Path, payload: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def get_iteration_paths(
    *, run_id: str, iteration: int, base_dir: Path | None = None
) -> dict[str, Path]:
    run_root = base_dir or PILOT_OUTPUTS_DIR / "runs"
    base = run_root / run_id / f"iter-{iteration:02d}"
    return {
        "base_dir": base,
        "output_path": base / "output.json",
        "score_path": base / "score.json",
        "summary_path": base / "iteration-summary.json",
    }


def load_codex_scoring_matrix() -> dict[str, Any]:
    matrix = _load_json(CODEX_SCORING_MATRIX_PATH)
    dims = matrix.get("dimensions")
    if not isinstance(dims, list):
        raise ValueError("codex scoring matrix: dimensions must be a list")
    if sum(int(item.get("weight", 0)) for item in dims if isinstance(item, dict)) != 100:
        raise ValueError("codex scoring matrix: dimension weights must sum to 100")
    return matrix


def load_iteration_artifact_schema() -> dict[str, Any]:
    schema = _load_json(ITERATION_ARTIFACT_SCHEMA_PATH)
    artifacts = schema.get("artifacts")
    if not isinstance(artifacts, dict):
        raise ValueError("iteration artifact schema: artifacts section missing")
    return schema


def validate_score_artifact(score_payload: dict[str, Any]) -> dict[str, Any]:
    matrix = load_codex_scoring_matrix()
    schema = load_iteration_artifact_schema()
    required = (
        schema.get("artifacts", {})
        .get("score.json", {})
        .get("required_fields", [])
    )
    if not isinstance(required, list):
        raise ValueError("iteration artifact schema: invalid score.json required_fields")
    missing = [field for field in required if field not in score_payload]
    if missing:
        raise ValueError(f"score.json missing required fields: {', '.join(missing)}")

    dimension_scores = score_payload.get("dimension_scores")
    if not isinstance(dimension_scores, dict):
        raise ValueError("score.json dimension_scores must be an object")

    expected_dims = {
        item["id"]
        for item in matrix.get("dimensions", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    missing_dims = [dim for dim in expected_dims if dim not in dimension_scores]
    if missing_dims:
        raise ValueError(f"score.json missing dimension scores: {', '.join(sorted(missing_dims))}")

    threshold = matrix.get("thresholds", {}).get("pass_score")
    payload_threshold = score_payload.get("threshold")
    if payload_threshold != threshold:
        raise ValueError("score.json threshold does not match scoring matrix")

    total_score = float(score_payload.get("total_score", 0.0))
    pass_fail = bool(score_payload.get("pass_fail"))
    if pass_fail and total_score < float(threshold):
        raise ValueError("score.json pass_fail=true but total_score below threshold")
    return score_payload


def _collect_failed_checks(case_outputs: list[dict[str, Any]]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for entry in case_outputs:
        scores = entry.get("scores", {})
        for check in scores.get("critical_failures", []):
            if check not in seen:
                seen.add(check)
                ordered.append(check)
    return ordered


def _determine_failed_dimensions(
    matrix: dict[str, Any], dimension_scores: dict[str, Any]
) -> list[str]:
    failed: list[str] = []
    for item in matrix.get("dimensions", []):
        dim_id = item.get("id")
        weight = float(item.get("weight", 0))
        if not dim_id:
            continue
        score = float(dimension_scores.get(dim_id, 0.0))
        if score < weight:
            failed.append(dim_id)
    return failed


def _build_output_artifact_payload(
    *,
    loop_run_id: str,
    iteration: int,
    prompt_version: str,
    prompt_text: str,
    case_outputs: list[dict[str, Any]],
) -> dict[str, Any]:
    cases: list[dict[str, Any]] = []
    for entry in case_outputs:
        cases.append(
            {
                "case_id": entry.get("case_id"),
                "input": entry.get("input"),
                "outputs": entry.get("outputs", []),
                "selected_output": entry.get("selected_output"),
                "scores": entry.get("scores", {}),
            }
        )
    return {
        "run_id": loop_run_id,
        "iteration": iteration,
        "prompt_version": prompt_version,
        "prompt_text": prompt_text,
        "agent_id": PILOT_AGENT_ID,
        "cases": cases,
    }


def _build_score_artifact_payload(
    *,
    loop_run_id: str,
    iteration: int,
    prompt_version: str,
    evaluation: dict[str, Any],
    baseline_delta: float,
    stop_reason: str,
    matrix: dict[str, Any],
) -> dict[str, Any]:
    case_outputs = evaluation.get("case_outputs") or []
    failed_checks = _collect_failed_checks(case_outputs)
    dimension_scores = evaluation.get("average_dimensions", {})
    thresholds = matrix.get("thresholds", {})
    return {
        "run_id": loop_run_id,
        "iteration": iteration,
        "prompt_version": prompt_version,
        "scoring_matrix_version": matrix.get("scoring_matrix_version"),
        "threshold": thresholds.get("pass_score"),
        "total_score": evaluation.get("total_score"),
        "pass_fail": evaluation.get("pass_fail"),
        "dimension_scores": dimension_scores,
        "failed_checks": failed_checks,
        "baseline_delta": baseline_delta,
        "stop_reason": stop_reason,
    }


def _build_iteration_summary_payload(
    *,
    loop_run_id: str,
    iteration: int,
    prompt_version: str,
    evaluation: dict[str, Any],
    baseline_delta: float,
    stop_reason: str,
    next_action: str,
    matrix: dict[str, Any],
    paths: dict[str, Path],
    improver_output: dict[str, Any] | None = None,
    guardrail_reasons: list[str] | None = None,
) -> dict[str, Any]:
    case_outputs = evaluation.get("case_outputs") or []
    failed_checks = _collect_failed_checks(case_outputs)
    failed_dimensions = _determine_failed_dimensions(
        matrix, evaluation.get("average_dimensions", {})
    )
    summary = {
        "run_id": loop_run_id,
        "iteration": iteration,
        "prompt_version": prompt_version,
        "output_path": str(paths["output_path"]),
        "score_path": str(paths["score_path"]),
        "total_score": evaluation.get("total_score"),
        "pass_fail": evaluation.get("pass_fail"),
        "baseline_delta": baseline_delta,
        "stop_reason": stop_reason,
        "next_action": next_action,
        "failed_dimensions": failed_dimensions,
        "failed_checks": failed_checks,
        "improver": {
            "failed_dimensions": failed_dimensions,
            "failed_checks": failed_checks,
            "baseline_delta": baseline_delta,
        },
    }
    if improver_output:
        summary["improver"].update(
            {
                "candidate_id": improver_output.get("candidate_id"),
                "prompt_text": improver_output.get("prompt_text"),
                "rationale": improver_output.get("rationale"),
                "constraints_preserved": improver_output.get("constraints_preserved", []),
                "safety_notes": improver_output.get("safety_notes", []),
                "guardrail_reasons": guardrail_reasons or [],
            }
        )
    else:
        summary["improver"]["guardrail_reasons"] = guardrail_reasons or []
    return summary


def _write_iteration_artifacts(
    *,
    loop_run_id: str,
    iteration: int,
    prompt_version: str,
    prompt_text: str,
    evaluation: dict[str, Any],
    baseline_delta: float,
    stop_reason: str,
    next_action: str,
    matrix: dict[str, Any],
    paths: dict[str, Path],
    improver_input: dict[str, Any] | None = None,
    improver_output: dict[str, Any] | None = None,
    guardrail_reasons: list[str] | None = None,
) -> None:
    case_outputs = evaluation.get("case_outputs") or []
    output_payload = _build_output_artifact_payload(
        loop_run_id=loop_run_id,
        iteration=iteration,
        prompt_version=prompt_version,
        prompt_text=prompt_text,
        case_outputs=case_outputs,
    )
    _write_json(paths["output_path"], output_payload)

    score_payload = _build_score_artifact_payload(
        loop_run_id=loop_run_id,
        iteration=iteration,
        prompt_version=prompt_version,
        evaluation=evaluation,
        baseline_delta=baseline_delta,
        stop_reason=stop_reason,
        matrix=matrix,
    )
    _write_json(paths["score_path"], score_payload)

    summary_payload = _build_iteration_summary_payload(
        loop_run_id=loop_run_id,
        iteration=iteration,
        prompt_version=prompt_version,
        evaluation=evaluation,
        baseline_delta=baseline_delta,
        stop_reason=stop_reason,
        next_action=next_action,
        matrix=matrix,
        paths=paths,
        improver_output=improver_output,
        guardrail_reasons=guardrail_reasons,
    )
    _write_json(paths["summary_path"], summary_payload)

    if improver_input:
        _write_json(paths["improver_input_path"], improver_input)
    if improver_output:
        _write_json(paths["improver_output_path"], improver_output)


def _build_improver_input_payload(
    *,
    loop_run_id: str,
    iteration: int,
    prompt_version: str,
    prompt_text: str,
    evaluation: dict[str, Any],
    baseline_delta: float,
    stop_reason: str,
    matrix: dict[str, Any],
    candidate_history: list[str],
) -> dict[str, Any]:
    case_inputs = []
    for case in evaluation.get("case_outputs") or []:
        case_inputs.append(
            {
                "case_id": case.get("case_id"),
                "input": case.get("input"),
                "selected_output": case.get("selected_output"),
                "scores": case.get("scores"),
            }
        )
    return {
        "run_id": loop_run_id,
        "iteration": iteration,
        "prompt_version": prompt_version,
        "prompt_text": prompt_text,
        "dataset_version": evaluation.get("dataset_version"),
        "scoring_spec_version": evaluation.get("scoring_spec_version"),
        "model_id": evaluation.get("model_id"),
        "provider": evaluation.get("provider"),
        "total_score": evaluation.get("total_score"),
        "baseline_delta": baseline_delta,
        "pass_fail": evaluation.get("pass_fail"),
        "failed_dimensions": _determine_failed_dimensions(
            matrix, evaluation.get("average_dimensions", {})
        ),
        "failed_checks": _collect_failed_checks(evaluation.get("case_outputs") or []),
        "dimension_scores": evaluation.get("average_dimensions"),
        "case_inputs": case_inputs,
        "constraints": IMPROVER_CONSTRAINTS,
        "stop_reason": stop_reason,
        "candidate_history": list(candidate_history),
    }


def _serialize_improver_candidate(candidate: ImproverCandidate) -> dict[str, Any]:
    return {
        "candidate_id": candidate.candidate_id,
        "prompt_text": candidate.prompt_text,
        "rationale": candidate.rationale,
        "constraints_preserved": candidate.constraints_preserved,
        "safety_notes": candidate.safety_notes or [],
    }


def _validate_candidate(candidate: ImproverCandidate | None) -> bool:
    if candidate is None:
        return False
    if not candidate.prompt_text.strip():
        return False
    if not candidate.constraints_preserved:
        return False
    return True


def _normalize_menu_hashtag(menu_item: str) -> str:
    normalized = "".join(ch for ch in menu_item if ch.isalnum())
    return f"#{normalized}" if normalized else "#MenuPick"


def _invoke_mock_llm(prompt_text: str, case_input: dict[str, Any]) -> Any:
    prompt = prompt_text.lower()
    enforce_json = "json" in prompt and "caption" in prompt and "hashtags" in prompt
    if not enforce_json:
        return "caption=Try our special today"

    menu_item = str(case_input.get("menu_item", "")).strip()
    restaurant_name = str(case_input.get("restaurant_name", "")).strip()
    mention_exact = ("exact menu_item" in prompt) or ("exact menu item" in prompt)
    premium_tone = "premium wording" in prompt
    action_verb_cta = "action verb" in prompt
    hashtag_range = ("2-4 hashtags" in prompt) or ("2 to 4 hashtags" in prompt)

    if mention_exact:
        caption = f"Elevate tonight with {menu_item} at {restaurant_name}."
    else:
        caption = f"Elevate tonight with our chef special at {restaurant_name}."

    if premium_tone:
        caption = caption.replace("Elevate", "Experience")

    cta = "Order now for tonight's seating." if action_verb_cta else "Try it soon."
    hashtags = (
        ["#foodie"]
        if not hashtag_range
        else ["#PremiumDining", _normalize_menu_hashtag(menu_item), "#RestaurantFinds"]
    )

    return {
        "caption": caption,
        "cta": cta,
        "hashtags": hashtags,
    }


def _score_output(expected: dict[str, Any], output: Any) -> dict[str, Any]:
    critical_failures: list[str] = []
    dimensions: dict[str, float] = {
        "schema_validity": 0.0,
        "menu_item_mention": 0.0,
        "premium_tone": 0.0,
        "cta_actionability": 0.0,
        "hashtag_quality": 0.0,
    }

    if not isinstance(output, dict):
        critical_failures.append("invalid_json")
    else:
        required = ("caption", "cta", "hashtags")
        missing = [field for field in required if field not in output]
        if missing:
            critical_failures.append("missing_required_field")
        else:
            dimensions["schema_validity"] = 20.0

    if isinstance(output, dict):
        caption = str(output.get("caption", ""))
        cta = str(output.get("cta", ""))
        hashtags = output.get("hashtags")
        menu_item = str(expected.get("menu_item", ""))

        if menu_item and menu_item in caption:
            dimensions["menu_item_mention"] = 25.0

        premium_markers = ("experience", "elevate", "crafted", "signature", "chef")
        if any(marker in caption.lower() for marker in premium_markers):
            dimensions["premium_tone"] = 20.0
        elif caption.strip():
            dimensions["premium_tone"] = 8.0

        action_verbs = ("order", "reserve", "book", "discover", "enjoy")
        cta_lower = cta.lower().strip()
        if cta_lower and any(cta_lower.startswith(verb) for verb in action_verbs):
            dimensions["cta_actionability"] = 20.0
        elif cta_lower:
            dimensions["cta_actionability"] = 6.0

        if isinstance(hashtags, list):
            valid_count = len(
                [
                    item
                    for item in hashtags
                    if isinstance(item, str) and item.startswith("#")
                ]
            )
            if 2 <= valid_count <= 4:
                dimensions["hashtag_quality"] = 15.0
            elif valid_count > 0:
                dimensions["hashtag_quality"] = 5.0

    total_score = round(sum(dimensions.values()), 3)
    pass_fail = total_score >= 80.0 and not critical_failures
    return {
        "dimensions": dimensions,
        "critical_failures": critical_failures,
        "total_score": total_score,
        "pass_fail": pass_fail,
    }


@dataclass(frozen=True)
class PilotEvaluation:
    prompt_version: str
    prompt_text: str
    dataset_version: str
    scoring_spec_version: str
    model_id: str
    provider: str
    reruns_per_candidate: int


def evaluate_prompt_against_pilot(
    *,
    prompt_version: str,
    prompt_text: str,
    model_id: str = "mock-prompt-tuning-pilot-v1",
    provider: str = "mock",
    reruns_per_candidate: int = 3,
) -> dict[str, Any]:
    dataset = _load_json(PILOT_DATASET_PATH)
    scoring_spec = _load_json(PILOT_SCORING_SPEC_PATH)
    cases = dataset.get("cases", [])
    if not isinstance(cases, list):
        raise ValueError("pilot dataset cases must be a list")

    per_case_scores: list[dict[str, Any]] = []
    case_outputs: list[dict[str, Any]] = []
    aggregate_dimensions = {
        "schema_validity": [],
        "menu_item_mention": [],
        "premium_tone": [],
        "cta_actionability": [],
        "hashtag_quality": [],
    }
    totals: list[float] = []

    for case in cases:
        if not isinstance(case, dict):
            continue
        case_input = case.get("input", {})
        run_scores: list[dict[str, Any]] = []
        run_totals: list[float] = []
        run_outputs: list[Any] = []
        for _ in range(reruns_per_candidate):
            output = _invoke_mock_llm(
                prompt_text, case_input if isinstance(case_input, dict) else {}
            )
            scored = _score_output(
                case_input if isinstance(case_input, dict) else {}, output
            )
            scored_with_output = {**scored, "output": output}
            run_scores.append(scored_with_output)
            run_totals.append(float(scored["total_score"]))
            run_outputs.append(output)
        chosen_total = median(run_totals) if run_totals else 0.0
        chosen = (
            min(
                run_scores,
                key=lambda row: abs(float(row["total_score"]) - chosen_total),
            )
            if run_scores
            else {
                "dimensions": {key: 0.0 for key in aggregate_dimensions},
                "critical_failures": ["no_run_scores"],
                "total_score": 0.0,
                "pass_fail": False,
                "output": None,
            }
        )
        dimensions = chosen["dimensions"]
        for key in aggregate_dimensions:
            aggregate_dimensions[key].append(float(dimensions[key]))
        totals.append(float(chosen["total_score"]))
        case_score = {
            "case_id": case.get("case_id"),
            "dimensions": dimensions,
            "critical_failures": chosen["critical_failures"],
            "total_score": chosen["total_score"],
            "pass_fail": chosen["pass_fail"],
        }
        per_case_scores.append(case_score)
        case_outputs.append(
            {
                "case_id": case.get("case_id"),
                "input": case_input,
                "outputs": run_outputs,
                "selected_output": chosen.get("output"),
                "scores": case_score,
            }
        )

    avg_dimensions = {
        key: round((sum(values) / len(values)) if values else 0.0, 3)
        for key, values in aggregate_dimensions.items()
    }
    total_score = round((sum(totals) / len(totals)) if totals else 0.0, 3)
    critical_fail_count = sum(
        1 for case in per_case_scores if case["critical_failures"]
    )
    pass_fail = (
        total_score >= float(scoring_spec["thresholds"]["pass_score"])
        and critical_fail_count == 0
    )

    return {
        "run_id": f"pilot_{uuid4().hex[:16]}",
        "run_timestamp": _utc_now(),
        "pilot_version": PILOT_VERSION,
        "agent_id": PILOT_AGENT_ID,
        "prompt_version": prompt_version,
        "dataset_version": dataset["dataset_version"],
        "scoring_spec_version": scoring_spec["scoring_spec_version"],
        "model_id": model_id,
        "provider": provider,
        "per_case_scores": per_case_scores,
        "case_outputs": case_outputs,
        "average_dimensions": avg_dimensions,
        "total_score": total_score,
        "pass_fail": pass_fail,
        "critical_fail_count": critical_fail_count,
        "reruns_per_candidate": reruns_per_candidate,
    }


def run_pilot_baseline(*, reruns_per_candidate: int = 3) -> dict[str, Any]:
    prompt_text = PILOT_PROMPT_V1_PATH.read_text(encoding="utf-8")
    report = evaluate_prompt_against_pilot(
        prompt_version="pilot-v1",
        prompt_text=prompt_text,
        reruns_per_candidate=reruns_per_candidate,
    )
    report["mode"] = "baseline"
    report["stop_reason"] = "baseline_only"
    report["baseline_delta"] = 0.0
    report["selected_candidate"] = "pilot-v1"
    return report


def _improve_prompt_text(prompt_text: str, latest_eval: dict[str, Any]) -> str:
    improved = prompt_text
    avg = latest_eval.get("average_dimensions", {})

    if (
        float(avg.get("schema_validity", 0.0)) < 20.0
        and "Return strict JSON with keys caption, cta, hashtags." not in improved
    ):
        improved += "\nReturn strict JSON with keys caption, cta, hashtags."
    if (
        float(avg.get("menu_item_mention", 0.0)) < 25.0
        and "Use the exact menu_item string in caption." not in improved
    ):
        improved += "\nUse the exact menu_item string in caption."
    if (
        float(avg.get("premium_tone", 0.0)) < 20.0
        and "Use premium wording, no slang, concise style." not in improved
    ):
        improved += "\nUse premium wording, no slang, concise style."
    if (
        float(avg.get("cta_actionability", 0.0)) < 20.0
        and "CTA must start with an action verb." not in improved
    ):
        improved += "\nCTA must start with an action verb."
    if (
        float(avg.get("hashtag_quality", 0.0)) < 15.0
        and "Include 2-4 relevant hashtags." not in improved
    ):
        improved += "\nInclude 2-4 relevant hashtags."
    return improved


def run_pilot_improvement_loop(
    *,
    max_iterations: int = 5,
    reruns_per_candidate: int = 3,
    artifacts_base_dir: Path | None = None,
    improver_client: CodexImproverClient | None = None,
) -> dict[str, Any]:
    artifacts_root = artifacts_base_dir or PILOT_OUTPUTS_DIR / "runs"
    scoring_matrix = load_codex_scoring_matrix()
    loop_run_id = f"pilot_loop_{uuid4().hex[:16]}"
    baseline = run_pilot_baseline(reruns_per_candidate=reruns_per_candidate)
    baseline_total = float(baseline["total_score"])
    baseline_critical = baseline["average_dimensions"]

    current_prompt = PILOT_PROMPT_V1_PATH.read_text(encoding="utf-8")
    iterations: list[dict[str, Any]] = []
    selected_candidate = None
    stop_reason = "max_iterations_reached"
    candidate_history: list[str] = []
    improver_client = improver_client or CodexImproverClient()

    for iteration in range(1, max_iterations + 1):
        prompt_used = current_prompt
        prompt_version = f"pilot-candidate-{iteration:02d}"
        evaluation = evaluate_prompt_against_pilot(
            prompt_version=prompt_version,
            prompt_text=current_prompt,
            reruns_per_candidate=reruns_per_candidate,
        )
        baseline_delta = round(float(evaluation["total_score"]) - baseline_total, 3)
        critical_dimensions = (
            "schema_validity",
            "menu_item_mention",
            "hashtag_quality",
        )
        regression_guard = all(
            float(evaluation["average_dimensions"].get(key, 0.0))
            >= float(baseline_critical.get(key, 0.0))
            for key in critical_dimensions
        )
        threshold_met = bool(evaluation["pass_fail"])
        min_delta_met = baseline_delta >= 8.0
        stop_condition = threshold_met and min_delta_met and regression_guard

        iteration_stop_reason = "stop_condition_met" if stop_condition else "below_threshold"
        next_action = "stop" if stop_condition else "improve"
        failed_checks = _collect_failed_checks(evaluation.get("case_outputs") or [])
        failed_dimensions = _determine_failed_dimensions(
            scoring_matrix, evaluation.get("average_dimensions", {})
        )

        improver_input_payload = None
        improver_output_payload = None
        candidate = None
        guardrail_reasons: list[str] = []

        if not stop_condition:
            improver_input_payload = _build_improver_input_payload(
                loop_run_id=loop_run_id,
                iteration=iteration,
                prompt_version=prompt_version,
                prompt_text=prompt_used,
                evaluation=evaluation,
                baseline_delta=baseline_delta,
                stop_reason=iteration_stop_reason,
                matrix=scoring_matrix,
                candidate_history=candidate_history,
            )
            candidate = improver_client.generate_candidate(
                payload=improver_input_payload, iteration=iteration
            )
            guardrail_ok, guardrail_reasons = _check_improver_guardrails(candidate)
            if _validate_candidate(candidate) and guardrail_ok:
                current_prompt = candidate.prompt_text
                candidate_history.append(candidate.candidate_id)
                improver_output_payload = _serialize_improver_candidate(candidate)
            else:
                next_action = "improver_failed"
                failure_reasons = guardrail_reasons or ["codex_improver_invalid"]
                improver_output_payload = {
                    "candidate_id": None,
                    "prompt_text": None,
                    "rationale": None,
                    "constraints_preserved": [],
                    "safety_notes": failure_reasons,
                }
                guardrail_reasons = failure_reasons
        else:
            guardrail_reasons = []
        iteration_row = {
            **evaluation,
            "prompt_text": prompt_used,
            "baseline_delta": baseline_delta,
            "regression_guard": regression_guard,
            "threshold_met": threshold_met,
            "min_delta_met": min_delta_met,
            "stop_condition": stop_condition,
            "stop_reason": iteration_stop_reason,
            "next_action": next_action,
            "failed_checks": failed_checks,
            "failed_dimensions": failed_dimensions,
            "improver_candidate_id": candidate.candidate_id if candidate else None,
            "improver_prompt_text": candidate.prompt_text if candidate else None,
            "improver_rationale": candidate.rationale if candidate else None,
            "improver_constraints_preserved": candidate.constraints_preserved
            if candidate
            else [],
            "improver_failure_reasons": guardrail_reasons,
        }

        iteration_paths = get_iteration_paths(
            run_id=loop_run_id, iteration=iteration, base_dir=artifacts_root
        )
        _write_iteration_artifacts(
            loop_run_id=loop_run_id,
            iteration=iteration,
            prompt_version=prompt_version,
            prompt_text=prompt_used,
            evaluation=evaluation,
            baseline_delta=baseline_delta,
            stop_reason=iteration_stop_reason,
            next_action=next_action,
            matrix=scoring_matrix,
            paths=iteration_paths,
            improver_input=improver_input_payload,
            improver_output=improver_output_payload,
            guardrail_reasons=guardrail_reasons,
        )

        iterations.append(iteration_row)

        if stop_condition:
            selected_candidate = prompt_version
            stop_reason = "stop_condition_met"
            break
        current_prompt = _improve_prompt_text(current_prompt, evaluation)

    return {
        "run_id": loop_run_id,
        "run_timestamp": _utc_now(),
        "pilot_version": PILOT_VERSION,
        "agent_id": PILOT_AGENT_ID,
        "dataset_version": baseline["dataset_version"],
        "scoring_spec_version": baseline["scoring_spec_version"],
        "model_id": baseline["model_id"],
        "provider": baseline["provider"],
        "baseline": baseline,
        "iterations": iterations,
        "max_iterations": max_iterations,
        "selected_candidate": selected_candidate,
        "pass_fail": selected_candidate is not None,
        "stop_reason": stop_reason,
    }


def write_pilot_freeze_map(
    loop_report: dict[str, Any], freeze_map_path: Path = PILOT_FREEZE_MAP_PATH
) -> Path | None:
    selected = loop_report.get("selected_candidate")
    if not isinstance(selected, str) or not selected:
        return None
    freeze_map_path.parent.mkdir(parents=True, exist_ok=True)
    existing: dict[str, Any] = {}
    if freeze_map_path.exists():
        loaded = _load_json(freeze_map_path)
        if isinstance(loaded, dict):
            existing = loaded
    existing[PILOT_AGENT_ID] = selected
    freeze_map_path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    return freeze_map_path


def write_pilot_readiness_report(
    loop_report: dict[str, Any],
    output_path: Path = PILOT_READINESS_REPORT_PATH,
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    selected = loop_report.get("selected_candidate")
    stop_reason = loop_report.get("stop_reason")
    passed = bool(loop_report.get("pass_fail"))
    baseline_total = float(loop_report.get("baseline", {}).get("total_score", 0.0))
    final_total = float(
        loop_report.get("iterations", [{}])[-1].get("total_score", baseline_total)
    )
    delta = round(final_total - baseline_total, 3)

    content = [
        "# Prompt Tuning Pilot Readiness Report",
        "",
        f"- Run ID: `{loop_report.get('run_id')}`",
        f"- Agent: `{loop_report.get('agent_id')}`",
        f"- Dataset Version: `{loop_report.get('dataset_version')}`",
        f"- Scoring Spec Version: `{loop_report.get('scoring_spec_version')}`",
        f"- Stop Reason: `{stop_reason}`",
        f"- Selected Candidate: `{selected}`",
        f"- Baseline Score: `{baseline_total}`",
        f"- Final Score: `{final_total}`",
        f"- Delta: `{delta}`",
        f"- Pass: `{passed}`",
        "",
        "## Scale Readiness Checklist",
        f"- [x] Mocked-fixture-only data policy enforced.",
        f"- [{'x' if passed else ' '}] Pass threshold achieved with no critical failures.",
        f"- [{'x' if passed and delta >= 8.0 else ' '}] Minimum baseline improvement (+8) achieved.",
        f"- [{'x' if passed else ' '}] Candidate prompt selected and ready to freeze.",
    ]
    output_path.write_text("\n".join(content) + "\n", encoding="utf-8")
    return output_path


def write_selected_final_prompt(
    loop_report: dict[str, Any],
    output_path: Path = PILOT_FINAL_PROMPT_PATH,
) -> Path | None:
    iterations = loop_report.get("iterations")
    selected = loop_report.get("selected_candidate")
    if not isinstance(iterations, list) or not isinstance(selected, str):
        return None

    selected_row = next(
        (
            item
            for item in iterations
            if isinstance(item, dict) and item.get("prompt_version") == selected
        ),
        None,
    )
    if not isinstance(selected_row, dict):
        return None

    prompt_text = selected_row.get("prompt_text")
    if not isinstance(prompt_text, str) or not prompt_text.strip():
        return None

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(prompt_text.strip() + "\n", encoding="utf-8")
    return output_path
