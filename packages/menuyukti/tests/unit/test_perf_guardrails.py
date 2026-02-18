from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys


def _load_perf_module():
    script_path = Path(__file__).resolve().parents[2] / "scripts" / "perf_guardrails.py"
    spec = spec_from_file_location("perf_guardrails", script_path)
    assert spec is not None and spec.loader is not None
    module = module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_evaluate_regression_detects_breach():
    module = _load_perf_module()
    assert module.evaluate_regression(
        baseline_ms=100.0,
        measured_ms=401.0,
        max_ratio=4.0,
    )


def test_evaluate_regression_allows_within_ratio():
    module = _load_perf_module()
    assert not module.evaluate_regression(
        baseline_ms=100.0,
        measured_ms=399.9,
        max_ratio=4.0,
    )
