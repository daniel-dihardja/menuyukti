"use client";

import { useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { useTranslations } from "next-intl";

export type UploadStatus = "idle" | "success" | "error";

interface UploadExcelClientProps {
  disabled?: boolean;
  uploading?: boolean;

  status?: UploadStatus;
  message?: string | null;
  pos?: string | null;

  onFileSelected: (file: File) => void;
}

export default function UploadExcelClient({
  disabled = false,
  uploading = false,
  status = "idle",
  message = null,
  pos = null,
  onFileSelected,
}: UploadExcelClientProps) {
  const t = useTranslations("analytics.sales.upload");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputId = "analytics-upload-xlsx";

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
      <label htmlFor={fileInputId} className="sr-only">
        Upload analytics Excel file
      </label>
      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        type="button" // ✅ IMPORTANT FIX
        onClick={openFileDialog}
        disabled={disabled || uploading}
      >
        {uploading ? t("uploading") : t("cta")}
      </Button>

      {message && (
        <p
          role="status"
          aria-live={status === "error" ? "assertive" : "polite"}
          className={`text-sm ${
            status === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}

          {status === "success" && pos && (
            <>
              <br />
              <span className="text-muted-foreground">
                {t("detectedPos")} <strong>{pos.toUpperCase()}</strong>
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
