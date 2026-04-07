"""Image AI flow queries — reference data seeded in init_db."""

from graphql.schema import schema


def test_image_ai_flows_returns_remove_background():
    result = schema.execute_sync(
        """
        query {
          imageAiFlows {
            slug
            displayName
            isActive
          }
        }
        """
    )
    assert result.errors is None
    data = result.data or {}
    flows = data.get("imageAiFlows") or []
    slugs = {f["slug"] for f in flows}
    assert "remove-background" in slugs
    rb = next(f for f in flows if f["slug"] == "remove-background")
    assert rb["isActive"] is True
    assert rb["displayName"]


def test_image_ai_flow_by_slug():
    result = schema.execute_sync(
        """
        query {
          rb: imageAiFlow(slug: "remove-background") {
            slug
            prompt
            model
            isActive
          }
          missing: imageAiFlow(slug: "does-not-exist") {
            slug
          }
        }
        """
    )
    assert result.errors is None
    data = result.data or {}
    rb = data.get("rb")
    assert rb is not None
    assert rb["slug"] == "remove-background"
    assert rb["prompt"]
    assert rb["model"]
    assert data.get("missing") is None
