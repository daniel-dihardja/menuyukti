import json
from pathlib import Path

from app.marketing_engine.core.inputs import CoreInputs
from app.marketing_engine.core.models.matrix_item import MatrixItem
from app.marketing_engine.core.models.heatmap import MenuHeatmap
from app.marketing_engine.core.models.matrix_distribution import MatrixDistribution
from app.marketing_engine.shared.primitives import build_shared_primitives


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "marketing_engine"


def _load_json(name: str):
    return json.loads((FIXTURES / name).read_text())


def test_build_shared_primitives():
    matrix_items = [MatrixItem(**i) for i in _load_json("matrix_items.json")]
    heatmaps = [MenuHeatmap(**h) for h in _load_json("heatmaps.json")]
    distribution = MatrixDistribution(**_load_json("distribution.json"))

    core = CoreInputs(
        matrix_items=matrix_items,
        heatmaps=heatmaps,
        distribution=distribution,
    )

    shared = build_shared_primitives(core)

    assert shared.structural is not None
    assert shared.economic_by_menu.get("Alpha") is not None
    assert shared.behavioral_by_menu.get("Alpha") is not None
