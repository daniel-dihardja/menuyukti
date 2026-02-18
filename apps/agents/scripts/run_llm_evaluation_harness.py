from __future__ import annotations

import argparse
import json
from pathlib import Path

from agent.evaluation_harness import EvaluationHarnessRequest, run_evaluation_harness


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run agent LLM evaluation harness.")
    parser.add_argument("--mode", choices=["mock", "live"], default="mock")
    parser.add_argument("--agent", action="append", default=[])
    parser.add_argument("--fail-fast", action="store_true")
    parser.add_argument(
        "--output",
        default="apps/agents/eval-artifacts/llm-evaluation-latest.json",
        help="Path to write harness report JSON.",
    )
    parser.add_argument(
        "--fail-on-fail",
        action="store_true",
        help="Exit non-zero when any scenario fails.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    request = EvaluationHarnessRequest(
        mode=args.mode,
        agents=args.agent,
        fail_fast=args.fail_fast,
    )
    report = run_evaluation_harness(request)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[evaluation] report written: {output_path}")
    summary = report.get("summary", {})
    print(
        f"[evaluation] total={summary.get('total')} passed={summary.get('passed')} "
        f"failed={summary.get('failed')} pass_rate={summary.get('pass_rate')}"
    )
    if args.fail_on_fail and summary.get("failed", 0) > 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
