"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { BranchSelect } from "./branch-select";
import { SalesTable } from "./sales-table";
import UploadExcelClient from "./upload-xcel-client";

import { useUploadAnalytics } from "./use-upload-analytics";
import { useBranchAnalytics } from "./use-branch-analytics";
import { useDeleteAnalytics } from "./use-delete-analytics";
import { routes } from "@/lib/routes";
import { useAnalytics } from "../use-analytics";

type Branch = {
  id: number;
  name: string;
};

type Props = {
  branches: Branch[];
};

export function AnalyticsSalesClient({ branches }: Props) {
  const t = useTranslations("analytics.sales");
  const router = useRouter();

  // ✅ branchId now comes from AnalyticsProvider
  const { branchId, setBranchId } = useAnalytics();

  useEffect(() => {
    if (branchId !== null) return;
    if (branches.length !== 1) return;
    const [onlyBranch] = branches;
    if (!onlyBranch) return;
    setBranchId(onlyBranch.id);
  }, [branchId, branches, setBranchId]);

  // --------------------------------------------------
  // Analytics list
  // --------------------------------------------------
  const { analytics: uploads, loading, refetch } = useBranchAnalytics(branchId);

  // --------------------------------------------------
  // Upload logic
  // --------------------------------------------------
  const { uploading, status, message, pos, uploadFile } = useUploadAnalytics(
    branchId,
    refetch,
  );

  // --------------------------------------------------
  // Delete logic
  // --------------------------------------------------
  const { deleteAnalytics } = useDeleteAnalytics({
    branchId,
    onSuccess: refetch,
  });

  const hasUploads = uploads.length > 0;

  return (
    <>
      <div>
        <UploadExcelClient
          disabled={!branchId}
          uploading={uploading}
          status={status}
          message={message}
          pos={pos}
          onFileSelected={uploadFile}
        />
      </div>

      {/* ✅ No value / onChange anymore */}
      <BranchSelect
        branches={branches}
        id="sales-branch-select"
        label={t("branchLabel")}
        description={t("branchDescription")}
      />

      {!branchId ? (
        <div className="border rounded-md p-8 text-center text-muted-foreground">
          {t("selectBranch")}
        </div>
      ) : loading ? (
        <div className="border rounded-md p-8 text-center">{t("loading")}</div>
      ) : !hasUploads ? (
        <div className="border rounded-md p-8 text-center space-y-4">
          <h2 className="text-lg font-medium">{t("noAnalytics.title")}</h2>
          <p className="text-muted-foreground">
            {t("noAnalytics.description")}
          </p>
        </div>
      ) : (
        <SalesTable
          uploads={uploads}
          onDelete={deleteAnalytics}
          onCogs={(analyticsId) => {
            router.push(routes.analytics.cogs(String(analyticsId)));
          }}
        />
      )}
    </>
  );
}
