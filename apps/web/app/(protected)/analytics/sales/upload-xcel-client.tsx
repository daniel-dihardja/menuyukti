"use client";

import { useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";

interface UploadResponse {
  status: "ok";
  pos: string | null;
}

interface UploadExcelClientProps {
  label: string;
  onSuccess?: () => void;
}

export default function UploadExcelClient({
  label,
  onSuccess,
}: UploadExcelClientProps) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pos, setPos] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // basic client-side guard
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
      console.log("Upload response:", data);
      setStatus("success");
      setMessage(`Uploaded: ${file.name}`);
      setPos(data.pos);

      onSuccess?.();
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
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
