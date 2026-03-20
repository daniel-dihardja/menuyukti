from agent.graph import route_by_intent, route_campaign_requirements
from agent.state import State


def test_route_by_intent_accepts_create_location_profile() -> None:
    state = State(message="Create location profile", intent="create_location_profile")
    assert route_by_intent(state) == "create_location_profile"


def test_route_by_intent_unknown_fallback() -> None:
    state = State(message="Hello", intent="something_else")
    assert route_by_intent(state) == "unknown"


def test_route_campaign_requirements_run_when_requirements_met() -> None:
    state = State(message="Create campaign", campaign_requirements_met=True)
    assert route_campaign_requirements(state) == "run"


def test_route_campaign_requirements_blocked_when_missing_requirements() -> None:
    state = State(message="Create campaign", campaign_requirements_met=False)
    assert route_campaign_requirements(state) == "blocked"
