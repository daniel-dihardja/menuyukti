"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Check, Loader2, Pencil, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { routes } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";

interface Upload {
  id: number;
  name: string;
}

interface SalesTableProps {
  uploads: Upload[];
  onDelete: (analyticsId: number) => void;
  onCogs: (analyticsId: number) => void;
}

export function SalesTable({ uploads, onDelete, onCogs }: SalesTableProps) {
  const t = useTranslations("analytics.sales.table");
  const [rows, setRows] = useState<Upload[]>(uploads);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setRows(uploads);
  }, [uploads]);

  const startEdit = (file: Upload) => {
    setEditingId(file.id);
    setDraftName(file.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
  };

  const saveName = async (file: Upload) => {
    const nextName = draftName.trim();
    if (!nextName) return;

    setSavingId(file.id);
    try {
      const res = await fetch(`/api/analytics/${file.id}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });

      if (!res.ok) {
        throw new Error("Failed to rename analytics");
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === file.id ? { ...row, name: nextName } : row,
        ),
      );
      cancelEdit();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="border w-full rounded-md">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{t("index")}</TableHead>
            <TableHead>{t("fileName")}</TableHead>
            <TableHead className="text-right w-[80px]">{t("action")}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((file, index) => (
            <TableRow key={file.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {editingId === file.id ? (
                    <Input
                      aria-label={`Analytics name for ${file.name}`}
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void saveName(file);
                        }
                        if (event.key === "Escape") {
                          cancelEdit();
                        }
                      }}
                      onBlur={(event) => {
                        if (event.relatedTarget === saveButtonRef.current) {
                          return;
                        }
                        cancelEdit();
                      }}
                      className="h-8 max-w-xs"
                      disabled={savingId === file.id}
                      autoFocus
                    />
                  ) : (
                    <span>{file.name}</span>
                  )}

                  {editingId === file.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void saveName(file)}
                      disabled={savingId === file.id}
                      aria-label="Save analytics name"
                      ref={saveButtonRef}
                    >
                      {savingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(file)}
                      aria-label="Edit analytics name"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    {/* Matrix */}
                    <DropdownMenuItem asChild>
                      <Link
                        href={routes.analytics.matrix(
                          file.id as unknown as string,
                        )}
                      >
                        {t("matrix")}
                      </Link>
                    </DropdownMenuItem>

                    {/* Heatmap */}
                    <DropdownMenuItem asChild>
                      <Link
                        href={routes.analytics.heatmap(
                          file.id as unknown as string,
                        )}
                      >
                        {t("heatmap")}
                      </Link>
                    </DropdownMenuItem>

                    {/* Finance */}
                    <DropdownMenuItem asChild>
                      <Link
                        href={routes.analytics.finance(
                          file.id as unknown as string,
                        )}
                      >
                        {t("finance")}
                      </Link>
                    </DropdownMenuItem>

                    {/* COGS */}
                    <DropdownMenuItem onClick={() => onCogs(file.id)}>
                      {t("cogs")}
                    </DropdownMenuItem>

                    {/* Delete */}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(file.id)}
                    >
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
