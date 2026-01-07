"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type AnalyticsContextValue = {
  branchId: number | null;
  setBranchId: (branchId: number | null) => void;
};

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(
  null
);

type AnalyticsProviderProps = {
  children: ReactNode;
  initialBranchId?: number | null;
};

export function AnalyticsProvider({
  children,
  initialBranchId = null,
}: AnalyticsProviderProps) {
  const [branchId, setBranchId] = useState<number | null>(initialBranchId);

  return (
    <AnalyticsContext.Provider value={{ branchId, setBranchId }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
