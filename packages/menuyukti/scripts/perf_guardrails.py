from __future__ import annotations

import argparse
import json
import statistics
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import pandas as pd

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    calculate_menu_engineering_matrix,
)
from menuyukti.core.analytics.calculate_sales_analytics import calculate_sales_analytics

SCRIPT_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = SCRIPT_DIR.parent
BASELINE_PATH = PACKAGE_ROOT / "perf" / "baseline_v1.json"
FIXTURES_DIR = PACKAGE_ROOT / "tests" / "fixtures" / "analytics"


@dataclass(frozen=True)
class BenchmarkResult:
    name: str
    median_ms: float
    iterations: int
    rows: int
    max_ratio: float


def evaluate_regression(
    *, baseline_ms: float, measured_ms: float, max_ratio: float
) -> bool:
    """Return True when measured runtime breaches allowed regression ratio."""
    allowed_ms = baseline_ms * max_ratio
    return measured_ms > allowed_ms


def _load_rows(name: str) -> list[dict[str, object]]:
    return json.loads((FIXTURES_DIR / name).read_text())


def _benchmark_case(
    *,
    name: str,
    fn: Callable[[pd.DataFrame], object],
    data: pd.DataFrame,
    iterations: int,
    max_ratio: float,
) -> BenchmarkResult:
    timings_ms: list[float] = []
    # Warm-up execution to reduce one-time initialization noise.
    fn(data.copy())
    for _ in range(iterations):
        start = time.perf_counter()
        fn(data.copy())
        elapsed_ms = (time.perf_counter() - start) * 1000
        timings_ms.append(elapsed_ms)
    return BenchmarkResult(
        name=name,
        median_ms=round(statistics.median(timings_ms), 3),
        iterations=iterations,
        rows=int(data.shape[0]),
        max_ratio=max_ratio,
    )


def run_benchmarks() -> list[BenchmarkResult]:
    sales_rows = _load_rows("sales_rows.json")
    matrix_rows = _load_rows("matrix_rows.json")

    # Representative volumes for local guardrails:
    # large enough to surface regressions, small enough for CI/dev speed.
    sales_df = pd.DataFrame(sales_rows * 2000)
    matrix_df = pd.DataFrame(matrix_rows * 4000)

    return [
        _benchmark_case(
            name="calculate_sales_analytics",
            fn=calculate_sales_analytics,
            data=sales_df,
            iterations=7,
            max_ratio=4.0,
        ),
        _benchmark_case(
            name="calculate_menu_engineering_matrix",
            fn=calculate_menu_engineering_matrix,
            data=matrix_df,
            iterations=7,
            max_ratio=4.0,
        ),
    ]


def _load_baseline() -> dict[str, dict[str, float]]:
    payload = json.loads(BASELINE_PATH.read_text())
    return {item["name"]: item for item in payload["cases"]}


def _write_report(results: list[BenchmarkResult]) -> None:
    payload = {
        "version": "v1",
        "generated_at_epoch": int(time.time()),
        "cases": [
            {
                "name": result.name,
                "median_ms": result.median_ms,
                "iterations": result.iterations,
                "rows": result.rows,
                "max_ratio": result.max_ratio,
            }
            for result in results
        ],
    }
    BASELINE_PATH.parent.mkdir(parents=True, exist_ok=True)
    BASELINE_PATH.write_text(json.dumps(payload, indent=2) + "\n")


def _check_against_baseline(results: list[BenchmarkResult]) -> int:
    baseline = _load_baseline()
    failures: list[str] = []

    for result in results:
        if result.name not in baseline:
            failures.append(f"Missing baseline case: {result.name}")
            continue
        baseline_case = baseline[result.name]
        baseline_ms = float(baseline_case["median_ms"])
        max_ratio = float(baseline_case.get("max_ratio", result.max_ratio))
        regressed = evaluate_regression(
            baseline_ms=baseline_ms,
            measured_ms=result.median_ms,
            max_ratio=max_ratio,
        )
        status = "REGRESSION" if regressed else "OK"
        print(
            f"[perf] {status} {result.name}: "
            f"measured={result.median_ms:.3f}ms baseline={baseline_ms:.3f}ms ratio_limit={max_ratio:.2f}x"
        )
        if regressed:
            failures.append(result.name)

    if failures:
        print("[perf] Failures:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Menuyukti performance baseline guardrails"
    )
    parser.add_argument(
        "--mode",
        choices=("check", "report"),
        default="check",
        help="check: compare with baseline, report: overwrite baseline with current measurements",
    )
    args = parser.parse_args()

    results = run_benchmarks()
    if args.mode == "report":
        _write_report(results)
        print(f"[perf] Baseline report written: {BASELINE_PATH}")
        return 0
    return _check_against_baseline(results)


if __name__ == "__main__":
    raise SystemExit(main())
