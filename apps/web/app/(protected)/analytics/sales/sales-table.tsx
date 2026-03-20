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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Coins, Flame, MoreHorizontal, Sparkles, Table2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { routes } from "@/lib/routes";

interface SalesTableProps {
  uploads: Array<{ id: number; name: string }>;
  onDelete: (analyticsId: number) => void;
  onCogs: (analyticsId: number) => void;
}

export function SalesTable({ uploads, onDelete, onCogs }: SalesTableProps) {
  const t = useTranslations("analytics.sales.table");

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
          {uploads.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <span>{row.name}</span>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={routes.campaigns.createWithAnalytics(row.id)}
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        {t("askAi")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onCogs(row.id)}
                      className="flex items-center gap-2"
                    >
                      <Coins className="h-4 w-4" />
                      {t("cogs")}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={routes.analytics.matrix(row.id)}
                        className="flex items-center gap-2"
                      >
                        <Table2 className="h-4 w-4" />
                        {t("matrix")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={routes.analytics.heatmap(row.id)}
                        className="flex items-center gap-2"
                      >
                        <Flame className="h-4 w-4" />
                        {t("heatmap")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center gap-2 text-destructive focus:text-destructive"
                      onClick={() => onDelete(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
