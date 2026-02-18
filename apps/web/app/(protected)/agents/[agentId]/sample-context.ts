"use client";

type SetNumberOrNull = (value: number | null) => void;

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const SAMPLE_LOCATION_ID = toPositiveInt(process.env.NEXT_PUBLIC_AGENT_SAMPLE_LOCATION_ID, 1);
const SAMPLE_ANALYTICS_ID = toPositiveInt(process.env.NEXT_PUBLIC_AGENT_SAMPLE_ANALYTICS_ID, 1);

export function resolveSampleContext(current: {
  locationId: number | null;
  analyticsId: number | null;
}): { locationId: number; analyticsId: number } {
  return {
    locationId: current.locationId ?? SAMPLE_LOCATION_ID,
    analyticsId: current.analyticsId ?? SAMPLE_ANALYTICS_ID,
  };
}

export function applySampleContext(setters: {
  setLocationId: SetNumberOrNull;
  setAnalyticsId: SetNumberOrNull;
}): { locationId: number; analyticsId: number } {
  const sample = {
    locationId: SAMPLE_LOCATION_ID,
    analyticsId: SAMPLE_ANALYTICS_ID,
  };
  setters.setLocationId(sample.locationId);
  setters.setAnalyticsId(sample.analyticsId);
  return sample;
}

