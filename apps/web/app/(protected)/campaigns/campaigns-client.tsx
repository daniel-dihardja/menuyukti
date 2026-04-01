"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAnalytics } from "../analytics/use-analytics";
import { LocationSelect } from "../analytics/sales/location-select";
import { CampaignsTable } from "./campaigns-table";
import { Button } from "@workspace/ui/components/button";
import { routes } from "@/lib/routes";

type Branch = {
  id: number;
  name: string;
};

export type CampaignItem = {
  id: number;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  goal: string | null;
};

type Props = {
  branches: Branch[];
};

function useCampaigns(locationId: number | null) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    if (!locationId) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/list?locationId=${locationId}`);
      const body = await res.json();
      if (!res.ok) {
        throw new Error((body?.error as string) || "Failed to load campaigns");
      }
      setCampaigns(body as CampaignItem[]);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return { campaigns, loading, refetch: fetchCampaigns };
}

export function CampaignsClient({ branches }: Props) {
  const t = useTranslations("analytics.campaigns");
  const { locationId, setLocationId } = useAnalytics();
  const router = useRouter();

  useEffect(() => {
    if (locationId !== null) return;
    if (branches.length !== 1) return;
    const [onlyBranch] = branches;
    if (!onlyBranch) return;
    setLocationId(onlyBranch.id);
  }, [locationId, branches, setLocationId]);

  const { campaigns, loading, refetch } = useCampaigns(locationId);

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCampaign = useCallback(async () => {
    if (!locationId) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      const body = (await res.json()) as { id?: number; error?: string };
      if (!res.ok) {
        throw new Error(body?.error || "Failed to create campaign");
      }
      if (body.id == null || !Number.isFinite(Number(body.id))) {
        throw new Error("Invalid response from server");
      }
      router.push(routes.campaigns.detail(body.id));
    } catch (err) {
      console.error("Failed to create campaign:", err);
      alert(
        err instanceof Error ? err.message : "Failed to create campaign."
      );
    } finally {
      setIsCreating(false);
    }
  }, [locationId, router]);

  const handleDelete = useCallback(
    async (id: number) => {
      const confirmed = confirm("Are you sure you want to delete this campaign?");
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/campaigns/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error("Delete failed");
        refetch();
      } catch (err) {
        console.error("Failed to delete campaign:", err);
        alert("Failed to delete campaign.");
      }
    },
    [refetch]
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end gap-3">
        <LocationSelect
          branches={branches}
          id="campaigns-location-select"
          label={t("branchLabel")}
          placeholder={branches.length > 1 ? t("branchPlaceholder") : undefined}
          className="w-full max-w-none sm:max-w-xs"
        />
        <Button
          onClick={() => {
            void handleCreateCampaign();
          }}
          disabled={!locationId || isCreating}
        >
          {isCreating ? t("loading") : t("create")}
        </Button>
      </section>

      {!locationId ? (
        <div className="border rounded-md p-8 text-left text-muted-foreground">
          {t("selectBranch")}
        </div>
      ) : loading ? (
        <div className="border rounded-md p-8 text-left">{t("loading")}</div>
      ) : (
        <CampaignsTable
          campaigns={campaigns}
          onDelete={handleDelete}
          onCreateCampaign={handleCreateCampaign}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}
