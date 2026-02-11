"use client";

import { createContext, useEffect, useState, ReactNode } from "react";

type AnalyticsContextValue = {
  branchId: number | null;
  setBranchId: (branchId: number | null) => void;
  analyticsId: number | null;
  setAnalyticsId: (analyticsId: number | null) => void;
};

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(
  null,
);

type AnalyticsProviderProps = {
  children: ReactNode;
  initialBranchId?: number | null;
  initialAnalyticsId?: number | null;
};

export function AnalyticsProvider({
  children,
  initialBranchId = null,
  initialAnalyticsId = null,
}: AnalyticsProviderProps) {
  const [branchId, setBranchId] = useState<number | null>(initialBranchId);
  const [analyticsId, setAnalyticsId] = useState<number | null>(
    initialAnalyticsId,
  );

  useEffect(() => {
    setAnalyticsId(null);
  }, [branchId]);

  return (
    <AnalyticsContext.Provider
      value={{ branchId, setBranchId, analyticsId, setAnalyticsId }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}
