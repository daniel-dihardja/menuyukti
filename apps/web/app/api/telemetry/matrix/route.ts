import { NextResponse } from "next/server";
import { z } from "zod";

const payloadSchema = z.object({
  schema_version: z.number().int().min(1),
  event_name: z.enum([
    "matrix_preset_used",
    "matrix_filter_changed",
    "matrix_reset_clicked",
    "matrix_action_reason_opened",
  ]),
  analytics_id: z.number().int().positive(),
  ts_ms: z.number().int().positive(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid telemetry payload" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid telemetry schema" }, { status: 400 });
  }

  // Keep payload log-friendly and privacy-safe; no raw menu text is emitted.
  console.info("[telemetry.matrix]", JSON.stringify(parsed.data));

  return new NextResponse(null, { status: 204 });
}
