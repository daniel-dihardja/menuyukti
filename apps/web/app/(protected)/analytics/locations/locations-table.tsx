"use client";

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
import { MoreHorizontal, Settings } from "lucide-react";
import Link from "next/link";

import { routes } from "@/lib/routes";

interface Branch {
  id: number;
  name: string;
}

interface LocationsTableProps {
  branches: Branch[];
  emptyLabel: string;
  indexLabel: string;
  branchNameLabel: string;
  actionLabel: string;
}

export function LocationsTable({
  branches,
  emptyLabel,
  indexLabel,
  branchNameLabel,
  actionLabel,
}: LocationsTableProps) {
  return (
    <div className="border w-full">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{indexLabel}</TableHead>
            <TableHead>{branchNameLabel}</TableHead>
            <TableHead className="w-[60px] text-right">{actionLabel}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {branches.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-center text-muted-foreground"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}

          {branches.map((branch, index) => (
            <TableRow key={branch.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{branch.name}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    {/* Fixed Costs */}
                    <DropdownMenuItem asChild>
                      <Link
                        href={routes.branches.fixedCosts(branch.id)}
                        className="flex items-center"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Fixed Costs
                      </Link>
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
