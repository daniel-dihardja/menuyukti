"use client";

import { useState } from "react";

interface UploadResponse {
  status: "accepted" | "duplicate" | "ok";
  pos?: string | null;
  jobId?: string;
  duplicate?: boolean;
}

interface JobStatusResponse {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  error_message: string | null;
  analytics_id: number | null;
}

export type UploadStatus = "idle" | "success" | "error";

export function useUploadAnalytics(
  locationId: number | null,
  onSuccess?: () => void,
) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pos, setPos] = useState<string | null>(null);

  async function pollJobUntilDone(jobId: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const res = await fetch(`/api/etl/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error("JOB_STATUS_LOOKUP_FAILED");
      }

      const job = (await res.json()) as JobStatusResponse;
      if (job.status === "failed") {
        throw new Error(job.error_message || "UPLOAD_JOB_FAILED");
      }
      if (job.status === "succeeded") {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error("UPLOAD_JOB_TIMEOUT");
  }

  async function uploadFile(file: File) {
    if (!locationId) {
      setStatus("error");
      setMessage("Please select a location first.");
      return;
    }

    if (!file.name.endsWith(".xlsx")) {
      setStatus("error");
      setMessage("Invalid file type. Please upload an .xlsx file.");
      return;
    }

    setUploading(true);
    setStatus("idle");
    setMessage(null);
    setPos(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("locationId", String(locationId));

      const res = await fetch("/api/analytics/create", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(errData?.error || "Upload failed");
      }

      const data = (await res.json()) as UploadResponse;

      if ((data.status === "accepted" || data.status === "duplicate") && data.jobId) {
        setMessage(`Upload accepted: ${file.name}. Processing...`);
        await pollJobUntilDone(data.jobId);
      }

      setStatus("success");
      setMessage(`Uploaded: ${file.name}`);
      setPos(data.pos ?? null);

      onSuccess?.();
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return {
    uploadFile,
    uploading,
    status,
    message,
    pos,
  };
}
