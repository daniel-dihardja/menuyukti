"use client";

import { createContext, useEffect, useState, ReactNode } from "react";

type AnalyticsContextValue = {
  locationId: number | null;
  setLocationId: (locationId: number | null) => void;
  analyticsId: number | null;
  setAnalyticsId: (analyticsId: number | null) => void;
};

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(
  null,
);

type AnalyticsProviderProps = {
  children: ReactNode;
  initialLocationId?: number | null;
  initialAnalyticsId?: number | null;
};

export function AnalyticsProvider({
  children,
  initialLocationId = null,
  initialAnalyticsId = null,
}: AnalyticsProviderProps) {
  const [locationId, setLocationId] = useState<number | null>(initialLocationId);
  const [analyticsId, setAnalyticsId] = useState<number | null>(
    initialAnalyticsId,
  );

  useEffect(() => {
    setAnalyticsId(null);
  }, [locationId]);

  return (
    <AnalyticsContext.Provider
      value={{ locationId, setLocationId, analyticsId, setAnalyticsId }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}
