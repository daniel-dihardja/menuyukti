"use client";

import { useState } from "react";
import { BranchSelect } from "./branch-select";
import { SalesTable } from "./sales-table";
import UploadExcelClient, { UploadStatus } from "./upload-xcel-client";
import { useUploadAnalytics } from "./use-upload-analytics";
import { useBranchAnalytics } from "./use-branch-analytics";
import { useDeleteAnalytics } from "./use-delete-analytics";

type Branch = {
  id: number;
  name: string;
};

type Props = {
  branches: Branch[];
  labels: {
    create: string;
    noAnalytics: {
      title: string;
      description: string;
    };
    table: {
      index: string;
      fileName: string;
      action: string;
      delete: string;
    };
  };
};

export function AnalyticsSalesClient({ branches, labels }: Props) {
  const [branchId, setBranchId] = useState<number | null>(null);

  // --------------------------------------------------
  // Analytics list (branch-scoped)
  // --------------------------------------------------
  const { analytics: uploads, loading, refetch } = useBranchAnalytics(branchId);

  // --------------------------------------------------
  // Upload logic
  // --------------------------------------------------
  const { uploading, status, message, pos, uploadFile } = useUploadAnalytics(
    branchId,
    refetch
  );

  // --------------------------------------------------
  // Delete logic (extracted)
  // --------------------------------------------------
  const { deleteAnalytics } = useDeleteAnalytics({
    branchId,
    onSuccess: refetch,
  });

  const hasUploads = uploads.length > 0;

  return (
    <>
      <BranchSelect
        branches={branches}
        value={branchId}
        onChange={setBranchId}
      />

      {!branchId ? (
        <div className="border rounded-md p-8 text-center text-muted-foreground">
          Please select a branch to view analytics.
        </div>
      ) : loading ? (
        <div className="border rounded-md p-8 text-center">
          Loading analytics…
        </div>
      ) : !hasUploads ? (
        <div className="border rounded-md p-8 text-center space-y-4">
          <h2 className="text-lg font-medium">{labels.noAnalytics.title}</h2>
          <p className="text-muted-foreground">
            {labels.noAnalytics.description}
          </p>

          <UploadExcelClient
            label={labels.create}
            disabled={!branchId}
            uploading={uploading}
            status={status as UploadStatus}
            message={message}
            pos={pos}
            onFileSelected={uploadFile}
          />
        </div>
      ) : (
        <>
          <SalesTable
            uploads={uploads}
            labels={labels.table}
            onDelete={deleteAnalytics}
          />

          <div className="flex justify-center">
            <UploadExcelClient
              label={labels.create}
              disabled={!branchId}
              uploading={uploading}
              status={status as UploadStatus}
              message={message}
              pos={pos}
              onFileSelected={uploadFile}
            />
          </div>
        </>
      )}
    </>
  );
}
