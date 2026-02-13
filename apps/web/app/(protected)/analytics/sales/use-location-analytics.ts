"use client";

import { AnalyticsListItem } from "@/app/api/analytics/types";
import { useCallback, useEffect, useState } from "react";

export function useLocationAnalytics(branchId: number | null) {
  const [analytics, setAnalytics] = useState<AnalyticsListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!branchId) {
      setAnalytics([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/list?branchId=${branchId}`);

      if (!res.ok) {
        throw new Error("Failed to load analytics");
      }

      const data = (await res.json()) as AnalyticsListItem[];
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  // Auto-fetch when branch changes
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    refetch: fetchAnalytics,
  };
}
