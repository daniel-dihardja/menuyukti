import { describe, expect, it } from "vitest";

import { validatePostDraftGuardrails } from "@/lib/instagram/post-draft-guardrails";

describe("validatePostDraftGuardrails", () => {
  it("blocks invalid payloads", () => {
    const result = validatePostDraftGuardrails({
      caption: "",
      cta: "",
      hashtagsRaw: "",
    });

    expect(result.readiness).toBe("blocked");
    expect(result.issues.some((issue) => issue.code === "CAPTION_REQUIRED")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "CTA_REQUIRED")).toBe(true);
  });

  it("returns warning for hashtag quality issues", () => {
    const result = validatePostDraftGuardrails({
      caption: "Try our menu combo today",
      cta: "Visit us now",
      hashtagsRaw: "",
    });

    expect(result.readiness).toBe("warning");
    expect(result.issues[0]?.severity).toBe("warning");
  });

  it("returns ready for valid payload", () => {
    const result = validatePostDraftGuardrails({
      caption: "Try our menu combo today",
      cta: "Visit us now",
      hashtagsRaw: "#combo #restaurant",
    });

    expect(result.readiness).toBe("ready");
    expect(result.issues).toHaveLength(0);
  });
});
