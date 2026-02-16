from marketing_engine.core.contracts.metadata import build_metadata_v1


def test_build_metadata_v1_defaults():
    metadata = build_metadata_v1(source_system="esb")
    assert metadata["schema_version"] == "v1"
    assert metadata["source_system"] == "esb"
    assert metadata["quality_status"] == "passed"
    assert metadata["ingested_at_utc"].endswith("Z")
    assert metadata["pipeline_run_id"]
