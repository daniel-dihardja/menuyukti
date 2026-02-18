export type AgentDefinition = {
  schemaVersion: "v1";
  id: string;
  name: string;
  imageUrl: string;
  purpose: string;
  description: string;
  status: "ready" | "draft" | string;
  persona: "marketer" | "analyst" | "shared" | "ops";
  trustScope:
    | "campaign_planning"
    | "menu_decisioning"
    | "consensus_risk"
    | "scenario_forecasting"
    | "memory_continuity"
    | "learning_reranking"
    | "release_safety";
  contract: {
    inputContractVersion: "v1";
    outputContractVersion: "v1";
    promptContractVersion: string;
    modelContractVersion: string;
    requiredTrustFields: Array<"confidence" | "readiness" | "evidence" | "lineage">;
    inputValueConstraints: string[];
  };
  inputs: string[];
  outputs: string[];
};
