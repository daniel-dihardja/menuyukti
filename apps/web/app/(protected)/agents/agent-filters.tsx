"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useAnalytics } from "../analytics/use-analytics";
import { useBranchAnalytics } from "../analytics/sales/use-branch-analytics";
import { BranchSelect } from "../analytics/sales/branch-select";
import { useEffect } from "react";
import { Label } from "@workspace/ui/components/label";

type Branch = {
  id: number;
  name: string;
};

type Props = {
  branches: Branch[];
};

export function AgentFilters({ branches }: Props) {
  const { analyticsId, setAnalyticsId, branchId } = useAnalytics();
  const { analytics, loading } = useBranchAnalytics(branchId);

  useEffect(() => {
    if (!branchId) return;
    if (analyticsId !== null) return;
    const [first] = analytics;
    if (!first) return;
    setAnalyticsId(first.id);
  }, [analyticsId, analytics, branchId, setAnalyticsId]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <BranchSelect
        branches={branches}
        placeholder="Select branch"
        id="agent-branch-select"
        label="Branch"
      />

      <div className="max-w-xs space-y-2">
        <Label htmlFor="agent-analytics-select">Analytics report</Label>
        <Select
          value={analyticsId !== null ? String(analyticsId) : undefined}
          onValueChange={(val) => setAnalyticsId(val ? Number(val) : null)}
          disabled={!branchId || loading}
        >
          <SelectTrigger
            id="agent-analytics-select"
            aria-label="Analytics report"
          >
            <SelectValue
              placeholder={
                !branchId
                  ? "Select branch first"
                  : loading
                    ? "Loading reports…"
                    : "Select report"
              }
            />
          </SelectTrigger>

          <SelectContent>
            {analytics.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
