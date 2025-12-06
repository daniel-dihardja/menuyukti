"use client";

import { useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import type { POSConfig } from "@/lib/pos";

interface ExcelRow {
  [key: string]: unknown;
}

interface UploadResponse {
  pos: string;
  config: POSConfig;
  rows: ExcelRow[];
}

export default function UploadExcelClient({ label }: { label: string }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
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

      console.log("POS:", data.pos);
      console.log("POS Config:", data.config);
      console.log("Parsed Excel Rows:", data.rows);

      setMessage(`Uploaded: ${file.name}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Upload error:", err.message);
      } else {
        console.error("Unknown upload error:", err);
      }
      setMessage("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button onClick={handleButtonClick} disabled={uploading}>
        {uploading ? "Uploading..." : label}
      </Button>

      {message && (
        <p
          className={`text-sm ${
            message.startsWith("Uploaded") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
