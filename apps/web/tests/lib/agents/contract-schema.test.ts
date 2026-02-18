import agents from "@/lib/agents.json";
import type { AgentDefinition } from "@/lib/agent-definitions";
import { validateAgentContract } from "@/lib/agents/contract-schema";
import { describe, expect, it } from "vitest";

describe("agent contract schema", () => {
  it("keeps contract metadata compatible with Agent Studio panels", () => {
    const definitions = agents as AgentDefinition[];
    expect(definitions.length).toBeGreaterThan(0);

    for (const agent of definitions) {
      expect(agent.schemaVersion).toBe("v1");
      const issues = validateAgentContract(agent);
      expect(issues).toEqual([]);
    }
  });
});

