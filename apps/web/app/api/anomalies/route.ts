import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationIdParam = searchParams.get("locationId");
  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");

  const where: {
    locationId?: number;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (locationIdParam) {
    const locationId = Number(locationIdParam);
    if (!Number.isInteger(locationId)) {
      return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
    }
    where.locationId = locationId;
  }

  if (dateFromParam || dateToParam) {
    where.createdAt = {};
    if (dateFromParam) {
      const dt = new Date(dateFromParam);
      if (!Number.isNaN(dt.getTime())) where.createdAt.gte = dt;
    }
    if (dateToParam) {
      const dt = new Date(dateToParam);
      if (!Number.isNaN(dt.getTime())) where.createdAt.lte = dt;
    }
  }

  const events = await prisma.anomalyEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      locationId: true,
      analyticsId: true,
      pipelineRunId: true,
      anomalyType: true,
      metricName: true,
      previousValue: true,
      currentValue: true,
      deltaValue: true,
      severity: true,
      metadata: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    items: events.map((event) => ({
      id: event.id,
      location_id: event.locationId,
      analytics_id: event.analyticsId,
      pipeline_run_id: event.pipelineRunId,
      anomaly_type: event.anomalyType,
      metric_name: event.metricName,
      previous_value: event.previousValue !== null ? Number(event.previousValue) : null,
      current_value: event.currentValue !== null ? Number(event.currentValue) : null,
      delta_value: event.deltaValue !== null ? Number(event.deltaValue) : null,
      severity: event.severity,
      metadata: event.metadata,
      created_at: event.createdAt.toISOString(),
    })),
  });
}
