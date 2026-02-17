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
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Check, Loader2, Pencil, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { routes } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import {
  evaluateSalesDropdownReadiness,
  SALES_DROPDOWN_ACTION_ORDER,
  type SalesActionReadiness,
  type SalesActionReadinessStatus,
  type SalesDropdownAction,
  type SalesDropdownReadinessSignals,
} from "@/lib/analytics/sales-dropdown-readiness";

interface Upload {
  id: number;
  name: string;
  readinessSignals: SalesDropdownReadinessSignals;
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

  const statusBadgeVariant = (
    status: SalesActionReadinessStatus,
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "ready") return "default";
    if (status === "degraded") return "secondary";
    if (status === "blocked") return "destructive";
    return "outline";
  };

  const isActionDisabled = (status: SalesActionReadinessStatus): boolean =>
    status === "needs_cogs" ||
    status === "needs_attribution_data" ||
    status === "blocked";

  const readinessLabel = (status: SalesActionReadinessStatus): string =>
    t(`readiness.badges.${status}`);

  const actionLabel = (action: SalesDropdownAction): string => {
    if (action === "cogs") return t("cogs");
    if (action === "matrix") return t("matrix");
    if (action === "heatmap") return t("heatmap");
    if (action === "pairs") return t("pairs");
    if (action === "scheduler") return t("scheduler");
    if (action === "attribution") return t("attribution");
    return t("finance");
  };

  const actionHref = (
    action: Exclude<SalesDropdownAction, "cogs">,
    analyticsId: number,
  ): string => {
    if (action === "matrix") return routes.analytics.matrix(analyticsId);
    if (action === "heatmap") return routes.analytics.heatmap(analyticsId);
    if (action === "pairs") return routes.analytics.pairs(analyticsId);
    if (action === "scheduler") return routes.analytics.scheduler(analyticsId);
    if (action === "attribution") return routes.analytics.attribution(analyticsId);
    return routes.analytics.finance(analyticsId);
  };

  const renderActionText = (
    action: SalesDropdownAction,
    readiness: SalesActionReadiness,
  ) => (
    <div className="flex w-full items-center justify-between gap-3">
      <span>{actionLabel(action)}</span>
      <Badge variant={statusBadgeVariant(readiness.status)} className="h-5 px-1.5 text-[10px] uppercase">
        {readinessLabel(readiness.status)}
      </Badge>
    </div>
  );

  return (
    <div className="border w-full">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{t("index")}</TableHead>
            <TableHead>{t("fileName")}</TableHead>
            <TableHead className="text-right w-[80px]">{t("action")}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((file, index) => {
            const readinessByAction = evaluateSalesDropdownReadiness(
              file.readinessSignals,
            );

            return (
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
                    {SALES_DROPDOWN_ACTION_ORDER.map((action) => {
                      const readiness = readinessByAction[action];
                      const disabled = isActionDisabled(readiness.status);
                      const body = renderActionText(action, readiness);
                      const content = readiness.reasonMessage ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full">{body}</div>
                          </TooltipTrigger>
                          <TooltipContent side="left" sideOffset={8} className="max-w-xs">
                            {readiness.reasonMessage}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        body
                      );

                      if (action === "cogs") {
                        return (
                          <DropdownMenuItem
                            key={action}
                            onClick={() => onCogs(file.id)}
                            onSelect={(event) => {
                              if (disabled) event.preventDefault();
                            }}
                            aria-disabled={disabled}
                            className={disabled ? "opacity-60" : undefined}
                          >
                            {content}
                          </DropdownMenuItem>
                        );
                      }

                      if (disabled) {
                        return (
                          <DropdownMenuItem
                            key={action}
                            onSelect={(event) => event.preventDefault()}
                            aria-disabled
                            className="opacity-60"
                          >
                            {content}
                          </DropdownMenuItem>
                        );
                      }

                      return (
                        <DropdownMenuItem key={action} asChild>
                          <Link
                            href={actionHref(
                              action as Exclude<SalesDropdownAction, "cogs">,
                              file.id,
                            )}
                          >
                            {content}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}

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
          );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
