"use client";

import { useRef } from "react";
import { Button } from "@workspace/ui/components/button";

export type UploadStatus = "idle" | "success" | "error";

interface UploadExcelClientProps {
  label: string;

  disabled?: boolean;
  uploading?: boolean;

  status?: UploadStatus;
  message?: string | null;
  pos?: string | null;

  onFileSelected: (file: File) => void;
}

export default function UploadExcelClient({
  label,
  disabled = false,
  uploading = false,
  status = "idle",
  message = null,
  pos = null,
  onFileSelected,
}: UploadExcelClientProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function openFileDialog() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    onFileSelected(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

      <Button onClick={openFileDialog} disabled={disabled || uploading}>
        {uploading ? "Uploading..." : label}
      </Button>

      {message && (
        <p
          className={`text-sm ${
            status === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
          {status === "success" && pos && (
            <>
              <br />
              <span className="text-muted-foreground">
                Detected POS: <strong>{pos.toUpperCase()}</strong>
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
