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
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { routes } from "@/lib/routes";

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
          {uploads.map((file, index) => (
            <TableRow key={file.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{file.name}</TableCell>
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
                        href={routes.analytics.matrix(
                          file.id as unknown as string
                        )}
                      >
                        {t("matrix")}
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onCogs(file.id)}>
                      {t("cogs")}
                    </DropdownMenuItem>

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
