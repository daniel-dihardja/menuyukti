import { describe, expect, it } from "vitest";

import { generateDeterministicPostCopy } from "@/lib/instagram/post-copy-generator";

describe("generateDeterministicPostCopy", () => {
  it("returns stable variants, cta, and hashtags", () => {
    const input = {
      menuItem: "Iced Tea",
      daypart: "afternoon" as const,
      offerType: "combo_offer" as const,
    };

    const first = generateDeterministicPostCopy(input);
    const second = generateDeterministicPostCopy(input);

    expect(first).toEqual(second);
    expect(first.captionVariants).toHaveLength(2);
    expect(first.cta.length).toBeGreaterThan(0);
    expect(first.hashtags.length).toBeGreaterThanOrEqual(3);
  });

  it("uses fallback menu label when menu item is blank", () => {
    const copy = generateDeterministicPostCopy({
      menuItem: "   ",
      daypart: "lunch",
      offerType: "hero_item",
    });

    expect(copy.captionVariants[0]).toContain("Today's special");
  });
});
