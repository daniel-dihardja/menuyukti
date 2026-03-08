"""Agent tools that use ambient authority via RunnableConfig.

IDs (location_id, analytics_id) are injected by the server into
RunnableConfig.configurable — they are never passed as tool parameters
and therefore never visible to or controllable by the LLM.
"""

import os

import httpx
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

_LOCATION_QUERY = """
query Location($id: ID!) {
  location(id: $id) {
    id
    name
    street
    city
    country
  }
}
"""


@tool
def get_location(config: RunnableConfig) -> dict:
    """Fetches the current restaurant location's name and address."""
    location_id = (config.get("configurable") or {}).get("location_id")
    if location_id is None:
        return {}
    endpoint = os.environ["GRAPHQL_ENDPOINT"]
    res = httpx.post(
        endpoint,
        json={"query": _LOCATION_QUERY, "variables": {"id": str(location_id)}},
        timeout=10,
    )
    res.raise_for_status()
    return res.json().get("data", {}).get("location") or {}
