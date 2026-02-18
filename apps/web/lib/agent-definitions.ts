export type AgentDefinition = {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  status: "ready" | "draft" | string;
  inputs: string[];
  outputs: string[];
};
