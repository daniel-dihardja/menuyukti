from __future__ import annotations

import argparse
import json
from pathlib import Path

from agent.prompt_tuning import run_prompt_tuning_loop, write_prompt_freeze_map


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run per-agent isolated prompt tuning loop.")
    parser.add_argument("--mode", choices=["mock", "live"], default="mock")
    parser.add_argument("--agent", action="append", default=[])
    parser.add_argument(
        "--output",
        default="apps/agents/eval-artifacts/prompt-tuning-loop-latest.json",
        help="Path to write prompt tuning report JSON.",
    )
    parser.add_argument(
        "--write-freeze-map",
        action="store_true",
        help="Write approved prompt versions to PROMPT_VERSION_FREEZE_V1.json",
    )
    parser.add_argument(
        "--fail-on-unapproved",
        action="store_true",
        help="Exit non-zero when any targeted agent has no approved prompt version.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = run_prompt_tuning_loop(mode=args.mode, agents=args.agent)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    approved = report.get("approved_prompt_versions", {})
    targeted = [entry.get("agent_id") for entry in report.get("agents", [])]
    unapproved = [agent for agent in targeted if isinstance(agent, str) and agent not in approved]

    print(f"[prompt-tuning] report written: {output_path}")
    print(f"[prompt-tuning] targeted={len(targeted)} approved={len(approved)} unapproved={len(unapproved)}")

    if args.write_freeze_map:
        freeze_path = write_prompt_freeze_map(approved)
        print(f"[prompt-tuning] freeze map written: {freeze_path}")

    if args.fail_on_unapproved and unapproved:
        print(f"[prompt-tuning] unapproved agents: {', '.join(unapproved)}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
