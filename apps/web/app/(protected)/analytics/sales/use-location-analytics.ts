"use client";

import { useCallback, useEffect, useState } from "react";
import type { SalesDropdownReadinessSignals } from "@/lib/analytics/sales-dropdown-readiness";

/** Shape expected by SalesTable (id, name, readinessSignals). */
export type AnalyticsListItem = {
  id: number;
  name: string;
  readinessSignals: SalesDropdownReadinessSignals;
};

/**
 * Analytics list is not yet provided by the GraphQL API; returns empty until
 * the service exposes an analytics-runs-by-location query.
 */
export function useLocationAnalytics(locationId: number | null) {
  const [analytics, setAnalytics] = useState<AnalyticsListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!locationId) {
      setAnalytics([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // No /api/analytics/list; GraphQL does not yet expose analytics list by location.
      setAnalytics([]);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    refetch: fetchAnalytics,
  };
}
