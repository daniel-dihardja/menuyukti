from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


def build_metadata_v1(
    source_system: str,
    quality_status: str = "passed",
    pipeline_run_id: str | None = None,
) -> dict[str, str]:
    return {
        "schema_version": "v1",
        "source_system": source_system,
        "pipeline_run_id": pipeline_run_id or str(uuid4()),
        "ingested_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "quality_status": quality_status,
    }
