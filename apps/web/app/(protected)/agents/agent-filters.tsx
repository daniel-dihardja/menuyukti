"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useAnalytics } from "../analytics/use-analytics";
import { useLocationAnalytics } from "../analytics/sales/use-location-analytics";
import { LocationSelect } from "../analytics/sales/location-select";
import { useEffect } from "react";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { useTranslations } from "next-intl";

type Branch = {
  id: number;
  name: string;
};

type Props = {
  branches: Branch[];
};

export function AgentFilters({ branches }: Props) {
  const t = useTranslations("agents.detail.filters");
  const { analyticsId, setAnalyticsId, locationId } = useAnalytics();
  const { analytics, loading } = useLocationAnalytics(locationId);

  useEffect(() => {
    if (!locationId) return;
    if (analyticsId !== null) return;
    const [first] = analytics;
    if (!first) return;
    setAnalyticsId(first.id);
  }, [analyticsId, analytics, locationId, setAnalyticsId]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <LocationSelect
        branches={branches}
        placeholder={t("branch.placeholder")}
        id="agent-location-select"
        label={t("branch.label")}
      />

      <Field className="max-w-xs space-y-2">
        <FieldLabel htmlFor="agent-analytics-select">
          {t("report.label")}
        </FieldLabel>
        <Select
          value={analyticsId !== null ? String(analyticsId) : undefined}
          onValueChange={(val) => setAnalyticsId(val ? Number(val) : null)}
          disabled={!locationId || loading}
        >
          <SelectTrigger
            id="agent-analytics-select"
            aria-label={t("report.label")}
          >
            <SelectValue
              placeholder={
                !locationId
                  ? t("report.placeholder.selectBranchFirst")
                  : loading
                    ? t("report.placeholder.loading")
                    : t("report.placeholder.select")
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
      </Field>
    </div>
  );
}
