import type { AgentDefinition } from "@/lib/agent-definitions";

export function validateAgentContract(agent: AgentDefinition): string[] {
  const issues: string[] = [];
  const contract = agent.contract;

  if (contract.inputContractVersion !== "v1") {
    issues.push("input_contract_version_mismatch");
  }
  if (contract.outputContractVersion !== "v1") {
    issues.push("output_contract_version_mismatch");
  }
  if (contract.promptContractVersion.trim().length === 0) {
    issues.push("prompt_contract_version_missing");
  }
  if (contract.modelContractVersion.trim().length === 0) {
    issues.push("model_contract_version_missing");
  }
  if (contract.requiredTrustFields.length === 0) {
    issues.push("required_trust_fields_missing");
  }
  if (contract.inputValueConstraints.length === 0) {
    issues.push("input_value_constraints_missing");
  }

  return issues;
}

