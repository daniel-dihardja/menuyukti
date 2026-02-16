import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/export/csv";

describe("toCsv", () => {
  it("serializes ordered columns and escapes commas/quotes/newlines", () => {
    const csv = toCsv(
      [
        {
          a: "normal",
          b: "with,comma",
          c: 'say "hello"',
          d: "line1\nline2",
        },
      ],
      ["a", "b", "c", "d"],
    );

    expect(csv).toBe(
      'a,b,c,d\nnormal,"with,comma","say ""hello""","line1\nline2"',
    );
  });

  it("serializes dates, booleans, and nulls deterministically", () => {
    const csv = toCsv(
      [
        {
          at: new Date("2026-02-16T12:00:00.000Z"),
          ok: true,
          note: null,
        },
      ],
      ["at", "ok", "note"],
    );

    expect(csv).toBe("at,ok,note\n2026-02-16T12:00:00.000Z,true,");
  });
});
