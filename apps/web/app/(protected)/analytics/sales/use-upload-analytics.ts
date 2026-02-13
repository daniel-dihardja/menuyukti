"use client";

import { useState } from "react";

interface UploadResponse {
  status: "ok";
  pos: string | null;
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

      setStatus("success");
      setMessage(`Uploaded: ${file.name}`);
      setPos(data.pos);

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
