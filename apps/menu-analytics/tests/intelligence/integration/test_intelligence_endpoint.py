import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "intelligence"


def _load_json(name: str):
    return json.loads((FIXTURES / name).read_text())


def test_intelligence_pipeline_endpoint():
    client = TestClient(app)

    payload = {
        "matrix_items": _load_json("matrix_items.json"),
        "heatmaps": _load_json("heatmaps.json"),
        "distribution": _load_json("distribution.json"),
    }

    response = client.post("/intelligence/pipeline", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert "insights" in data
    assert "portfolio" in data["insights"]
    assert "candidates" in data["insights"]
    assert "schedule" in data["insights"]
    assert isinstance(data["insights"]["candidates"], list)
