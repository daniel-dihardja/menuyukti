from __future__ import annotations

import argparse
import json
from pathlib import Path

from agent.pilot.prompt_tuning import (
    run_pilot_baseline,
    run_pilot_improvement_loop,
    write_selected_final_prompt,
    write_pilot_freeze_map,
    write_pilot_readiness_report,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run prompt tuning pilot loop for marketer-strategist.")
    parser.add_argument("--mode", choices=["baseline", "loop"], default="loop")
    parser.add_argument("--max-iterations", type=int, default=5)
    parser.add_argument("--reruns-per-candidate", type=int, default=3)
    parser.add_argument(
        "--output",
        default="apps/agents/pilot/prompt-tuning/outputs/prompt-tuning-pilot-latest.json",
        help="Path to write run report JSON.",
    )
    parser.add_argument("--write-freeze-map", action="store_true")
    parser.add_argument("--write-readiness-report", action="store_true")
    parser.add_argument("--write-final-prompt", action="store_true")
    parser.add_argument("--fail-on-unapproved", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.mode == "baseline":
        report = run_pilot_baseline(reruns_per_candidate=args.reruns_per_candidate)
    else:
        report = run_pilot_improvement_loop(
            max_iterations=args.max_iterations,
            reruns_per_candidate=args.reruns_per_candidate,
        )

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[pilot] report written: {output}")

    if args.write_freeze_map and args.mode == "loop":
        freeze_path = write_pilot_freeze_map(report)
        if freeze_path is None:
            print("[pilot] no selected candidate, freeze map not written")
        else:
            print(f"[pilot] freeze map written: {freeze_path}")

    if args.write_readiness_report and args.mode == "loop":
        report_path = write_pilot_readiness_report(report)
        print(f"[pilot] readiness report written: {report_path}")

    if args.write_final_prompt and args.mode == "loop":
        prompt_path = write_selected_final_prompt(report)
        if prompt_path is None:
            print("[pilot] no selected candidate, final prompt not written")
        else:
            print(f"[pilot] final prompt written: {prompt_path}")

    if args.fail_on_unapproved and args.mode == "loop" and not report.get("pass_fail"):
        print("[pilot] no approved candidate selected")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
