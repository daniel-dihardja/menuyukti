import { describe, expect, it } from "vitest";
import { GET as getMatrixMetadata } from "@/app/api/analytics/[analyticsId]/matrix-metadata/route";
import { GET as getDaypartPerformance } from "@/app/api/marts/daypart-performance/route";
import { GET as getPairMetrics } from "@/app/api/marts/pair-metrics/route";

describe("contract route shape", () => {
  it("returns canonical contract on matrix metadata invalid id", async () => {
    const response = await getMatrixMetadata(new Request("http://localhost/api/analytics/abc/matrix-metadata"), {
      params: Promise.resolve({ analyticsId: "abc" }),
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_ANALYTICS_ID");
    expect(body.contract).toMatchObject({
      contractVersion: "v1",
      surface: "matrix",
      readiness: "blocked",
      confidence: "blocked",
    });
  });

  it("returns canonical contract on daypart invalid location", async () => {
    const response = await getDaypartPerformance(
      new Request("http://localhost/api/marts/daypart-performance?locationId=bad"),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_LOCATION_ID");
    expect(body.contract).toMatchObject({
      contractVersion: "v1",
      surface: "heatmap",
      readiness: "blocked",
      confidence: "blocked",
    });
  });

  it("returns canonical contract on pair metrics missing location", async () => {
    const response = await getPairMetrics(new Request("http://localhost/api/marts/pair-metrics"));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body.error).toBe("MISSING_LOCATION_ID");
    expect(body.contract).toMatchObject({
      contractVersion: "v1",
      surface: "pairs",
      readiness: "blocked",
      confidence: "blocked",
    });
  });
});
