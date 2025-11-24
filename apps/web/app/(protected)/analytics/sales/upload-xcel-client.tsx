"use client";

import { useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";

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

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessage(`✅ Uploaded: ${data.filename}`);
    } catch (err: any) {
      console.error(err);
      setMessage("❌ Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // reset input
    }
  }

  function handleButtonClick() {
    fileInputRef.current?.click(); // triggers the hidden file picker
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
            message.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
