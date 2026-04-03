"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon, Loader2, Sparkles, Trash2, Upload } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";

type AssetItem = {
  name: string;
  url: string;
  size: number;
  createdAt: string;
};

type ToastState = { kind: "success" | "error"; message: string } | null;

/** Post-upload processing flow; sent with FormData as `flow`. */
type AssetFlow = "none" | "remove-background";

const SKELETON_COUNT = 8;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetsClient() {
  const t = useTranslations("assets");
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<AssetFlow>("none");

  const showToast = useCallback((kind: "success" | "error", message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch("/api/assets/list");
        if (!res.ok) throw new Error("list failed");
        const data = (await res.json()) as { items: AssetItem[] };
        setItems(data.items ?? []);
      } catch {
        setItems([]);
        showToast("error", t("toast.loadError"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [showToast, t],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      showToast("error", t("upload.invalidType"));
      return;
    }
    setUploading(true);
    try {
      const results = await Promise.allSettled(
        list.map(async (file) => {
          const fd = new FormData();
          fd.set("file", file);
          fd.set("flow", selectedFlow);
          const res = await fetch("/api/assets/upload", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as {
              message?: string;
              code?: string;
            };
            const e = new Error(err.message ?? "upload") as Error & { code?: string };
            if (err.code === "leonardo" || err.code === "leonardo_tokens") e.code = err.code;
            throw e;
          }
          return res.json() as Promise<AssetItem>;
        }),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      const leonardoOnly =
        fail > 0 &&
        ok === 0 &&
        results.every((r) => {
          if (r.status !== "rejected") return false;
          const reason = r.reason as Error & { code?: string };
          return reason?.code === "leonardo" || reason?.code === "leonardo_tokens";
        });
      const leonardoTokensOnly =
        leonardoOnly &&
        results.every((r) => {
          if (r.status !== "rejected") return false;
          const reason = r.reason as Error & { code?: string };
          return reason?.code === "leonardo_tokens";
        });
      if (ok > 0) {
        await load(true);
      }
      if (fail === 0) {
        showToast("success", t("toast.uploaded"));
      } else if (ok > 0) {
        showToast("error", t("toast.uploadPartial"));
      } else if (leonardoTokensOnly) {
        showToast("error", t("toast.leonardoInsufficientTokens"));
      } else if (leonardoOnly) {
        showToast("error", t("toast.leonardoError"));
      } else {
        showToast("error", t("toast.uploadError"));
      }
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) void uploadFiles(files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
  };

  const onDelete = async (name: string) => {
    if (!window.confirm(t("grid.deleteConfirm"))) return;
    setDeleting(name);
    try {
      const res = await fetch("/api/assets/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("delete");
      showToast("success", t("toast.deleted"));
      setItems((prev) => prev.filter((i) => i.name !== name));
    } catch {
      showToast("error", t("toast.deleteError"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="w-full space-y-8">
      {toast ? (
        <div
          role="status"
          className={cn(
            "fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300",
            toast.kind === "success"
              ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-50"
              : "border-red-500/30 bg-red-950/90 text-red-50",
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <section className="px-4 sm:px-6 lg:px-8">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={onInputChange}
        />
        <Card
          className={cn(
            "group relative overflow-hidden border-2 border-dashed transition-all duration-300",
            dragActive
              ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
              : "border-muted-foreground/25 bg-gradient-to-br from-muted/40 via-background to-muted/20 hover:border-primary/40 hover:shadow-md",
            uploading && "pointer-events-none opacity-80",
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget === e.target) setDragActive(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDrop={onDrop}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.06),_transparent_55%)] pointer-events-none" />
          <div className="relative flex flex-col items-center justify-center gap-4 px-6 py-14 text-center sm:py-16">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl border bg-background/80 shadow-sm transition-transform duration-300",
                dragActive ? "scale-110 border-primary/50 text-primary" : "text-muted-foreground",
              )}
            >
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              ) : (
                <Upload className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">{t("upload.title")}</h2>
              <p className="text-sm text-muted-foreground max-w-md">{t("upload.hint")}</p>
            </div>
            <div className="flex w-full max-w-sm flex-col items-stretch gap-2.5">
              <Label
                htmlFor="asset-upload-flow"
                className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90"
              >
                {t("upload.flow.label")}
              </Label>
              <Select
                value={selectedFlow}
                onValueChange={(v) => setSelectedFlow(v as AssetFlow)}
                disabled={uploading}
              >
                <SelectTrigger
                  id="asset-upload-flow"
                  size="default"
                  className={cn(
                    "h-11 w-full justify-between rounded-lg border-border/80 bg-background/90 px-4 shadow-sm transition-[box-shadow,border-color] duration-200",
                    "hover:border-primary/30 hover:bg-background",
                    "data-[state=open]:border-primary/40 data-[state=open]:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="center" position="popper" className="min-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="none">{t("upload.flow.none")}</SelectItem>
                  <SelectItem value="remove-background" className="cursor-pointer">
                    <span className="flex w-full items-center gap-2">
                      <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="flex-1">{t("upload.flow.removeBackground")}</span>
                      <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                        AI
                      </span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="lg"
              className="rounded-full px-8 shadow-sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("upload.uploading")}
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {t("upload.browse")}
                </>
              )}
            </Button>
          </div>
        </Card>
      </section>

      <section className="w-full px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="columns-2 gap-4 sm:columns-3 sm:gap-5 lg:columns-4 xl:columns-5 2xl:columns-6">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={i}
                className="mb-4 break-inside-avoid rounded-xl border border-border/60 bg-muted/40 sm:mb-5"
              >
                <div className="aspect-[4/3] animate-pulse rounded-t-xl bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-2 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed bg-muted/20 py-16 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{t("grid.empty.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("grid.empty.description")}</p>
            </div>
          </Card>
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 sm:gap-5 lg:columns-4 xl:columns-5 2xl:columns-6">
            {items.map((item) => (
              <figure
                key={item.name}
                className="group/tile mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md sm:mb-5"
              >
                <div className="relative bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */}
                  <img
                    src={item.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-auto object-cover transition duration-300 group-hover/tile:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-3 opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100">
                    <figcaption className="min-w-0 flex-1 truncate text-left text-xs font-medium text-white drop-shadow">
                      {item.name}
                    </figcaption>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 shrink-0 rounded-full bg-white/90 text-destructive shadow hover:bg-white"
                      disabled={deleting === item.name}
                      aria-label={t("grid.delete")}
                      onClick={() => void onDelete(item.name)}
                    >
                      {deleting === item.name ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
                  <span>{formatBytes(item.size)}</span>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
