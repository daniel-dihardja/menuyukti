from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from pydantic import BaseModel, Field


ContractVersion = Literal["v1"]
AgentPersona = Literal["marketer", "analyst"]
WorkflowStage = Literal["planning", "execution", "analysis", "learning"]
ToolId = Literal[
    "decision_context.read",
    "scheduler.handoff",
    "analyst.export",
    "learning.feedback.write",
]


class ToolScope(BaseModel):
    location_id: int | None = None
    analytics_id: int | None = None


class ToolInvokeRequest(BaseModel):
    contract_version: ContractVersion = "v1"
    tool_id: ToolId
    persona: AgentPersona
    workflow_stage: WorkflowStage
    scope: ToolScope = Field(default_factory=ToolScope)
    payload: dict[str, Any] = Field(default_factory=dict)


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    reason_code: str


POLICY_MATRIX: dict[tuple[AgentPersona, WorkflowStage], set[ToolId]] = {
    ("marketer", "planning"): {"decision_context.read", "scheduler.handoff"},
    ("marketer", "execution"): {"scheduler.handoff"},
    ("analyst", "analysis"): {"decision_context.read", "analyst.export"},
    ("analyst", "learning"): {"learning.feedback.write"},
}


def evaluate_runtime_policy(request: ToolInvokeRequest) -> PolicyDecision:
    allowed_tools = POLICY_MATRIX.get((request.persona, request.workflow_stage), set())
    if request.tool_id not in allowed_tools:
        return PolicyDecision(
            allowed=False,
            reason_code="TOOL_NOT_ALLOWED_FOR_PERSONA_STAGE",
        )
    return PolicyDecision(allowed=True, reason_code="ALLOWED")


def validate_tool_payload(request: ToolInvokeRequest) -> PolicyDecision:
    if request.tool_id == "decision_context.read":
        if request.scope.analytics_id is None:
            return PolicyDecision(
                allowed=False,
                reason_code="TOOL_CONTRACT_VALIDATION_FAILED_ANALYTICS_ID_REQUIRED",
            )
        return PolicyDecision(allowed=True, reason_code="VALID")

    if request.tool_id == "scheduler.handoff":
        recommendations = request.payload.get("recommendations")
        if not isinstance(recommendations, list) or len(recommendations) == 0:
            return PolicyDecision(
                allowed=False,
                reason_code="TOOL_CONTRACT_VALIDATION_FAILED_RECOMMENDATIONS_REQUIRED",
            )
        return PolicyDecision(allowed=True, reason_code="VALID")

    if request.tool_id == "analyst.export":
        dataset = request.payload.get("dataset")
        if dataset not in {"matrix", "pairs", "combos", "attribution"}:
            return PolicyDecision(
                allowed=False,
                reason_code="TOOL_CONTRACT_VALIDATION_FAILED_DATASET_INVALID",
            )
        return PolicyDecision(allowed=True, reason_code="VALID")

    if request.tool_id == "learning.feedback.write":
        recommendation_id = request.payload.get("recommendation_id")
        outcome_label = request.payload.get("outcome_label")
        if not isinstance(recommendation_id, str) or recommendation_id.strip() == "":
            return PolicyDecision(
                allowed=False,
                reason_code="TOOL_CONTRACT_VALIDATION_FAILED_RECOMMENDATION_ID_REQUIRED",
            )
        if not isinstance(outcome_label, str) or outcome_label.strip() == "":
            return PolicyDecision(
                allowed=False,
                reason_code="TOOL_CONTRACT_VALIDATION_FAILED_OUTCOME_LABEL_REQUIRED",
            )
        return PolicyDecision(allowed=True, reason_code="VALID")

    return PolicyDecision(allowed=False, reason_code="TOOL_CONTRACT_VALIDATION_FAILED_UNKNOWN_TOOL")
