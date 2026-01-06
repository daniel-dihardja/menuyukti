"use client";

import { useState } from "react";
import { BranchSelect } from "./branch-select";
import { SalesTable } from "./sales-table";
import UploadExcelClient, { UploadStatus } from "./upload-xcel-client";
import { useUploadAnalytics } from "./use-upload-analytics";

type Branch = {
  id: number;
  name: string;
};

type Upload = {
  id: number;
  name: string;
};

type Props = {
  branches: Branch[];
  uploads: Upload[];
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
      view: string;
    };
  };
};

export function AnalyticsSalesClient({ branches, uploads, labels }: Props) {
  const [branchId, setBranchId] = useState<number | null>(null);

  const { uploading, status, message, pos, uploadFile } = useUploadAnalytics(
    branchId,
    () => {
      // later: refetch uploads or router.refresh()
      console.log("Upload successful, refresh uploads list");
    }
  );

  const hasUploads = uploads.length > 0;

  return (
    <>
      <BranchSelect
        branches={branches}
        value={branchId}
        onChange={setBranchId}
      />

      {!hasUploads ? (
        /* -----------------------------------------
         * Empty state: no analytics uploads
         * ----------------------------------------- */
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
        /* -----------------------------------------
         * Normal state: analytics exist
         * ----------------------------------------- */
        <>
          <SalesTable uploads={uploads} labels={labels.table} />

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
